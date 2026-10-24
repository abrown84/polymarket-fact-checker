import { GoogleGenAI } from '@google/genai';

const DEFAULT_CHAT_MODEL = 'gemini-3.8-flash';
const DEFAULT_EMBED_MODEL = 'gemini-embedding-2';

type ChatMessage = { role: string; content: string };

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function getGatewayConfig() {
  const token =
    process.env.ONE_GATEWAY_TOKEN || process.env.OPENCLAW_GATEWAY_TOKEN;
  if (!token) {
    throw new Error(
      'Missing gateway token. Set ONE_GATEWAY_TOKEN (or OPENCLAW_GATEWAY_TOKEN).'
    );
  }
  return {
    baseUrl: normalizeBaseUrl(
      process.env.ONE_GATEWAY_URL ||
        process.env.OPENCLAW_BASE_URL ||
        'http://127.0.0.1:18789'
    ),
    token,
    model:
      process.env.ONE_GATEWAY_MODEL ||
      process.env.GEMINI_CHAT_MODEL ||
      process.env.OPENCLAW_CHAT_MODEL ||
      DEFAULT_CHAT_MODEL,
    agentId:
      process.env.ONE_GATEWAY_AGENT || process.env.OPENCLAW_AGENT_ID || 'main',
  };
}

/**
 * Chat via One Gateway OpenAI-compatible endpoint
 * (same protocol as https://github.com/abrown84/one-gateway).
 */
export async function chatComplete(
  messages: ChatMessage[],
  opts?: { model?: string; maxTokens?: number }
) {
  const gw = getGatewayConfig();
  const res = await fetch(`${gw.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${gw.token}`,
      'Content-Type': 'application/json',
      'x-openclaw-agent-id': gw.agentId,
    },
    body: JSON.stringify({
      model: opts?.model || gw.model,
      messages,
      max_tokens: opts?.maxTokens || 1000,
    }),
  });
  if (!res.ok) throw new Error(`LLM error: ${res.status}`);
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty One Gateway chat response');
  return content;
}

/** Embeddings stay on Gemini — one-gateway has no embeddings API. */
export async function createEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY env var');

  const dimensionsRaw = process.env.GEMINI_EMBED_DIMENSIONS;
  const dimensions = dimensionsRaw
    ? Number.parseInt(dimensionsRaw, 10)
    : undefined;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.embedContent({
    model: process.env.GEMINI_EMBED_MODEL || DEFAULT_EMBED_MODEL,
    contents: text,
    ...(dimensions && Number.isFinite(dimensions) && dimensions > 0
      ? { config: { outputDimensionality: dimensions } }
      : {}),
  });
  const values = response.embeddings?.[0]?.values;
  if (!values) throw new Error('Empty Gemini embedding response');
  return values;
}
