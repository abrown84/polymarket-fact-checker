"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { ClobClient } from "@polymarket/clob-client";

const POLYMARKET_GAMMA_BASE = process.env.POLYMARKET_GAMMA_BASE || "https://gamma-api.polymarket.com";
const POLYMARKET_CLOB_BASE = "https://clob.polymarket.com";

const internalApi = internal as {
  queries: {
    getPopularMarkets: any;
    getRealtimePrice: any;
  };
  actions: {
    polymarket: { fetchPopularMarkets: any; fetchClobLastPrice: any };
  };
};

/**
 * Get popular markets from database with live prices from WebSocket
 * Falls back to REST API if database is empty or WebSocket prices unavailable
 */
export const getPopularMarketsWithPrices = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    try {
      // First, try to get markets from database
      const dbMarkets = await ctx.runQuery(internalApi.queries.getPopularMarkets, {
        limit: limit * 2, // Get more to filter by price availability
      });
      
      console.log(`[getPopularMarketsWithPrices] Got ${dbMarkets.length} markets from database`);
      
      let markets: any[] = [];
      
      if (dbMarkets.length > 0) {
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
        // Fallback to REST API if database is empty
        console.log(`[getPopularMarketsWithPrices] Database empty, falling back to REST API`);
        try {
          const apiResult = await ctx.runAction(internalApi.actions.polymarket.fetchPopularMarkets, {
            limit: limit * 2,
          });
          markets = apiResult.markets || [];
          console.log(`[getPopularMarketsWithPrices] Got ${markets.length} markets from REST API`);
        } catch (apiError: any) {
          console.error(`[getPopularMarketsWithPrices] REST API fallback failed:`, apiError.message);
          return {
            markets: [],
            fetchedAt: Date.now(),
            error: "No markets available from database or API",
          };
        }
      }
      
      if (markets.length === 0) {
        console.warn(`[getPopularMarketsWithPrices] No markets available`);
        return {
          markets: [],
          fetchedAt: Date.now(),
        };
      }
      
      // Get prices from WebSocket real-time data, with REST API fallback
      const marketsToFetch = markets.slice(0, limit);
      const marketsWithPrices = await Promise.allSettled(
        marketsToFetch.map(async (market: any) => {
          try {
            // First, try WebSocket real-time price from database
            const realtimePrice = await ctx.runQuery(internalApi.queries.getRealtimePrice, {
              marketId: market.id,
            });

            if (realtimePrice && realtimePrice.price !== null) {
              return {
                ...market,
                priceYes: realtimePrice.price,
                priceFetched: true,
                bid: realtimePrice.bid,
                ask: realtimePrice.ask,
                spread: realtimePrice.spread,
                volume: realtimePrice.volume,
                source: "realtime",
              };
            }

            // Fallback to REST API for price if WebSocket data not available
            console.log(`[getPopularMarketsWithPrices] No WebSocket price for ${market.id}, trying REST API`);
            try {
              const priceData = await ctx.runAction(internalApi.actions.polymarket.fetchClobLastPrice, {
                marketId: market.id,
                tokenId: null,
              });

              if (priceData && priceData.price !== null) {
                return {
                  ...market,
                  priceYes: priceData.price,
                  priceFetched: true,
                  bid: priceData.bid,
                  ask: priceData.ask,
                  spread: priceData.spread,
                  volume: priceData.volume,
                  source: priceData.source || "rest_api",
                };
              }
            } catch (priceError: any) {
              console.log(`[getPopularMarketsWithPrices] REST API price fetch failed for ${market.id}:`, priceError.message);
            }

            // No price data available
            return {
              ...market,
              priceYes: null,
              priceFetched: false,
              bid: null,
              ask: null,
              spread: null,
              source: "none",
            };
          } catch (error: any) {
            console.log(`[getPopularMarketsWithPrices] Error getting price for market ${market.id}:`, error.message);
            return {
              ...market,
              priceYes: null,
              priceFetched: false,
              source: "error",
            };
          }
        })
      );

      // Extract successful results
      const results = marketsWithPrices
        .filter((result) => result.status === "fulfilled")
        .map((result) => (result as PromiseFulfilledResult<any>).value)
        .filter((m: any) => m !== null && m.id && m.question); // Ensure we have required fields

      // Sort by price availability and volume
      const sortedResults = results.sort((a: any, b: any) => {
        // Prioritize markets with prices
        if (a.priceFetched !== b.priceFetched) {
          return b.priceFetched ? 1 : -1;
        }
        // Then by volume
        return (b.volume || 0) - (a.volume || 0);
      });

      console.log(`[getPopularMarketsWithPrices] Returning ${sortedResults.length} markets (${sortedResults.filter((m: any) => m.priceFetched).length} with prices)`);
      return {
        markets: sortedResults.slice(0, limit),
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


