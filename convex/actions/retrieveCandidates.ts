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
}

/**
 * Retrieve candidate markets using embedding similarity
 */
export const retrieveCandidates = action({
  args: {
    parsedClaim: v.any(),
  },
  handler: async (ctx, args): Promise<MarketCandidate[]> => {
    const now = Date.now();
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
    });

    // Get all embeddings
    const allEmbeddings: Array<{ polymarketMarketId: string; vector: number[] }> = 
      await ctx.runQuery(internalApi.queries.getAllEmbeddings);

    console.log(`[retrieveCandidates] Found ${allEmbeddings.length} embeddings in database`);
    
    if (allEmbeddings.length === 0) {
      console.warn(`[retrieveCandidates] No embeddings found! Markets may not have embeddings generated.`);
      return [];
    }

    // Compute similarity scores
    const candidates: Array<{ polymarketMarketId: string; similarity: number }> = [];
    for (const emb of allEmbeddings) {
      if (!emb.vector || !Array.isArray(emb.vector) || emb.vector.length === 0) {
        console.warn(`[retrieveCandidates] Invalid embedding for market ${emb.polymarketMarketId}`);
        continue;
      }
      const similarity = cosineSimilarity(queryEmbedding, emb.vector);
      candidates.push({
        polymarketMarketId: emb.polymarketMarketId,
        similarity,
      });
    }
    
    console.log(`[retrieveCandidates] Computed similarity for ${candidates.length} candidates`);

    // Sort by similarity and get top K=100 (more candidates for flexible matching)
    candidates.sort((a, b) => b.similarity - a.similarity);
    const topK = candidates.slice(0, 100);
    
    console.log(`[retrieveCandidates] Top similarity scores:`, topK.slice(0, 5).map(c => ({ id: c.polymarketMarketId, sim: c.similarity.toFixed(4) })));

    // Fetch market details for top candidates
    const results: MarketCandidate[] = [];
    for (const candidate of topK) {
      const market: any = await ctx.runQuery(internalApi.queries.getMarket, {
        polymarketMarketId: candidate.polymarketMarketId,
      });
      if (market) {
        // Never return ended markets
        if (typeof market.endDate === "number" && market.endDate <= now) {
          continue;
        }

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
        });
      } else {
        console.warn(`[retrieveCandidates] Market ${candidate.polymarketMarketId} has embedding but no market data`);
      }
    }
    
    console.log(`[retrieveCandidates] Returning ${results.length} candidate markets`);
    return results;
  },
});
