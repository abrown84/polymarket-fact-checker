import { query } from "./_generated/server";
import { v } from "convex/values";

export const getCache = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("cache")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    return cached;
  },
});

export const getMarket = query({
  args: { polymarketMarketId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("markets")
      .withIndex("by_polymarket_market_id", (q) =>
        q.eq("polymarketMarketId", args.polymarketMarketId)
      )
      .first();
  },
});

export const getAllEmbeddings = query({
  args: {},
  handler: async (ctx) => {
    const embeddings = await ctx.db.query("embeddings").collect();
    return embeddings;
  },
});

export const getEmbedding = query({
  args: { polymarketMarketId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("embeddings")
      .withIndex("by_polymarket_market_id", (q) =>
        q.eq("polymarketMarketId", args.polymarketMarketId)
      )
      .first();
  },
});

export const getRecentQueries = query({
  args: { 
    limit: v.optional(v.number()),
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    // Get all queries and sort them
    let allQueries = await ctx.db
      .query("queriesLog")
      .withIndex("by_created_at")
      .order("desc")
      .collect();
    
    // If cursor is provided, filter to only queries before that time
    if (args.cursor) {
      const cursorTime = parseInt(args.cursor);
      allQueries = allQueries.filter((q) => q.createdAt < cursorTime);
    }
    
    // Take the limit
    const queries = allQueries.slice(0, limit);
    
    return {
      queries,
      nextCursor: queries.length === limit && queries.length > 0 
        ? queries[queries.length - 1].createdAt.toString()
        : null,
    };
  },
});

export const getPopularMarkets = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const offset = args.offset || 0;
    
    // Get all markets
    const allMarkets = await ctx.db.query("markets").collect();
    
    console.log(`[getPopularMarkets] Total markets in database: ${allMarkets.length}`);
    
    // Sort by popularity (volume/liquidity) or by most recently ingested
    const sortedMarkets = allMarkets
      .sort((a, b) => {
        // First, prioritize markets with volume or liquidity
        const hasVolumeA = (a.volume && a.volume > 0) || (a.liquidity && a.liquidity > 0);
        const hasVolumeB = (b.volume && b.volume > 0) || (b.liquidity && b.liquidity > 0);
        
        if (hasVolumeA && !hasVolumeB) return -1;
        if (!hasVolumeA && hasVolumeB) return 1;
        
        // If both have volume/liquidity or both don't, sort by volume first, then liquidity
        const volumeA = a.volume || 0;
        const volumeB = b.volume || 0;
        if (volumeB !== volumeA) {
          return volumeB - volumeA;
        }
        const liquidityA = a.liquidity || 0;
        const liquidityB = b.liquidity || 0;
        if (liquidityB !== liquidityA) {
          return liquidityB - liquidityA;
        }
        // If no volume/liquidity difference, sort by most recently ingested
        return (b.lastIngestedAt || 0) - (a.lastIngestedAt || 0);
      });

    // Apply pagination
    const popularMarkets = sortedMarkets.slice(offset, offset + limit);

    console.log(`[getPopularMarkets] Returning ${popularMarkets.length} markets (offset: ${offset}, limit: ${limit})`);
    return popularMarkets;
  },
});

/**
 * Get markets expiring on a specific date (within a day range)
 */
export const getMarketsByEndDate = query({
  args: {
    targetDate: v.number(), // Timestamp for the target date
    dayRange: v.optional(v.number()), // Range in days (default: 1 day)
  },
  handler: async (ctx, args) => {
    const dayRange = args.dayRange || 1;
    const targetDate = args.targetDate;
    
    // Calculate start and end of the day range
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const startTimestamp = startOfDay.getTime();
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    endOfDay.setDate(endOfDay.getDate() + (dayRange - 1));
    const endTimestamp = endOfDay.getTime();
    
    console.log(`[getMarketsByEndDate] Looking for markets between ${new Date(startTimestamp).toISOString()} and ${new Date(endTimestamp).toISOString()}`);
    
    // Get all markets and filter by endDate
    const allMarkets = await ctx.db.query("markets").collect();
    
    const expiringMarkets = allMarkets
      .filter((market) => {
        if (!market.endDate) return false;
        return market.endDate >= startTimestamp && market.endDate <= endTimestamp;
      })
      .sort((a, b) => {
        // Sort by endDate (soonest first), then by volume
        if (a.endDate && b.endDate && a.endDate !== b.endDate) {
          return a.endDate - b.endDate;
        }
        const volumeA = a.volume || 0;
        const volumeB = b.volume || 0;
        return volumeB - volumeA;
      });
    
    console.log(`[getMarketsByEndDate] Found ${expiringMarkets.length} markets expiring in range`);
    return expiringMarkets;
  },
});

