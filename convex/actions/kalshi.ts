"use node";

import { action, ActionCtx } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { retryWithBackoff } from "../utils";

const KALSHI_API_BASE = process.env.KALSHI_API_BASE || "https://api.kalshi.com/trade-api/v2";

// Type-safe internal API references
const internalApi = internal as {
  queries: {
    getCache: any;
  };
  mutations: {
    setCache: any;
    upsertKalshiMarket: any;
  };
  actions: {
    kalshi: { fetchKalshiMarkets: any; searchKalshiMarkets: any };
  };
};

interface KalshiMarket {
  ticker: string;
  title: string;
  subtitle: string | null;
  category: string;
  seriesTicker: string | null;
  openTime: number;
  closeTime: number | null;
  expiryTime: number | null;
  status: string;
  yesBid: number | null;
  yesAsk: number | null;
  noBid: number | null;
  noAsk: number | null;
  lastPrice: number | null;
  volume: number | null;
  liquidity: number | null;
  url: string;
}

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
 * Fetch markets from Kalshi API
 */
export const fetchKalshiMarkets = action({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(v.string()), // "open", "closed", etc.
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const limit = args.limit || 100;
      const cacheKey = `kalshi:markets:${args.status || "all"}:${args.category || "all"}:${limit}`;
      
      // Check cache (5 minutes TTL)
      const cached = await getCache(ctx, cacheKey);
      if (cached) {
        console.log(`[fetchKalshiMarkets] Returning cached data for ${cacheKey}`);
        return cached;
      }

      // Kalshi API endpoint for markets
      // Note: Kalshi API requires authentication for most endpoints
      // For public access, we'll use their public endpoints if available
      const url = `${KALSHI_API_BASE}/markets?limit=${limit}${args.status ? `&status=${args.status}` : ""}${args.category ? `&category=${args.category}` : ""}`;

      console.log(`[fetchKalshiMarkets] Fetching from ${url}`);

      const response = await retryWithBackoff(async () => {
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Kalshi API error: ${res.status} ${res.statusText} - ${errorText}`);
        }
        return res;
      });

      const data = await response.json();
      
      // Kalshi API structure may vary - adapt based on actual response
      let markets: KalshiMarket[] = [];
      
      if (Array.isArray(data)) {
        markets = data;
      } else if (data.events && Array.isArray(data.events)) {
        markets = data.events;
      } else if (data.markets && Array.isArray(data.markets)) {
        markets = data.markets;
      }

      console.log(`[fetchKalshiMarkets] Received ${markets.length} markets from API`);

      // Transform to our format
      const transformedMarkets: KalshiMarket[] = markets.map((market: any) => ({
        ticker: market.ticker || market.event_ticker || market.id,
        title: market.title || market.question || market.event_title,
        subtitle: market.subtitle || market.subtitle_text || null,
        category: market.category || market.category_name || "general",
        seriesTicker: market.series_ticker || null,
        openTime: market.open_time ? new Date(market.open_time).getTime() : Date.now(),
        closeTime: market.close_time ? new Date(market.close_time).getTime() : null,
        expiryTime: market.expiry_time ? new Date(market.expiry_time).getTime() : null,
        status: market.status || "open",
        yesBid: market.yes_bid || market.yes_bid_price || null,
        yesAsk: market.yes_ask || market.yes_ask_price || null,
        noBid: market.no_bid || market.no_bid_price || null,
        noAsk: market.no_ask || market.no_ask_price || null,
        lastPrice: market.last_price || market.current_price || null,
        volume: market.volume || market.total_volume || null,
        liquidity: market.liquidity || null,
        url: market.url || `https://kalshi.com/markets/${market.ticker || market.event_ticker || market.id}`,
      }));

      const result = {
        markets: transformedMarkets,
        fetchedAt: Date.now(),
      };

      // Cache for 5 minutes
      await setCache(ctx, cacheKey, result, 5 * 60 * 1000);

      return result;
    } catch (error) {
      console.error("[fetchKalshiMarkets] Error:", error);
      // Return empty result on error
      return {
        markets: [],
        fetchedAt: Date.now(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Search Kalshi markets by query
 */
export const searchKalshiMarkets = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const limit = args.limit || 20;
      const cacheKey = `kalshi:search:${args.query}:${limit}`;
      
      // Check cache (10 minutes TTL for searches)
      const cached = await getCache(ctx, cacheKey);
      if (cached) {
        console.log(`[searchKalshiMarkets] Returning cached data for ${cacheKey}`);
        return cached;
      }

      // Fetch all markets and filter by query
      // Note: Kalshi may have a search endpoint - adjust if available
      const marketsData = await ctx.runAction(internalApi.actions.kalshi.fetchKalshiMarkets, {
        limit: limit * 3, // Fetch more to filter
      });

      // Simple text matching (could be improved with embeddings)
      const queryLower = args.query.toLowerCase();
      const matchingMarkets = marketsData.markets
        .filter((market: KalshiMarket) => {
          const titleMatch = market.title.toLowerCase().includes(queryLower);
          const subtitleMatch = market.subtitle?.toLowerCase().includes(queryLower);
          return titleMatch || subtitleMatch;
        })
        .slice(0, limit);

      const result = {
        markets: matchingMarkets,
        query: args.query,
        fetchedAt: Date.now(),
      };

      // Cache for 10 minutes
      await setCache(ctx, cacheKey, result, 10 * 60 * 1000);

      return result;
    } catch (error) {
      console.error("[searchKalshiMarkets] Error:", error);
      return {
        markets: [],
        query: args.query,
        fetchedAt: Date.now(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

