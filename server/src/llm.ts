import { GoogleGenAI } from '@google/genai';

const DEFAULT_CHAT_MODEL = 'gemini-3.8-flash';
const DEFAULT_EMBED_MODEL = 'gemini-embedding-2';

function requireApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Missing GEMINI_API_KEY env var');
  return key;
}

function getClient() {
  return new GoogleGenAI({ apiKey: requireApiKey() });
}

function chatModel(override?: string) {
  return override || process.env.GEMINI_CHAT_MODEL || DEFAULT_CHAT_MODEL;
}

function embedModel() {
  return process.env.GEMINI_EMBED_MODEL || DEFAULT_EMBED_MODEL;
}

function embedDimensions(): number | undefined {
  const raw = process.env.GEMINI_EMBED_DIMENSIONS;
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export async function chatComplete(
  messages: { role: string; content: string }[],
  opts?: { model?: string; maxTokens?: number }
) {
  const systemParts = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content);
  const userParts = messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n\n');

  const ai = getClient();
  const response = await ai.models.generateContent({
    model: chatModel(opts?.model),
    contents: userParts || ' ',
    config: {
      systemInstruction: systemParts.length ? systemParts.join('\n\n') : undefined,
      maxOutputTokens: opts?.maxTokens || 1000,
    },
  });

  const text = response.text;
  if (!text) throw new Error('Empty Gemini chat response');
  return text;
}

export async function createEmbedding(text: string): Promise<number[]> {
  const ai = getClient();
  const dimensions = embedDimensions();
  const response = await ai.models.embedContent({
    model: embedModel(),
    contents: text,
    ...(dimensions ? { config: { outputDimensionality: dimensions } } : {}),
  });
  const values = response.embeddings?.[0]?.values;
  if (!values) throw new Error('Empty Gemini embedding response');
  return values;
}
