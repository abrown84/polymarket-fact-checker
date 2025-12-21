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
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const queries = await ctx.db
      .query("queriesLog")
      .withIndex("by_created_at")
      .order("desc")
      .take(limit);
    return queries;
  },
});

export const getPopularMarkets = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    // Get all markets
    const allMarkets = await ctx.db.query("markets").collect();
    
    console.log(`[getPopularMarkets] Total markets in database: ${allMarkets.length}`);
    
    // Sort by popularity (volume/liquidity) or by most recently ingested
    const popularMarkets = allMarkets
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
      })
      .slice(0, limit);

    console.log(`[getPopularMarkets] Returning ${popularMarkets.length} markets`);
    return popularMarkets;
  },
});

export const getAllMarkets = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("markets").collect();
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
      mostQueriedMarket: mostQueriedMarket ? {
        id: mostQueriedMarket.polymarketMarketId,
        title: mostQueriedMarket.title,
        queryCount: marketCounts[mostQueriedMarketId],
      } : null,
    };
  },
});
