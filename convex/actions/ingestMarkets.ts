"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const BATCH_SIZE = 1000; // Maximum batch size for processing markets

// Type-safe internal API references
const internalApi = internal as {
  queries: {
    getCache: any;
    getMarket: any;
    getAllEmbeddings: any;
    getRecentQueries: any;
    getEmbedding: any;
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
    polymarket: { fetchGammaMarkets: any; fetchClobBook: any; fetchClobLastPrice: any; fetchPopularMarkets: any };
    retrieveCandidates: { retrieveCandidates: any };
    ingestMarkets: { ingestMarkets: any };
  };
};

interface IngestResult {
  processed: number;
  nextCursor: string | null;
  done: boolean;
  error?: string;
  skipped?: number;
  skipReasons?: Record<string, number>;
}

/**
 * Ingest markets from Polymarket Gamma API
 * Processes in batches to avoid long serverless runs
 */
export const ingestMarkets = action({
  args: {
    cursor: v.union(v.string(), v.null()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<IngestResult> => {
    try {
      console.log(`[ingestMarkets] Starting ingestion with cursor=${args.cursor}, limit=${args.limit || BATCH_SIZE}`);
      const limit = args.limit || BATCH_SIZE;
      const cursor = args.cursor || null;

      // Fetch markets from Gamma (always bypass cache for fresh data)
      // fetchGammaMarkets now uses /markets?closed=false&active=true to get only active markets
      console.log(`[ingestMarkets] Fetching active markets from Gamma API (bypassing cache)...`);
      const gammaData: any = await ctx.runAction(
        internalApi.actions.polymarket.fetchGammaMarkets,
        { 
          limit: limit,
          cursor: cursor,
          bypassCache: true // Always bypass cache for fresh data
        }
      );

      console.log(`[ingestMarkets] Gamma API response:`, {
        hasData: !!gammaData,
        dataIsArray: Array.isArray(gammaData?.data),
        dataLength: Array.isArray(gammaData?.data) ? gammaData.data.length : 0,
        responseKeys: gammaData ? Object.keys(gammaData) : [],
      });

      // Log full response structure for debugging
      if (gammaData) {
        const responseStr = JSON.stringify(gammaData, null, 2);
        console.log(`[ingestMarkets] Full response structure (first 2000 chars):`, responseStr.substring(0, 2000));
        console.log(`[ingestMarkets] Response keys:`, Object.keys(gammaData));
        console.log(`[ingestMarkets] Data type:`, typeof gammaData.data);
        console.log(`[ingestMarkets] Data value:`, gammaData.data);
      }

      if (!gammaData) {
        console.log(`[ingestMarkets] No gammaData returned`);
        return {
          processed: 0,
          nextCursor: null,
          done: true,
          error: "No data returned from API",
        };
      }

      // Handle different response formats
      let markets: any[] = [];
      
      // Check if data is directly an array
      if (Array.isArray(gammaData)) {
        markets = gammaData;
        console.log(`[ingestMarkets] Response is direct array with ${markets.length} items`);
      }
      // Check if data.data is an array
      else if (Array.isArray(gammaData.data)) {
        markets = gammaData.data;
        console.log(`[ingestMarkets] Found markets in data.data array: ${markets.length} items`);
      }
      // Check other possible array fields
      else if (gammaData.results && Array.isArray(gammaData.results)) {
        markets = gammaData.results;
        console.log(`[ingestMarkets] Found markets in results array: ${markets.length} items`);
      }
      else if (gammaData.markets && Array.isArray(gammaData.markets)) {
        markets = gammaData.markets;
        console.log(`[ingestMarkets] Found markets in markets array: ${markets.length} items`);
      }
      // Check if data.data exists but is not an array - might be an object with nested data
      else if (gammaData.data && typeof gammaData.data === 'object' && !Array.isArray(gammaData.data)) {
        console.log(`[ingestMarkets] data.data exists but is not an array. Type: ${typeof gammaData.data}, Keys:`, Object.keys(gammaData.data));
        // Try to find array fields in the data object
        for (const key of Object.keys(gammaData.data)) {
          if (Array.isArray(gammaData.data[key])) {
            markets = gammaData.data[key];
            console.log(`[ingestMarkets] Found markets array in data.${key}: ${markets.length} items`);
            break;
          }
        }
      }
      
      // Log market status breakdown
      if (markets.length > 0) {
        const statusBreakdown = {
          active: markets.filter((m: any) => m.active === true).length,
          inactive: markets.filter((m: any) => m.active === false).length,
          activeUndefined: markets.filter((m: any) => m.active === undefined).length,
          closed: markets.filter((m: any) => m.closed === true).length,
          closedUndefined: markets.filter((m: any) => m.closed === undefined).length,
          hasEndDate: markets.filter((m: any) => m.endDate || m.endDateISO || m.endDateIso).length,
        };
        console.log(`[ingestMarkets] Market status breakdown:`, statusBreakdown);
      }

      if (markets.length === 0) {
        const fullResponse = JSON.stringify(gammaData, null, 2);
        console.log(`[ingestMarkets] No markets found in response. Full response:`, fullResponse);
        console.log(`[ingestMarkets] Response type:`, typeof gammaData);
        console.log(`[ingestMarkets] Response keys:`, gammaData ? Object.keys(gammaData) : []);
        
        // Return error details in the result
        return {
          processed: 0,
          nextCursor: null,
          done: true,
          error: `No markets found. Response keys: ${gammaData ? Object.keys(gammaData).join(", ") : "none"}. Check logs for full response.`,
        };
      }

      const now = Date.now();
      console.log(`[ingestMarkets] Processing ${markets.length} markets`);
      
      // Log first market structure for debugging
      if (markets.length > 0) {
        console.log(`[ingestMarkets] Sample market structure:`, JSON.stringify(markets[0], null, 2).substring(0, 1000));
      }

      let processedCount = 0;
      let embeddingCount = 0;
      let skippedCount = 0;
      const skipReasons: Record<string, number> = {};

      // Process each market
      for (let i = 0; i < markets.length; i++) {
        const market = markets[i];
        try {
          // Parse end date first
          const endDate = market.endDate
            ? new Date(market.endDate).getTime()
            : market.endDateISO
            ? new Date(market.endDateISO).getTime()
            : market.endDateIso
            ? new Date(market.endDateIso).getTime()
            : null;
          
          // Additional client-side filtering as safety measure
          // The API endpoint now uses closed=false&active=true, so most markets should already be active
          // But we still check for edge cases (expired markets, etc.)
          const isActive = market.active !== false; // Default to true if undefined
          const isClosed = market.closed === true; // Only skip if explicitly closed
          const hasEnded = endDate && endDate < now;
          
          // Log first few markets to see their status
          if (i < 3) {
            console.log(`[ingestMarkets] Market ${i} status:`, {
              id: market.id,
              active: market.active,
              closed: market.closed,
              endDate: endDate ? new Date(endDate).toISOString() : null,
              hasEnded,
            });
          }
          
          // Skip if explicitly closed OR has ended (should be rare now that API pre-filters)
          if (isClosed || hasEnded) {
            const reason = isClosed ? "closed" : "ended";
            skipReasons[reason] = (skipReasons[reason] || 0) + 1;
            skippedCount++;
            continue;
          }
          
          // Also skip if explicitly inactive (but allow undefined)
          if (market.active === false) {
            skipReasons["inactive"] = (skipReasons["inactive"] || 0) + 1;
            skippedCount++;
            continue;
          }
          
          // Extract market data (adjust based on actual Gamma API response structure)
          // API returns: id, question, conditionId, slug, description, outcomes (as string), volume (as string), etc.
          const polymarketMarketId =
            market.id || market.marketId || market.conditionId || market.slug || String(market._id || "");
          const title = market.question || market.title || market.name || "";
          const description = market.description || market.resolution || "";
          
          // Parse outcomes if it's a string
          let outcomes: string[] = ["Yes", "No"];
          if (market.outcomes) {
            if (typeof market.outcomes === 'string') {
              try {
                outcomes = JSON.parse(market.outcomes);
              } catch {
                outcomes = [market.outcomes];
              }
            } else if (Array.isArray(market.outcomes)) {
              outcomes = market.outcomes;
            }
          }
          
          // Parse volume and liquidity (they come as strings from the API)
          const volume = market.volumeNum || (market.volume ? parseFloat(String(market.volume)) : null);
          const liquidity = market.liquidityNum || (market.liquidity ? parseFloat(String(market.liquidity)) : null);
          
          if (!polymarketMarketId) {
            const reason = "missing ID";
            skipReasons[reason] = (skipReasons[reason] || 0) + 1;
            console.warn(`[ingestMarkets] Skipping market ${i}: missing ID. Market keys:`, Object.keys(market));
            skippedCount++;
            continue;
          }
          
          if (!title) {
            const reason = "missing title";
            skipReasons[reason] = (skipReasons[reason] || 0) + 1;
            console.warn(`[ingestMarkets] Skipping market ${i}: missing title. ID: ${polymarketMarketId}, Market keys:`, Object.keys(market));
            skippedCount++;
            continue;
          }

          const slug = market.slug || null;
          const url = market.url || (slug ? `https://polymarket.com/event/${slug}` : null);
          // endDate already calculated above for filtering

          // Upsert market
          await ctx.runMutation(internalApi.mutations.upsertMarket, {
            polymarketMarketId,
            title,
            description,
            slug,
            url,
            endDate,
            outcomes: outcomes,
            volume: volume,
            liquidity: liquidity,
            lastIngestedAt: now,
          });
          processedCount++;

          // Generate embedding text
          const embeddingText = [
            title,
            description,
            outcomes.join(", "),
            endDate ? new Date(endDate).toISOString() : "",
          ]
            .filter(Boolean)
            .join(" ");

          // Check if embedding needs update (by checking if market changed or embedding doesn't exist)
          const existingMarket: any = await ctx.runQuery(internalApi.queries.getMarket, {
            polymarketMarketId,
          });

          // Check if embedding exists
          const existingEmbedding: any = await ctx.runQuery(internalApi.queries.getEmbedding, {
            polymarketMarketId,
          });

          const needsEmbedding =
            !existingEmbedding || // No embedding exists
            !existingMarket || // Market is new
            existingMarket.title !== title || // Title changed
            existingMarket.description !== description; // Description changed

        // Generate embeddings (with timeout to avoid blocking)
        if (needsEmbedding) {
          try {
            // Generate embedding with timeout - but don't wait too long
            const embedding: number[] = await Promise.race([
              ctx.runAction(
                internalApi.actions.aiEmbed.embedText,
                { text: embeddingText }
              ),
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error("Embedding generation timeout after 20s")), 20000)
              )
            ]);

            // Upsert embedding
            await ctx.runMutation(internalApi.mutations.upsertEmbedding, {
              polymarketMarketId,
              vector: embedding,
              model: process.env.OPENROUTER_EMBED_MODEL || "openai/text-embedding-3-small",
              updatedAt: now,
            });
            embeddingCount++;
          } catch (embedError) {
            console.error(`[ingestMarkets] Failed to generate embedding for market ${polymarketMarketId}:`, embedError);
            // Continue without embedding - market is still saved
            // This allows us to process more markets even if some embeddings fail
          }
        }
        } catch (error) {
          console.error(`[ingestMarkets] Error processing market ${i} (${market.id || "unknown"}):`, error);
          // Continue with next market
        }
      }

      console.log(`[ingestMarkets] Completed: ${processedCount} markets processed, ${embeddingCount} embeddings generated, ${skippedCount} skipped`);
      if (Object.keys(skipReasons).length > 0) {
        console.log(`[ingestMarkets] Skip reasons:`, skipReasons);
      }

      // Return next cursor if available
      const nextCursor = gammaData.cursor || gammaData.nextCursor || null;
      const done = !nextCursor || markets.length < limit;

      console.log(`[ingestMarkets] Returning result: processed=${processedCount}, skipped=${skippedCount}, nextCursor=${nextCursor}, done=${done}`);

      return {
        processed: processedCount,
        nextCursor,
        done,
        skipped: skippedCount,
        skipReasons: Object.keys(skipReasons).length > 0 ? skipReasons : undefined,
      };
    } catch (error) {
      console.error(`[ingestMarkets] Fatal error:`, error);
      throw error;
    }
  },
});

/**
 * Refresh hot markets (markets that appeared in recent queries)
 */
export const refreshHotMarkets = action({
  args: {},
  handler: async (ctx): Promise<{ refreshed: number }> => {
    // Get last 50 queries
    const recentQueries: any[] = await ctx.runQuery(internalApi.queries.getRecentQueries, {
      limit: 50,
    });

    const marketIds = new Set<string>();
    for (const query of recentQueries) {
      if (query.bestMarketId) {
        marketIds.add(query.bestMarketId);
      }
    }

    // Refresh each hot market
    for (const marketId of marketIds) {
      try {
        const market: any = await ctx.runQuery(internalApi.queries.getMarket, {
          polymarketMarketId: marketId,
        });
        if (market) {
          // Re-fetch from Gamma and update
          // This is a simplified version - in production, you'd want to fetch by ID
          await ctx.runAction(internalApi.actions.ingestMarkets.ingestMarkets, {
            cursor: null,
            limit: 1,
          });
        }
      } catch (error) {
        console.error(`Error refreshing hot market ${marketId}:`, error);
      }
    }

    return { refreshed: marketIds.size };
  },
});
