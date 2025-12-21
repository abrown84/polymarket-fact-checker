"use node";

import { action, ActionCtx } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { retryWithBackoff } from "../utils";

const POLYMARKET_GAMMA_BASE =
  process.env.POLYMARKET_GAMMA_BASE || "https://gamma-api.polymarket.com";
const POLYMARKET_CLOB_BASE =
  process.env.POLYMARKET_CLOB_BASE || "https://clob.polymarket.com";

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

      const limit = args.limit || 100;
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
      
      await setCache(ctx, cacheKey, responseData, GAMMA_MARKETS_TTL);
      return responseData;
    } catch (error) {
      console.error(`[fetchGammaMarkets] Error:`, error);
      throw error;
    }
  },
});

/**
 * Fetch order book from CLOB API
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

    const cacheKey = `clob:book:${identifier}`;
    const cached = await getCache(ctx, cacheKey);
    if (cached) {
      return cached;
    }

    // Try marketId first, then tokenId
    const url = args.marketId
      ? `${POLYMARKET_CLOB_BASE}/book?market=${args.marketId}`
      : `${POLYMARKET_CLOB_BASE}/book?token_id=${args.tokenId}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000), // 5s timeout
      });
      
      // 400 errors are client errors (invalid market ID) - don't retry, just return null
      if (response.status === 400) {
        console.log(`[fetchClobBook] Market ${identifier} not found or invalid (400)`);
        return null;
      }
      
      if (!response.ok) {
        // For other errors, use retry logic
        const responseWithRetry = await retryWithBackoff(async () => {
          const res = await fetch(url, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(5000),
          });
          if (!res.ok && res.status !== 400) {
            throw new Error(`CLOB API error: ${res.status} ${res.statusText}`);
          }
          return res;
        });
        
        if (!responseWithRetry.ok) {
          return null;
        }
        
        const data = await responseWithRetry.json();
        await setCache(ctx, cacheKey, data, CLOB_BOOK_TTL);
        return data;
      }

      const data = await response.json();
      await setCache(ctx, cacheKey, data, CLOB_BOOK_TTL);
      return data;
    } catch (error: any) {
      // Network errors or timeouts - log but don't throw
      if (error.message?.includes("400")) {
        console.log(`[fetchClobBook] Market ${identifier} invalid or not found`);
        return null;
      }
      console.log(`[fetchClobBook] Error fetching book for ${identifier}:`, error.message);
      return null;
    }
  },
});

/**
 * Fetch last price from CLOB API
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

    const cacheKey = `clob:price:${identifier}`;
    const cached = await getCache(ctx, cacheKey);
    if (cached) {
      return cached;
    }

    const url = args.marketId
      ? `${POLYMARKET_CLOB_BASE}/price?market=${args.marketId}`
      : `${POLYMARKET_CLOB_BASE}/price?token_id=${args.tokenId}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000),
      });
      
      // 400 errors are client errors (invalid market ID) - don't retry, just return null
      if (response.status === 400) {
        console.log(`[fetchClobLastPrice] Market ${identifier} not found or invalid (400)`);
        return null;
      }
      
      if (!response.ok) {
        // For other errors, use retry logic
        const responseWithRetry = await retryWithBackoff(async () => {
          const res = await fetch(url, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(5000),
          });
          if (!res.ok && res.status !== 400) {
            throw new Error(`CLOB API error: ${res.status} ${res.statusText}`);
          }
          return res;
        });
        
        if (!responseWithRetry.ok) {
          return null;
        }
        
        const data = await responseWithRetry.json();
        await setCache(ctx, cacheKey, data, CLOB_PRICE_TTL);
        return data;
      }

      const data = await response.json();
      await setCache(ctx, cacheKey, data, CLOB_PRICE_TTL);
      return data;
    } catch (error: any) {
      // Network errors or timeouts - log but don't throw
      if (error.message?.includes("400")) {
        console.log(`[fetchClobLastPrice] Market ${identifier} invalid or not found`);
        return null;
      }
      console.log(`[fetchClobLastPrice] Error fetching price for ${identifier}:`, error.message);
      return null;
    }
  },
});

/**
 * Fetch recent trades from CLOB API (optional)
 */
export const fetchRecentTrades = action({
  args: {
    marketId: v.union(v.string(), v.null()),
    tokenId: v.union(v.string(), v.null()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identifier = args.marketId || args.tokenId;
    if (!identifier) {
      return [];
    }

    const cacheKey = `clob:trades:${identifier}:${args.limit || 10}`;
    const cached = await getCache(ctx, cacheKey);
    if (cached) {
      return cached;
    }

    const limit = args.limit || 10;
    const url = args.marketId
      ? `${POLYMARKET_CLOB_BASE}/trades?market=${args.marketId}&limit=${limit}`
      : `${POLYMARKET_CLOB_BASE}/trades?token_id=${args.tokenId}&limit=${limit}`;

    try {
      const response = await retryWithBackoff(async () => {
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
          throw new Error(`CLOB API error: ${res.status} ${res.statusText}`);
        }
        return res;
      });

      const data = await response.json();
      await setCache(ctx, cacheKey, data, CLOB_TRADES_TTL);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      // If trades endpoint doesn't exist or fails, return empty array
      console.warn("Failed to fetch trades:", error);
      return [];
    }
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

      // Cache for 5 minutes
      await setCache(ctx, cacheKey, result, 5 * 60 * 1000);
      
      console.log(`[fetchPopularMarkets] Returned ${markets.length} popular markets`);
      return result;
    } catch (error) {
      console.error(`[fetchPopularMarkets] Error:`, error);
      throw error;
    }
  },
});
