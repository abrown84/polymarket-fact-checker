"use node";

/**
 * Chat via One Gateway's OpenAI-compatible protocol.
 *
 * one-gateway (https://github.com/abrown84/one-gateway) is an OpenAI-compatible
 * client for an OpenClaw-style gateway. The published npm package currently
 * ships without a usable `dist`, so this module mirrors its client:
 *   POST {ONE_GATEWAY_URL}/v1/chat/completions
 *   Authorization: Bearer {ONE_GATEWAY_TOKEN}
 *   x-openclaw-agent-id: {ONE_GATEWAY_AGENT}
 *
 * Embeddings are not supported by one-gateway — see gemini.ts for embeddings.
 */

export const DEFAULT_CHAT_MODEL = "gemini-3.8-flash";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OneGatewayConfig = {
  baseUrl: string;
  token: string;
  primaryModel: string;
  fallbackModels: string[];
  agentId: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
};

function parseFallbacks(v = ""): string[] {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Resolve One Gateway config from env.
 * Prefers ONE_GATEWAY_* ; falls back to OPENCLAW_* (legacy) and GEMINI_CHAT_MODEL.
 */
export function getOneGatewayConfig(
  env: Record<string, string | undefined> = process.env
): OneGatewayConfig {
  const token = env.ONE_GATEWAY_TOKEN ?? env.OPENCLAW_GATEWAY_TOKEN;
  if (!token) {
    throw new Error(
      "Missing gateway token. Set ONE_GATEWAY_TOKEN (or OPENCLAW_GATEWAY_TOKEN) in your environment."
    );
  }

  const baseUrl = normalizeBaseUrl(
    env.ONE_GATEWAY_URL ?? env.OPENCLAW_BASE_URL ?? "http://127.0.0.1:18789"
  );

  return {
    baseUrl,
    token,
    primaryModel:
      env.ONE_GATEWAY_MODEL ??
      env.GEMINI_CHAT_MODEL ??
      env.OPENCLAW_CHAT_MODEL ??
      env.OPENCLAW_MODEL_PRIMARY ??
      DEFAULT_CHAT_MODEL,
    fallbackModels: parseFallbacks(
      env.ONE_GATEWAY_FALLBACKS ?? env.OPENCLAW_MODEL_FALLBACKS ?? ""
    ),
    agentId: env.ONE_GATEWAY_AGENT ?? env.OPENCLAW_AGENT_ID ?? "main",
    temperature: Number(
      env.ONE_GATEWAY_TEMPERATURE ?? env.OPENCLAW_TEMPERATURE ?? 0.2
    ),
    maxTokens: Number(
      env.ONE_GATEWAY_MAX_TOKENS ?? env.OPENCLAW_MAX_TOKENS ?? 2000
    ),
    timeoutMs: Number(
      env.ONE_GATEWAY_TIMEOUT_MS ?? env.OPENCLAW_TIMEOUT_MS ?? 45000
    ),
  };
}

export function getChatModel(): string {
  return (
    process.env.ONE_GATEWAY_MODEL ||
    process.env.GEMINI_CHAT_MODEL ||
    process.env.OPENCLAW_CHAT_MODEL ||
    DEFAULT_CHAT_MODEL
  );
}

async function callOnce(args: {
  config: OneGatewayConfig;
  model: string;
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
  signal: AbortSignal;
}): Promise<{ model: string; content: string; raw: unknown }> {
  const { config, model, messages, temperature, maxTokens, signal } = args;

  const res = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      "x-openclaw-agent-id": config.agentId,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
    signal,
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 2048) };
  }

  if (!res.ok) {
    throw new Error(
      `One Gateway HTTP ${res.status} for model=${model}: ${typeof json === "object" ? JSON.stringify(json).slice(0, 500) : String(json)}`
    );
  }

  const content = (
    json as { choices?: { message?: { content?: string } }[] }
  )?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(`Empty One Gateway content for model=${model}`);
  }

  return { model, content, raw: json };
}

/**
 * Chat completion through One Gateway (same contract as one-gateway `complete`).
 */
export async function gatewayComplete(
  prompt: string,
  opts?: {
    model?: string;
    messages?: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
    config?: OneGatewayConfig;
  }
): Promise<{ model: string; content: string; raw: unknown }> {
  const config = opts?.config ?? getOneGatewayConfig();
  const models = [
    opts?.model ?? config.primaryModel,
    ...config.fallbackModels,
  ].filter(Boolean);
  const messages: ChatMessage[] =
    opts?.messages ?? [{ role: "user", content: prompt }];
  const temperature = opts?.temperature ?? config.temperature;
  const maxTokens = opts?.maxTokens ?? config.maxTokens;

  let lastError: unknown = null;

  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const out = await callOnce({
        config,
        model,
        messages,
        temperature,
        maxTokens,
        signal: controller.signal,
      });
      clearTimeout(timer);
      return out;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
    }
  }

  const e = new Error("All One Gateway model attempts failed");
  (e as Error & { cause: unknown }).cause = lastError;
  throw e;
}

/** Convenience: system + user → text (optionally ask for JSON in the prompt). */
export async function gatewayChatText(opts: {
  system?: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  json?: boolean;
}): Promise<string> {
  const system = opts.json
    ? `${opts.system ?? ""}\n\nRespond with ONLY valid JSON. No markdown fences.`.trim()
    : opts.system;

  const messages: ChatMessage[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: opts.user });

  const result = await gatewayComplete("", {
    messages,
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
    model: opts.model,
  });
  return result.content;
}

export async function gatewayChatJson(opts: {
  system?: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}): Promise<unknown> {
  const text = await gatewayChatText({ ...opts, json: true });
  // Strip optional markdown fences if the model still wraps JSON
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  return JSON.parse(cleaned);
}