export const getAllMarkets = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("markets").collect();
  },
});

export const getRealtimePrice = query({
  args: {
    marketId: v.string(),
  },
  handler: async (ctx, args) => {
    const price = await ctx.db
      .query("realtimePrices")
      .withIndex("by_market_id", (q) => q.eq("marketId", args.marketId))
      .first();
    
    // Only return if updated within last 5 minutes (real-time data should be fresh)
    if (price && price.lastUpdated > Date.now() - 5 * 60 * 1000) {
      return price;
    }
    return null;
  },
});

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    // Get total markets count
    const allMarkets = await ctx.db.query("markets").collect();
    const totalMarkets = allMarkets.length;

    // Get total embeddings count
    const allEmbeddings = await ctx.db.query("embeddings").collect();
    const totalEmbeddings = allEmbeddings.length;

    // Get total queries count
    const allQueries = await ctx.db.query("queriesLog").collect();
    const totalQueries = allQueries.length;

    // Get queries from last 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentQueries = allQueries.filter((q) => q.createdAt > oneDayAgo);
    const queriesLast24h = recentQueries.length;

    // Get average confidence
    const queriesWithConfidence = allQueries.filter((q) => q.confidence !== null && q.confidence !== undefined);
    const avgConfidence = queriesWithConfidence.length > 0
      ? queriesWithConfidence.reduce((sum, q) => sum + (q.confidence || 0), 0) / queriesWithConfidence.length
      : null;

    // Get markets with recent ingestion (last 6 hours)
    const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
    const recentlyIngested = allMarkets.filter((m) => m.lastIngestedAt > sixHoursAgo);
    const marketsRecentlyIngested = recentlyIngested.length;

    // Get active markets (with volume or liquidity)
    const activeMarkets = allMarkets.filter((m) => 
      (m.volume && m.volume > 0) || (m.liquidity && m.liquidity > 0)
    ).length;

    // Get markets with prices (check realtimePrices table)
    const realtimePrices = await ctx.db.query("realtimePrices").collect();
    const marketsWithPrices = new Set(realtimePrices.map((p) => p.marketId)).size;

    // Calculate total volume
    const totalVolume = allMarkets.reduce((sum, m) => sum + (m.volume || 0), 0);

    // Get most queried market
    const marketCounts: Record<string, number> = {};
    allQueries.forEach((q) => {
      if (q.bestMarketId) {
        marketCounts[q.bestMarketId] = (marketCounts[q.bestMarketId] || 0) + 1;
      }
    });
    const mostQueriedMarketId = Object.keys(marketCounts).reduce((a, b) => 
      marketCounts[a] > marketCounts[b] ? a : b, ""
    );
    const mostQueriedMarket = mostQueriedMarketId 
      ? allMarkets.find((m) => m.polymarketMarketId === mostQueriedMarketId)
      : null;

    return {
      totalMarkets,
      totalEmbeddings,
      totalQueries,
      queriesLast24h,
      avgConfidence: avgConfidence ? Math.round(avgConfidence * 100) / 100 : null,
      marketsRecentlyIngested,
      activeMarkets,
      marketsWithPrices,
      totalVolume,
      mostQueriedMarket: mostQueriedMarket ? {
        id: mostQueriedMarket.polymarketMarketId,
        title: mostQueriedMarket.title,
        queryCount: marketCounts[mostQueriedMarketId],
      } : null,
    };
  },
});

export const getNewsByQueryHash = query({
  args: {
    queryHash: v.string(),
  },
  handler: async (ctx, args) => {
    const articles = await ctx.db
      .query("newsArticles")
      .withIndex("by_query_hash", (q) => q.eq("queryHash", args.queryHash))
      .order("desc")
      .collect();
    
    return articles.sort((a, b) => {
      // Sort by relevance score first, then by recency
      const scoreA = a.relevanceScore || 0;
      const scoreB = b.relevanceScore || 0;
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return b.publishedAt - a.publishedAt;
    });
  },
});

export const getAllNewsArticles = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 1000; // Default to 1000 articles
    const articles = await ctx.db
      .query("newsArticles")
      .withIndex("by_published_at")
      .order("desc")
      .take(limit);
    
    return articles;
  },
});
