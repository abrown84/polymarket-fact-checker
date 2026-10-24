"use node";

import { action, ActionCtx } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { hashString } from "../utils";
import {
  gatewayEmbed,
  getEmbedModel,
  getEmbedDimensions,
  type EmbedRole,
} from "./oneGateway";

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
 * Embed text via One Gateway (`POST /v1/embeddings`, Gemini embeddings).
 * Caches embeddings by hash(text + model + role + dims) to reduce cost.
 */
export const embedText = action({
  args: {
    text: v.string(),
    role: v.optional(v.union(v.literal("query"), v.literal("document"))),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const model = getEmbedModel();
    const role: EmbedRole = args.role ?? "query";
    const dims = getEmbedDimensions();
    const cacheKey = `embed:${hashString(`${args.text}|${model}|${role}|${args.title || ""}|${dims}`)}`;
    const cached = await getCache(ctx, cacheKey);
    if (cached) {
      return cached;
    }

    const embedding = await gatewayEmbed(args.text, {
      role,
      title: args.title,
    });

    // Cache forever (embeddings don't change for same text+model+role)
    await setCache(ctx, cacheKey, embedding, 365 * 24 * 60 * 60 * 1000);

    return embedding;
  },
});
