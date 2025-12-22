"use node";

import { action, ActionCtx } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { hashString } from "../utils";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_EMBED_MODEL =
  process.env.OPENROUTER_EMBED_MODEL || "openai/text-embedding-3-small";

if (!OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY environment variable is required");
}

// Type-safe internal API references
const internalApi = internal as {
  queries: {
    getCache: any;
    getMarket: any;
    getAllEmbeddings: any;
    getRecentQueries: any;
  };
  mutations: {
    setCache: any;
    upsertMarket: any;
    upsertEmbedding: any;
    logQuery: any;
  };
  actions: {
    aiEmbed: { embedText: any };
    aiParseClaim: { aiParseClaim: any };
    aiRerank: { aiRerank: any };
    polymarket: { fetchGammaMarkets: any; fetchClobBook: any; fetchClobLastPrice: any };
    retrieveCandidates: { retrieveCandidates: any };
    ingestMarkets: { ingestMarkets: any };
  };
};

/**
 * Get or set cache value
 */
async function getCache(ctx: ActionCtx, key: string): Promise<any | null> {
  const now = Date.now();
  const cached = await ctx.runQuery(internalApi.queries.getCache, { key });
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }
  return null;
}

async function setCache(
  ctx: ActionCtx,
  key: string,
  value: any,
  ttl: number
): Promise<void> {
  const now = Date.now();
  await ctx.runMutation(internalApi.mutations.setCache, {
    key,
    value,
    expiresAt: now + ttl,
    updatedAt: now,
  });
}

/**
 * Embed text using OpenRouter embeddings API
 * Caches embeddings by hash(text + model) to reduce cost
 */
export const embedText = action({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    const cacheKey = `embed:${hashString(args.text + OPENROUTER_EMBED_MODEL)}`;
    const cached = await getCache(ctx, cacheKey);
    if (cached) {
      return cached;
    }

    const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENROUTER_EMBED_MODEL,
        input: args.text,
      }),
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const embedding = data.data[0].embedding;

    // Cache forever (embeddings don't change for same text+model)
    await setCache(ctx, cacheKey, embedding, 365 * 24 * 60 * 60 * 1000);

    return embedding;
  },
});
