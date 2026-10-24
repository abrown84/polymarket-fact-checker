"use node";

/**
 * Chat + embeddings via One Gateway's OpenAI-compatible protocol.
 *
 * one-gateway (https://github.com/abrown84/one-gateway) is an OpenAI-compatible
 * client for an OpenClaw-style gateway. The published npm package currently
 * ships without a usable `dist`, so this module mirrors its client:
 *   POST {ONE_GATEWAY_URL}/v1/chat/completions
 *   POST {ONE_GATEWAY_URL}/v1/embeddings
 *   Authorization: Bearer {ONE_GATEWAY_TOKEN}  (only when token is set)
 *   x-openclaw-agent-id: {ONE_GATEWAY_AGENT}
 *
 * Default base URL: https://brwnindustries.com/labs/one-gateway
 * Default chat model: gemini-3.8-flash
 * Default embed model: gemini-embedding-2 (3072 dims)
 */

export const DEFAULT_GATEWAY_URL =
  "https://brwnindustries.com/labs/one-gateway";
export const DEFAULT_CHAT_MODEL = "gemini-3.8-flash";
export const DEFAULT_EMBED_MODEL = "gemini-embedding-2";
/** Gateway Gemini embeddings currently return 3072 dimensions. */
export const DEFAULT_EMBED_DIMENSIONS = 3072;

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type EmbedRole = "query" | "document";

export type OneGatewayConfig = {
  baseUrl: string;
  /** Optional — Authorization header is only sent when set. */
  token?: string;
  primaryModel: string;
  fallbackModels: string[];
  agentId: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  embedModel: string;
  /** Expected embedding size (default 3072). */
  embedDimensions: number;
};

function parseFallbacks(v = ""): string[] {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Strip trailing slashes and an optional trailing `/v1` (we append `/v1/...`). */
export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "").replace(/\/v1$/i, "");
}

function gatewayHeaders(config: OneGatewayConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-openclaw-agent-id": config.agentId,
  };
  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`;
  }
  return headers;
}

/**
 * Resolve One Gateway config from env.
 * Prefers ONE_GATEWAY_* ; falls back to OPENCLAW_* (legacy) and GEMINI_* aliases.
 * Token is optional. URL defaults to the public Brown Industries gateway.
 */
export function getOneGatewayConfig(
  env: Record<string, string | undefined> = process.env
): OneGatewayConfig {
  const token =
    env.ONE_GATEWAY_TOKEN ?? env.OPENCLAW_GATEWAY_TOKEN ?? undefined;

  const dimsRaw =
    env.ONE_GATEWAY_EMBED_DIMENSIONS ?? env.GEMINI_EMBED_DIMENSIONS;
  const parsedDims = dimsRaw ? Number.parseInt(dimsRaw, 10) : NaN;
  const embedDimensions =
    Number.isFinite(parsedDims) && parsedDims > 0
      ? parsedDims
      : DEFAULT_EMBED_DIMENSIONS;

  return {
    baseUrl: normalizeBaseUrl(
      env.ONE_GATEWAY_URL ?? env.OPENCLAW_BASE_URL ?? DEFAULT_GATEWAY_URL
    ),
    token: token || undefined,
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
    embedModel:
      env.ONE_GATEWAY_EMBED_MODEL ??
      env.GEMINI_EMBED_MODEL ??
      DEFAULT_EMBED_MODEL,
    embedDimensions,
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

export function getEmbedModel(): string {
  return (
    process.env.ONE_GATEWAY_EMBED_MODEL ||
    process.env.GEMINI_EMBED_MODEL ||
    DEFAULT_EMBED_MODEL
  );
}

export function getEmbedDimensions(): number {
  return getOneGatewayConfig().embedDimensions;
}

/**
 * Format text for gemini-embedding-2 task prefixes when that model is used.
 * (https://ai.google.dev/gemini-api/docs/embeddings#task-types-with-embeddings-2)
 */
export function formatEmbedInput(
  text: string,
  role: EmbedRole = "query",
  title?: string
): string {
  const model = getEmbedModel();
  if (!model.startsWith("gemini-embedding-2")) {
    return text;
  }
  if (role === "document") {
    return `title: ${title || "none"} | text: ${text}`;
  }
  return `task: fact checking | query: ${text}`;
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
    headers: gatewayHeaders(config),
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

/**
 * Embeddings through One Gateway (`POST /v1/embeddings`).
 * Returns Gemini embeddings (default model gemini-embedding-2, 3072 dims).
 */
export async function gatewayEmbed(
  text: string,
  opts?: {
    role?: EmbedRole;
    title?: string;
    model?: string;
    config?: OneGatewayConfig;
  }
): Promise<number[]> {
  const config = opts?.config ?? getOneGatewayConfig();
  const model = opts?.model ?? config.embedModel;
  const input = formatEmbedInput(text, opts?.role ?? "query", opts?.title);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const body: Record<string, unknown> = {
      model,
      input,
    };
    // OpenAI-compatible optional dimensions; gateway currently returns 3072
    // regardless, but pass through when explicitly configured.
    if (
      config.embedDimensions &&
      config.embedDimensions !== DEFAULT_EMBED_DIMENSIONS
    ) {
      body.dimensions = config.embedDimensions;
    }

    const res = await fetch(`${config.baseUrl}/v1/embeddings`, {
      method: "POST",
      headers: gatewayHeaders(config),
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const rawText = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(rawText);
    } catch {
      json = { raw: rawText.slice(0, 2048) };
    }

    if (!res.ok) {
      throw new Error(
        `One Gateway embeddings HTTP ${res.status}: ${typeof json === "object" ? JSON.stringify(json).slice(0, 500) : String(json)}`
      );
    }

    const values = (
      json as { data?: { embedding?: number[] }[] }
    )?.data?.[0]?.embedding;

    if (!values || !Array.isArray(values) || values.length === 0) {
      throw new Error("Empty One Gateway embedding response");
    }

    return values;
  } finally {
    clearTimeout(timer);
  }
}
