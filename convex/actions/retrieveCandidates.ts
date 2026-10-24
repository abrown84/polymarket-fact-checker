"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { cosineSimilarity } from "../utils";
import { ParsedClaim } from "../utils";

// Type-safe internal API references
const internalApi = internal as {
  queries: {
    getCache: any;
    getMarket: any;
    getAllEmbeddings: any;
    getAllMarkets: any;
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

interface MarketCandidate {
  polymarketMarketId: string;
  title: string;
  description: string;
  endDate: number | null;
  url: string | null;
  outcomes: string[];
  volume: number | null;
  liquidity: number | null;
  similarity: number;
  matchSource?: "embedding" | "keyword";
}

/** Simple token overlap score in [0, 1]. */
function keywordScore(query: string, title: string, description: string): number {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length > 2);
  if (tokens.length === 0) return 0;
  const hay = `${title} ${description}`.toLowerCase();
  let hits = 0;
  for (const t of tokens) {
    if (hay.includes(t)) hits++;
  }
  return hits / tokens.length;
}

/**
 * Retrieve candidate markets using embedding similarity, with keyword fallback
 * for markets that are not yet re-embedded (missing or dimension-mismatched).
 */
export const retrieveCandidates = action({
  args: {
    parsedClaim: v.any(),
  },
  handler: async (ctx, args): Promise<MarketCandidate[]> => {
    const parsedClaim = args.parsedClaim as ParsedClaim;

    // Build retrieval text from parsed claim
    const retrievalText = [
      parsedClaim.claim,
      ...parsedClaim.must_include,
      parsedClaim.time_window.end ? `by ${parsedClaim.time_window.end}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    // Embed the retrieval text
    const queryEmbedding: number[] = await ctx.runAction(internalApi.actions.aiEmbed.embedText, {
      text: retrievalText,
      role: "query",
    });

    // Get all embeddings
    const allEmbeddings: Array<{ polymarketMarketId: string; vector: number[]; model?: string }> =
      await ctx.runQuery(internalApi.queries.getAllEmbeddings);

    console.log(`[retrieveCandidates] Found ${allEmbeddings.length} embeddings in database`);

    const candidates: Array<{
      polymarketMarketId: string;
      similarity: number;
      matchSource: "embedding" | "keyword";
    }> = [];
    const covered = new Set<string>();
    let skippedDimMismatch = 0;

    for (const emb of allEmbeddings) {
      if (!emb.vector || !Array.isArray(emb.vector) || emb.vector.length === 0) {
        console.warn(`[retrieveCandidates] Invalid embedding for market ${emb.polymarketMarketId}`);
        continue;
      }
      if (emb.vector.length !== queryEmbedding.length) {
        skippedDimMismatch++;
        continue;
      }
      const similarity = cosineSimilarity(queryEmbedding, emb.vector);
      candidates.push({
        polymarketMarketId: emb.polymarketMarketId,
        similarity,
        matchSource: "embedding",
      });
      covered.add(emb.polymarketMarketId);
    }

    if (skippedDimMismatch > 0) {
      console.warn(
        `[retrieveCandidates] Skipped ${skippedDimMismatch} embeddings with dimension mismatch ` +
          `(query=${queryEmbedding.length}). Keyword fallback will cover those markets; ` +
          `healEmbeddings cron will re-index them gradually.`
      );
    }

    // Keyword fallback for markets without a usable embedding (missing or dim-mismatch).
    // Scale keyword scores down so strong vector matches still rank first.
    const KEYWORD_WEIGHT = 0.55;
    const KEYWORD_MIN = 0.25;
    const allMarkets: Array<{
      polymarketMarketId: string;
      title: string;
      description: string;
    }> = await ctx.runQuery(internalApi.queries.getAllMarkets);

    let keywordAdded = 0;
    for (const market of allMarkets) {
      if (covered.has(market.polymarketMarketId)) continue;
      const score = keywordScore(
        retrievalText,
        market.title || "",
        market.description || ""
      );
      if (score < KEYWORD_MIN) continue;
      candidates.push({
        polymarketMarketId: market.polymarketMarketId,
        similarity: score * KEYWORD_WEIGHT,
        matchSource: "keyword",
      });
      keywordAdded++;
    }

    console.log(
      `[retrieveCandidates] Vector candidates=${covered.size}, keyword fallback added=${keywordAdded}`
    );

    if (candidates.length === 0) {
      console.warn(`[retrieveCandidates] No candidates from embeddings or keywords.`);
      return [];
    }

    // Sort by similarity and get top K=100
    candidates.sort((a, b) => b.similarity - a.similarity);
    const topK = candidates.slice(0, 100);

    console.log(
      `[retrieveCandidates] Top scores:`,
      topK.slice(0, 5).map((c) => ({
        id: c.polymarketMarketId,
        sim: c.similarity.toFixed(4),
        src: c.matchSource,
      }))
    );

    const results: MarketCandidate[] = [];
    for (const candidate of topK) {
      const market: any = await ctx.runQuery(internalApi.queries.getMarket, {
        polymarketMarketId: candidate.polymarketMarketId,
      });
      if (market) {
        results.push({
          polymarketMarketId: market.polymarketMarketId,
          title: market.title,
          description: market.description,
          endDate: market.endDate,
          url: market.url,
          outcomes: market.outcomes,
          volume: market.volume,
          liquidity: market.liquidity,
          similarity: candidate.similarity,
          matchSource: candidate.matchSource,
        });
      } else {
        console.warn(
          `[retrieveCandidates] Market ${candidate.polymarketMarketId} scored but has no market row`
        );
      }
    }

    console.log(`[retrieveCandidates] Returning ${results.length} candidate markets`);
    return results;
  },
});
