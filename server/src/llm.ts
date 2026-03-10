const BRIDGE_URL = process.env.OPENCLAW_BASE_URL || 'http://127.0.0.1:18789';
const BRIDGE_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';
const CHAT_MODEL = process.env.OPENCLAW_CHAT_MODEL || 'openclaw';

export async function chatComplete(messages: {role: string, content: string}[], opts?: {model?: string, maxTokens?: number}) {
  const res = await fetch(`${BRIDGE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BRIDGE_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: opts?.model || CHAT_MODEL,
      messages,
      max_tokens: opts?.maxTokens || 1000
    })
  });
  if (!res.ok) throw new Error(`LLM error: ${res.status}`);
  const json = await res.json() as any;
  return json.choices[0].message.content as string;
}

export async function createEmbedding(text: string): Promise<number[]> {
  const embedUrl = process.env.OPENCLAW_EMBED_URL || 'https://api.openai.com/v1/embeddings';
  const embedKey = process.env.OPENAI_API_KEY || BRIDGE_TOKEN;
  const res = await fetch(embedUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${embedKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text })
  });
  if (!res.ok) throw new Error(`Embed error: ${res.status}`);
  const json = await res.json() as any;
  return json.data[0].embedding;
}
