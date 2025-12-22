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
    offset: v.optional(v.number()), // For pagination
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const offset = args.offset || 0;
    
    try {
      // First, try to get markets from database with proper pagination
      const dbMarkets = await ctx.runQuery(internalApi.queries.getPopularMarkets, {
        limit: limit,
        offset: offset,
      });
      
      console.log(`[getPopularMarketsWithPrices] Got ${dbMarkets.length} markets from database (offset: ${offset}, limit: ${limit})`);
      
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
        // Fallback to REST API if database is empty - bypass cache to get fresh data
        console.log(`[getPopularMarketsWithPrices] Database empty (${dbMarkets.length} markets), falling back to REST API`);
        try {
          // Fetch directly from Gamma API without cache when database is empty
          const POLYMARKET_GAMMA_BASE = process.env.POLYMARKET_GAMMA_BASE || "https://gamma-api.polymarket.com";
          const url = `${POLYMARKET_GAMMA_BASE}/markets?limit=${(limit + offset) * 2}&closed=false&active=true`;
          
          console.log(`[getPopularMarketsWithPrices] Fetching directly from ${url}`);
          
          const response = await fetch(url, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(15000),
          });
          
          if (!response.ok) {
            throw new Error(`Gamma API error: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          let apiMarkets = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
          
          console.log(`[getPopularMarketsWithPrices] Got ${apiMarkets.length} markets from Gamma API`);
          
          // Convert API format to our format
          markets = apiMarkets
            .map((market: any) => {
              const id = market.id || market.marketId || market.slug || market.clobTokenIds?.[0] || String(market._id || "");
              const question = market.question || market.title || market.outcomePrices?.[0]?.outcome || "";
              
              if (!id || !question) {
                return null;
              }
              
              const volume = market.volume || market.volumeUSD || market.usdVolume || market.totalVolume || 0;
              const liquidity = market.liquidity || market.totalLiquidity || market.usdLiquidity || 0;
              
              return {
                id,
                question,
                title: question,
                description: market.description || market.resolution || "",
                slug: market.slug,
                url: market.url || (market.slug ? `https://polymarket.com/event/${market.slug}` : `https://polymarket.com/event/${id}`),
                volume: volume,
                liquidity: liquidity,
                endDate: market.endDate || market.endDateISO || market.endDate_iso || null,
                outcomes: market.outcomes || market.tokens || market.clobTokenIds || ["Yes", "No"],
                active: market.active !== false,
              };
            })
            .filter((m: any) => m !== null)
            .sort((a: any, b: any) => (b.volume || 0) - (a.volume || 0))
            .slice(offset, offset + limit);
          
          console.log(`[getPopularMarketsWithPrices] After processing: ${markets.length} markets ready for price fetching`);
        } catch (apiError: any) {
          console.error(`[getPopularMarketsWithPrices] REST API fallback failed:`, apiError.message);
          return {
            markets: [],
            fetchedAt: Date.now(),
            error: `No markets available. API error: ${apiError.message}`,
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
      // Markets are already paginated from the query
      const marketsToFetch = markets;
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
      
      // Check if there are more markets
      let hasMore = false;
      if (dbMarkets.length > 0) {
        // If we got markets from database, check if there are more
        const checkMarkets = await ctx.runQuery(internalApi.queries.getPopularMarkets, {
          limit: offset + limit + 1,
          offset: 0,
        });
        hasMore = checkMarkets.length > offset + limit;
      } else {
        // If we used API fallback, assume there might be more (API typically has many markets)
        hasMore = sortedResults.length === limit;
      }
      
      console.log(`[getPopularMarketsWithPrices] hasMore=${hasMore} (offset=${offset}, limit=${limit}, returned=${sortedResults.length})`);
      
      return {
        markets: sortedResults,
        fetchedAt: Date.now(),
        hasMore,
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


