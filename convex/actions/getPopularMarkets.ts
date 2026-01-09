"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

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
    bypassCache: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const offset = args.offset || 0;
    const bypassCache = args.bypassCache === true;
    const now = Date.now();
    
    try {
      let markets: any[] = [];

      // Prefer Gamma "popular" (short cache) to avoid multi-hour DB staleness.
      try {
        const gammaPopular = await ctx.runAction(internalApi.actions.polymarket.fetchPopularMarkets, {
          limit: (limit + offset) * 2,
          bypassCache,
        });

        const apiMarkets: any[] = Array.isArray(gammaPopular?.markets) ? gammaPopular.markets : [];
        markets = apiMarkets
          .map((market: any) => {
            const id =
              market.id ||
              market.marketId ||
              market.slug ||
              market.clobTokenIds?.[0] ||
              String(market._id || "");
            const question = market.question || market.title || "";

            if (!id || !question) return null;

            const endDateRaw = market.endDate || market.endDateISO || market.endDateIso || market.endDate_iso;
            const endDateMs = endDateRaw ? new Date(endDateRaw).getTime() : null;
            const hasEnded = typeof endDateMs === "number" && Number.isFinite(endDateMs) && endDateMs <= now;
            if (hasEnded) return null;

            const volume = market.volume || market.volumeUSD || market.usdVolume || market.totalVolume || 0;
            const volume24hr =
              market.volume24hr ??
              market.volume24hrClob ??
              market.volume_24hr ??
              market.volume_24h ??
              0;
            const liquidity =
              market.liquidity || market.totalLiquidity || market.usdLiquidity || market.totalLiquidityNum || 0;

            return {
              id,
              question,
              title: question,
              description: market.description || market.resolution || "",
              slug: market.slug,
              url:
                market.url ||
                (market.slug
                  ? `https://polymarket.com/event/${market.slug}`
                  : `https://polymarket.com/event/${id}`),
              volume24hr,
              volume,
              liquidity,
              endDate: market.endDate || market.endDateISO || market.endDate_iso || null,
              outcomes: market.outcomes || market.tokens || market.clobTokenIds || ["Yes", "No"],
              active: market.active !== false,
            };
          })
          .filter((m: any) => m !== null)
          .sort((a: any, b: any) => (b.volume24hr || 0) - (a.volume24hr || 0))
          .slice(offset, offset + limit);

        console.log(
          `[getPopularMarketsWithPrices] Using Gamma popular markets (${markets.length}) (offset: ${offset}, limit: ${limit}, bypassCache: ${bypassCache})`
        );
      } catch (gammaError: any) {
        console.warn(
          `[getPopularMarketsWithPrices] Gamma popular fetch failed, falling back to DB:`,
          gammaError?.message || gammaError
        );

        const dbMarkets = await ctx.runQuery(internalApi.queries.getPopularMarkets, {
          limit,
          offset,
        });

        console.log(
          `[getPopularMarketsWithPrices] Got ${dbMarkets.length} markets from database (offset: ${offset}, limit: ${limit})`
        );

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

            const realtimeIsFresh =
              realtimePrice &&
              typeof realtimePrice.lastUpdated === "number" &&
              realtimePrice.lastUpdated > now - 30 * 1000; // require ~live data

            if (realtimeIsFresh && realtimePrice.price !== null) {
              return {
                ...market,
                priceYes: realtimePrice.price,
                priceFetched: true,
                bid: realtimePrice.bid,
                ask: realtimePrice.ask,
                spread: realtimePrice.spread,
                source: "realtime",
                priceUpdatedAt: realtimePrice.lastUpdated,
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
                  source: priceData.source || "rest_api",
                  priceUpdatedAt: typeof priceData.timestamp === "number" ? priceData.timestamp : now,
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
      // If we used Gamma, assume there might be more when we returned a full page.
      // If we fell back to DB, do a cheap "is there one more?" check.
      if (sortedResults.length === limit) {
        hasMore = true;
      } else {
        try {
          const checkMarkets = await ctx.runQuery(internalApi.queries.getPopularMarkets, {
            limit: offset + limit + 1,
            offset: 0,
          });
          hasMore = checkMarkets.length > offset + limit;
        } catch {
          hasMore = false;
        }
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


