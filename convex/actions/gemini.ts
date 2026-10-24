"use node";

import { GoogleGenAI } from "@google/genai";

/**
 * Embeddings only — chat goes through One Gateway (see oneGateway.ts).
 * one-gateway does not support embeddings, so we keep Google Gemini here.
 *
 * Model: gemini-embedding-2
 * https://ai.google.dev/gemini-api/docs/embeddings
 * Default output dim is 3072; OpenAI text-embedding-3-small was 1536 —
 * re-index after switching.
 */
export const DEFAULT_GEMINI_EMBED_MODEL = "gemini-embedding-2";

export type EmbedRole = "query" | "document";

export function requireGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY env var (required for embeddings)");
  }
  return apiKey;
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
