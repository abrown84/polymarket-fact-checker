"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const internalApi = internal as {
  queries: {
    getPopularMarkets: any;
  };
  actions: {
    polymarket: { fetchPopularMarkets: any; fetchClobLastPrice: any };
  };
};

/**
 * Get popular markets from database with live prices
 */
export const getPopularMarketsWithPrices = action({
  args: {
    limit: v.optional(v.number()),
    useDatabase: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const useDatabase = args.useDatabase !== false; // Default to true
    
    try {
      let markets: any[] = [];
      
      if (useDatabase) {
        // Get markets from database
        const dbMarkets = await ctx.runQuery(internalApi.queries.getPopularMarkets, {
          limit: limit * 2, // Get more to filter by price availability
        });
        
        console.log(`[getPopularMarketsWithPrices] Got ${dbMarkets.length} markets from database`);
        
        // Convert database format to API-like format for consistency
        markets = dbMarkets.map((market: any) => ({
          id: market.polymarketMarketId,
          question: market.title,
          description: market.description,
          slug: market.slug,
          url: market.url,
          volume: market.volume || 0,
          liquidity: market.liquidity || 0,
          endDate: market.endDate ? new Date(market.endDate).toISOString() : null,
          outcomes: market.outcomes || ["Yes", "No"],
          active: true,
        }));
      } else {
        // Fallback to API if database is empty or useDatabase is false
        const popularData = await ctx.runAction(internalApi.actions.polymarket.fetchPopularMarkets, {
          limit: limit * 2,
        });
        markets = popularData.markets || [];
        console.log(`[getPopularMarketsWithPrices] Got ${markets.length} markets from API`);
      }
      
      if (markets.length === 0) {
        console.warn(`[getPopularMarketsWithPrices] No markets available`);
        return {
          markets: [],
          fetchedAt: Date.now(),
        };
      }
      
      // Fetch prices for each market (with limited concurrency)
      // Limit to first 10 to avoid too many API calls
      const marketsToFetch = markets.slice(0, limit);
      const marketsWithPrices = await Promise.allSettled(
        marketsToFetch.map(async (market: any) => {
          try {
            const priceData = await ctx.runAction(
              internalApi.actions.polymarket.fetchClobLastPrice,
              {
                marketId: market.id,
                tokenId: null,
              }
            );

            // fetchClobLastPrice now returns null for invalid markets instead of throwing
            // Only log if it's an unexpected error
            if (priceData === null) {
              // Market ID is invalid/old - this is expected for some markets
              // Don't log as error, just skip price
            }

            return {
              ...market,
              priceYes: priceData?.price || null,
              priceFetched: !!priceData,
            };
          } catch (error: any) {
            // Only log unexpected errors (not 400s which are handled gracefully now)
            if (!error.message?.includes("400")) {
              console.log(`[getPopularMarketsWithPrices] Unexpected error for market ${market.id}:`, error.message);
            }
            return {
              ...market,
              priceYes: null,
              priceFetched: false,
            };
          }
        })
      );

      // Extract successful results
      const results = marketsWithPrices
        .filter((result) => result.status === "fulfilled")
        .map((result) => (result as PromiseFulfilledResult<any>).value)
        .filter((m: any) => m !== null && m.id && m.question); // Ensure we have required fields

      console.log(`[getPopularMarketsWithPrices] Returning ${results.length} markets with prices`);
      return {
        markets: results,
        fetchedAt: Date.now(),
      };
    } catch (error: any) {
      console.error(`[getPopularMarketsWithPrices] Error:`, error);
      return {
        markets: [],
        fetchedAt: Date.now(),
        error: error.message,
      };
    }
  },
});


