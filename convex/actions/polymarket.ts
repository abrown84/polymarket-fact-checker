"use node";

import { action, ActionCtx } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { retryWithBackoff } from "../utils";
import { ClobClient } from "@polymarket/clob-client";

const POLYMARKET_GAMMA_BASE =
  process.env.POLYMARKET_GAMMA_BASE || "https://gamma-api.polymarket.com";
const POLYMARKET_CLOB_BASE = "https://clob.polymarket.com";

// Cache TTLs (in milliseconds)
const GAMMA_MARKETS_TTL = 6 * 60 * 60 * 1000; // 6 hours
const CLOB_BOOK_TTL = 30 * 1000; // 30 seconds
const CLOB_PRICE_TTL = 30 * 1000; // 30 seconds
const CLOB_TRADES_TTL = 2 * 60 * 1000; // 2 minutes

// Type-safe internal API references
const internalApi = internal as {
  queries: {
    getCache: any;
    getMarket: any;
    getAllEmbeddings: any;
    getRecentQueries: any;
    getRealtimePrice: any;
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
 * Fetch markets from Gamma API
 */
export const fetchGammaMarkets = action({
  args: {
    cursor: v.union(v.string(), v.null()),
    limit: v.optional(v.number()),
    bypassCache: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      const cacheKey = `gamma:markets:${args.cursor || "initial"}`;
      const shouldBypassCache = args.bypassCache === true;
      
      console.log(`[fetchGammaMarkets] bypassCache parameter: ${args.bypassCache}, type: ${typeof args.bypassCache}, shouldBypass: ${shouldBypassCache}`);
      
      // Check cache only if bypassCache is not true
      if (!shouldBypassCache) {
        const cached = await getCache(ctx, cacheKey);
        if (cached) {
          console.log(`[fetchGammaMarkets] Returning cached data for ${cacheKey}`);
          return cached;
        }
        console.log(`[fetchGammaMarkets] No cached data found for ${cacheKey}, fetching from API`);
      } else {
        console.log(`[fetchGammaMarkets] Bypassing cache as requested`);
      }

      const limit = args.limit || 1000; // Increased from 100 to fetch more markets per request
      // Use the endpoint that filters for active markets at the API level
      // This is more efficient than fetching all markets and filtering client-side
      // Based on endpoint testing: /markets?closed=false returns only active markets
      const url = `${POLYMARKET_GAMMA_BASE}/markets?limit=${limit}&closed=false&active=true${
        args.cursor ? `&cursor=${args.cursor}` : ""
      }`;

      console.log(`[fetchGammaMarkets] Fetching from ${url}`);
      
      const response = await retryWithBackoff(async () => {
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(15000), // 15s timeout
        });
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Gamma API error: ${res.status} ${res.statusText} - ${errorText}`);
        }
        return res;
      });

      const data = await response.json();
      console.log(`[fetchGammaMarkets] Received response. Type:`, typeof data, `Is array:`, Array.isArray(data));
      
      // The API returns a direct array, not an object with a data property
      // Wrap it in the expected format for consistency
      let responseData: any;
      if (Array.isArray(data)) {
        console.log(`[fetchGammaMarkets] Response is direct array with ${data.length} markets`);
        responseData = {
          data: data,
          cursor: null, // API doesn't seem to return cursor in this format
        };
      } else if (data.data && Array.isArray(data.data)) {
        console.log(`[fetchGammaMarkets] Response has data.data array with ${data.data.length} markets`);
        responseData = data;
      } else {
        console.log(`[fetchGammaMarkets] Unexpected response format. Keys:`, Object.keys(data));
        // Try to find any array in the response
        for (const key of Object.keys(data)) {
          if (Array.isArray(data[key])) {
            console.log(`[fetchGammaMarkets] Found array in key '${key}' with ${data[key].length} items`);
            responseData = {
              data: data[key],
              cursor: data.cursor || null,
            };
            break;
          }
        }
        if (!responseData) {
          throw new Error(`Unexpected API response format. Response keys: ${Object.keys(data).join(", ")}`);
        }
      }
      
      console.log(`[fetchGammaMarkets] Processed ${Array.isArray(responseData.data) ? responseData.data.length : 0} markets`);
      
      // Only cache if response is small enough (under 800KB to be safe)
      // Large responses (like 1000 markets) can exceed Convex's 1 MiB limit
      const responseSize = JSON.stringify(responseData).length;
      const maxCacheSize = 800 * 1024; // 800KB
      
      if (responseSize < maxCacheSize) {
        await setCache(ctx, cacheKey, responseData, GAMMA_MARKETS_TTL);
      } else {
        console.log(`[fetchGammaMarkets] Response too large (${(responseSize / 1024).toFixed(2)}KB), skipping cache`);
      }
      
      return responseData;
    } catch (error) {
      console.error(`[fetchGammaMarkets] Error:`, error);
      throw error;
    }
  },
});

/**
 * Fetch order book using CLOB client (REST API) with WebSocket fallback
 */
export const fetchClobBook = action({
  args: {
    marketId: v.union(v.string(), v.null()),
    tokenId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const identifier = args.marketId || args.tokenId;
    if (!identifier) {
      throw new Error("Either marketId or tokenId must be provided");
    }

    // First, try WebSocket real-time data
    if (args.marketId) {
      try {
        const realtimePrice = await ctx.runQuery(internalApi.queries.getRealtimePrice, {
          marketId: args.marketId,
        });

        if (realtimePrice) {
          // Construct minimal order book from bid/ask
          const bids = realtimePrice.bid !== null ? [{ price: realtimePrice.bid, size: 1 }] : [];
          const asks = realtimePrice.ask !== null ? [{ price: realtimePrice.ask, size: 1 }] : [];

          return {
            bids,
            asks,
            spread: realtimePrice.spread,
            source: "realtime",
            timestamp: realtimePrice.lastUpdated,
          };
        }
      } catch (error) {
        console.log(`[fetchClobBook] Real-time data not available, trying CLOB client`);
      }
    }

    // Fallback to CLOB client REST API
    try {
      const clobClient = new ClobClient(POLYMARKET_CLOB_BASE, 137);
      const tokenIdToUse = args.tokenId || args.marketId;
      
      if (tokenIdToUse) {
        const orderBook = await clobClient.getOrderBook(tokenIdToUse);
        
        // Calculate spread from best bid and ask
        const bids = orderBook?.bids || [];
        const asks = orderBook?.asks || [];
        let spread: number | null = null;
        
        if (bids.length > 0 && asks.length > 0) {
          const bestBidPrice = bids[0]?.price;
          const bestAskPrice = asks[0]?.price;
          const bestBid = typeof bestBidPrice === 'string' ? parseFloat(bestBidPrice) : (bestBidPrice || 0);
          const bestAsk = typeof bestAskPrice === 'string' ? parseFloat(bestAskPrice) : (bestAskPrice || 0);
          
          if (bestBid > 0 && bestAsk > 0 && !isNaN(bestBid) && !isNaN(bestAsk)) {
            spread = bestAsk - bestBid;
          }
        }
        
        return {
          bids,
          asks,
          spread,
          source: "clob_client",
          timestamp: Date.now(),
        };
      }
    } catch (error: any) {
      // 404 errors are expected when orderbooks don't exist yet - don't log as errors
      const is404 = error?.status === 404 || error?.response?.status === 404 || 
                    error?.message?.includes('404') || error?.message?.includes('No orderbook');
      
      if (!is404) {
        // Only log non-404 errors
        console.log(`[fetchClobBook] CLOB client error for ${identifier}:`, error.message);
      }
      // Silently handle 404s - it's normal for markets to not have orderbooks yet
    }

    // No data available
    console.log(`[fetchClobBook] No order book data available for ${identifier}`);
    return null;
  },
});

/**
 * Fetch last price using CLOB client (REST API) with WebSocket fallback
 */
export const fetchClobLastPrice = action({
  args: {
    marketId: v.union(v.string(), v.null()),
    tokenId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const identifier = args.marketId || args.tokenId;
    if (!identifier) {
      throw new Error("Either marketId or tokenId must be provided");
    }

    // First, try WebSocket real-time data
    if (args.marketId) {
      try {
        const realtimePrice = await ctx.runQuery(internalApi.queries.getRealtimePrice, {
          marketId: args.marketId,
        });

        if (realtimePrice && realtimePrice.price !== null) {
          console.log(`[fetchClobLastPrice] Using real-time price for ${identifier}: ${realtimePrice.price}`);
          return {
            price: realtimePrice.price,
            bid: realtimePrice.bid,
            ask: realtimePrice.ask,
            spread: realtimePrice.spread,
            volume: realtimePrice.volume,
            source: "realtime",
            timestamp: realtimePrice.lastUpdated,
          };
        }
      } catch (error) {
        console.log(`[fetchClobLastPrice] Real-time price not available, trying CLOB client`);
      }
    }

    // Fallback to CLOB client REST API - use order book instead of price endpoint
    try {
      const clobClient = new ClobClient(POLYMARKET_CLOB_BASE, 137); // 137 = Polygon chain ID
      const tokenIdToUse = args.tokenId || args.marketId;
      
      if (tokenIdToUse) {
        // Use order book to get bid/ask prices (more reliable than price endpoint)
        const orderBook = await clobClient.getOrderBook(tokenIdToUse);
        
        if (orderBook && (orderBook.bids?.length > 0 || orderBook.asks?.length > 0)) {
          // Get best bid and ask
          const bids = orderBook.bids || [];
          const asks = orderBook.asks || [];
          
          const bestBidPrice = bids.length > 0 ? (typeof bids[0]?.price === 'string' ? parseFloat(bids[0].price) : (bids[0]?.price || 0)) : null;
          const bestAskPrice = asks.length > 0 ? (typeof asks[0]?.price === 'string' ? parseFloat(asks[0].price) : (asks[0]?.price || 0)) : null;
          
          // Calculate mid price from bid/ask
          let price: number | null = null;
          if (bestBidPrice !== null && bestAskPrice !== null && bestBidPrice > 0 && bestAskPrice > 0) {
            price = (bestBidPrice + bestAskPrice) / 2;
          } else if (bestBidPrice !== null && bestBidPrice > 0) {
            price = bestBidPrice;
          } else if (bestAskPrice !== null && bestAskPrice > 0) {
            price = bestAskPrice;
          }
          
          const spread = (bestBidPrice !== null && bestAskPrice !== null && bestBidPrice > 0 && bestAskPrice > 0)
            ? bestAskPrice - bestBidPrice
            : null;
          
          return {
            price,
            bid: bestBidPrice,
            ask: bestAskPrice,
            spread,
            source: "clob_client",
            timestamp: Date.now(),
          };
        }
      }
    } catch (error: any) {
      // 404 errors are expected when orderbooks don't exist yet - don't log as errors
      const is404 = error?.status === 404 || error?.response?.status === 404 || 
                    error?.message?.includes('404') || error?.message?.includes('No orderbook');
      
      if (!is404) {
        // Only log non-404 errors
        console.log(`[fetchClobLastPrice] CLOB client error for ${identifier}:`, error.message);
      }
      // Silently handle 404s - it's normal for markets to not have orderbooks yet
    }

    // No data available (this is normal for markets without orderbooks)
    // Don't log - it's expected behavior, not an error
    return null;
  },
});

/**
 * Fetch recent trades - Not available via WebSocket
 * Returns empty array as trades are not provided by WebSocket API
 */
export const fetchRecentTrades = action({
  args: {
    marketId: v.union(v.string(), v.null()),
    tokenId: v.union(v.string(), v.null()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // WebSocket doesn't provide trade history
    // Return empty array
    return [];
  },
});

/**
 * Fetch popular/trending markets from Gamma API
 * Sorted by volume or other popularity metrics
 */
export const fetchPopularMarkets = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const limit = args.limit || 50;
      const cacheKey = `gamma:popular:${limit}`;
      const cached = await getCache(ctx, cacheKey);
      
      // Cache for 5 minutes for popular markets (more frequent updates)
      if (cached) {
        console.log(`[fetchPopularMarkets] Returning cached data for ${cacheKey}`);
        return cached;
      }

      // Fetch markets from Gamma API
      const url = `${POLYMARKET_GAMMA_BASE}/markets?limit=${limit * 2}`; // Fetch more to filter
      
      console.log(`[fetchPopularMarkets] Fetching from ${url}`);
      
      const response = await retryWithBackoff(async () => {
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Gamma API error: ${res.status} ${res.statusText} - ${errorText}`);
        }
        return res;
      });

      const data = await response.json();
      let markets = Array.isArray(data.data) ? data.data : [];

      console.log(`[fetchPopularMarkets] Received ${markets.length} markets from API`);
      
      if (markets.length === 0) {
        console.warn(`[fetchPopularMarkets] No markets in API response`);
        return {
          markets: [],
          fetchedAt: Date.now(),
        };
      }

      // Log first market structure for debugging
      if (markets.length > 0) {
        console.log(`[fetchPopularMarkets] Sample market structure:`, JSON.stringify(markets[0], null, 2).substring(0, 500));
      }

      // Sort and filter markets
      // Try to sort by volume/liquidity if available, otherwise just return markets in order
      markets = markets
        .map((market: any) => {
          // Extract volume and liquidity from various possible field names
          const volume = market.volume || market.volumeUSD || market.usdVolume || market.totalVolume || 0;
          const liquidity = market.liquidity || market.totalLiquidity || market.usdLiquidity || 0;
          
          return {
            ...market,
            _volume: volume,
            _liquidity: liquidity,
          };
        })
        .sort((a: any, b: any) => {
          // Sort by volume first, then liquidity
          if (b._volume !== a._volume) {
            return b._volume - a._volume;
          }
          return b._liquidity - a._liquidity;
        })
        .slice(0, limit)
        .map((market: any) => {
          const id = market.id || market.marketId || market.slug || market.clobTokenIds?.[0] || String(market._id || "");
          const question = market.question || market.title || market.outcomePrices?.[0]?.outcome || "";
          
          if (!id || !question) {
            console.warn(`[fetchPopularMarkets] Skipping market with missing id or question:`, { id, question });
            return null;
          }

          return {
            id,
            question,
            description: market.description || market.resolution || "",
            slug: market.slug,
            url: market.url || (market.slug ? `https://polymarket.com/event/${market.slug}` : `https://polymarket.com/event/${id}`),
            volume: market._volume || 0,
            liquidity: market._liquidity || 0,
            endDate: market.endDate || market.endDateISO || market.endDate_iso || null,
            outcomes: market.outcomes || market.tokens || market.clobTokenIds || ["Yes", "No"],
            active: market.active !== false,
          };
        })
        .filter((m: any) => m !== null); // Remove null entries

      const result = {
        markets,
        fetchedAt: Date.now(),
      };

      // Only cache if response is small enough (under 800KB to be safe)
      const cacheSize = JSON.stringify(result).length;
      const maxCacheSize = 800 * 1024; // 800KB
      
      if (cacheSize < maxCacheSize) {
        await setCache(ctx, cacheKey, result, 5 * 60 * 1000); // 5 minutes
      } else {
        console.log(`[fetchPopularMarkets] Response too large (${(cacheSize / 1024).toFixed(2)}KB), skipping cache`);
      }
      
      console.log(`[fetchPopularMarkets] Returned ${markets.length} popular markets`);
      return result;
    } catch (error) {
      console.error(`[fetchPopularMarkets] Error:`, error);
      throw error;
    }
  },
});
