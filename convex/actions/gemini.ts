"use node";

import { GoogleGenAI } from "@google/genai";

/** Chat: gemini-3.8-flash (https://ai.google.dev/gemini-api/docs/models) */
export const DEFAULT_GEMINI_CHAT_MODEL = "gemini-3.8-flash";

/**
 * Embeddings: gemini-embedding-2 is the current recommended model
 * (https://ai.google.dev/gemini-api/docs/embeddings). Default output dim is 3072;
 * OpenAI text-embedding-3-small was 1536 — re-index after switching.
 */
export const DEFAULT_GEMINI_EMBED_MODEL = "gemini-embedding-2";

export type EmbedRole = "query" | "document";

export function requireGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY env var");
  }
  return apiKey;
}

export function getGeminiChatModel(): string {
  return process.env.GEMINI_CHAT_MODEL || DEFAULT_GEMINI_CHAT_MODEL;
}

export function getGeminiEmbedModel(): string {
  return process.env.GEMINI_EMBED_MODEL || DEFAULT_GEMINI_EMBED_MODEL;
}

/** Optional Matryoshka truncation (768 / 1536 / 3072). Undefined = model default (3072). */
export function getGeminiEmbedDimensions(): number | undefined {
  const raw = process.env.GEMINI_EMBED_DIMENSIONS;
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

export function getGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: requireGeminiApiKey() });
}

/**
 * Format text for gemini-embedding-2 task prefixes
 * (https://ai.google.dev/gemini-api/docs/embeddings#task-types-with-embeddings-2).
 */
export function formatEmbedInput(
  text: string,
  role: EmbedRole = "query",
  title?: string
): string {
  const model = getGeminiEmbedModel();
  if (!model.startsWith("gemini-embedding-2")) {
    return text;
  }
  if (role === "document") {
    return `title: ${title || "none"} | text: ${text}`;
  }
  return `task: fact checking | query: ${text}`;
}

export async function geminiChatText(opts: {
  system?: string;
  user: string;
  temperature?: number;
  json?: boolean;
  maxOutputTokens?: number;
}): Promise<string> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: getGeminiChatModel(),
    contents: opts.user,
    config: {
      systemInstruction: opts.system,
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxOutputTokens,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty Gemini chat response");
  }
  return text;
}

export async function geminiChatJson(opts: {
  system?: string;
  user: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<unknown> {
  const text = await geminiChatText({ ...opts, json: true });
  return JSON.parse(text);
}

export async function geminiEmbed(
  text: string,
  opts?: { role?: EmbedRole; title?: string }
): Promise<number[]> {
  const ai = getGeminiClient();
  const model = getGeminiEmbedModel();
  const dimensions = getGeminiEmbedDimensions();
  const contents = formatEmbedInput(text, opts?.role ?? "query", opts?.title);

  const response = await ai.models.embedContent({
    model,
    contents,
    ...(dimensions
      ? { config: { outputDimensionality: dimensions } }
      : {}),
  });

  const values = response.embeddings?.[0]?.values;
  if (!values || !Array.isArray(values) || values.length === 0) {
    throw new Error("Empty Gemini embedding response");
  }
  return values;
}

export function getGeminiChatConfig(): {
  provider: "gemini";
  apiKey: string;
  model: string;
} {
  return {
    provider: "gemini",
    apiKey: requireGeminiApiKey(),
    model: getGeminiChatModel(),
  };
}

export function getGeminiEmbedConfig(): {
  provider: "gemini";
  apiKey: string;
  model: string;
  dimensions: number | undefined;
} {
  return {
    provider: "gemini",
    apiKey: requireGeminiApiKey(),
    model: getGeminiEmbedModel(),
    dimensions: getGeminiEmbedDimensions(),
  };
}
