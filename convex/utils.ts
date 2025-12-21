import { z } from "zod";

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Clamp a number between 0 and 1
 */
export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Hash a string (simple djb2)
 */
export function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await sleep(delay);
      }
    }
  }
  throw lastError || new Error("Retry failed");
}

/**
 * Parse claim schema for validation
 */
export const ParsedClaimSchema = z.object({
  claim: z.string(),
  type: z.enum(["past_event", "future_event", "ongoing", "numeric"]),
  time_window: z.object({
    start: z.union([z.string(), z.null()]),
    end: z.union([z.string(), z.null()]),
  }),
  entities: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
    })
  ),
  must_include: z.array(z.string()),
  must_exclude: z.array(z.string()),
  ambiguities: z.array(z.string()),
});

export type ParsedClaim = z.infer<typeof ParsedClaimSchema>;
