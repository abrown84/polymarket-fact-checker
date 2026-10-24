const DEFAULT_GATEWAY_URL = 'https://brwnindustries.com/labs/one-gateway';
const DEFAULT_CHAT_MODEL = 'gemini-3.8-flash';
const DEFAULT_EMBED_MODEL = 'gemini-embedding-2';

type ChatMessage = { role: string; content: string };

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '').replace(/\/v1$/i, '');
}

function getGatewayConfig() {
  const token =
    process.env.ONE_GATEWAY_TOKEN ||
    process.env.OPENCLAW_GATEWAY_TOKEN ||
    undefined;
  return {
    baseUrl: normalizeBaseUrl(
      process.env.ONE_GATEWAY_URL ||
        process.env.OPENCLAW_BASE_URL ||
        DEFAULT_GATEWAY_URL
    ),
    token,
    model:
      process.env.ONE_GATEWAY_MODEL ||
      process.env.GEMINI_CHAT_MODEL ||
      process.env.OPENCLAW_CHAT_MODEL ||
      DEFAULT_CHAT_MODEL,
    agentId:
      process.env.ONE_GATEWAY_AGENT || process.env.OPENCLAW_AGENT_ID || 'main',
    embedModel:
      process.env.ONE_GATEWAY_EMBED_MODEL ||
      process.env.GEMINI_EMBED_MODEL ||
      DEFAULT_EMBED_MODEL,
  };
}

function gatewayHeaders(gw: { token?: string; agentId: string }): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-openclaw-agent-id': gw.agentId,
  };
  if (gw.token) {
    headers.Authorization = `Bearer ${gw.token}`;
  }
  return headers;
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
    headers: gatewayHeaders(gw),
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

/** Embeddings via One Gateway (`POST /v1/embeddings`, Gemini 3072-d). */
export async function createEmbedding(text: string): Promise<number[]> {
  const gw = getGatewayConfig();
  const res = await fetch(`${gw.baseUrl}/v1/embeddings`, {
    method: 'POST',
    headers: gatewayHeaders(gw),
    body: JSON.stringify({
      model: gw.embedModel,
      input: text,
    }),
  });
  if (!res.ok) throw new Error(`Embedding error: ${res.status}`);
  const json = (await res.json()) as {
    data?: { embedding?: number[] }[];
  };
  const values = json.data?.[0]?.embedding;
  if (!values) throw new Error('Empty One Gateway embedding response');
  return values;
}
