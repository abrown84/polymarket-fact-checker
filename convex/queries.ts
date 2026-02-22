import { query } from "./_generated/server";
import { v } from "convex/values";

export const getFactCheckRun = query({
  args: { runId: v.id("factCheckRuns") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.runId);
  },
});

export const getRunEvents = query({
  args: { runId: v.id("factCheckRuns") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("runEvents")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();

    return events.sort((a, b) => a.createdAt - b.createdAt);
  },
});

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
 * Search markets by query string
 */
export const searchMarkets = query({
  args: {
    query: v.optional(v.string()),
    limit: v.optional(v.number()),
    sortBy: v.optional(v.union(
      v.literal("volume"),
      v.literal("liquidity"),
      v.literal("recent"),
      v.literal("title")
    )),
    sortDirection: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    const searchQuery = args.query || "";
    const limit = args.limit;
    const sortBy = args.sortBy || "volume";
    const sortDirection = args.sortDirection || "desc";

    // Get all markets
    let markets = await ctx.db.query("markets").collect();

    // Apply search filter
    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      markets = markets.filter((market) => {
        const titleMatch = market.title?.toLowerCase().includes(queryLower);
        const descMatch = market.description?.toLowerCase().includes(queryLower);
        const slugMatch = market.slug?.toLowerCase().includes(queryLower);
        const idMatch = market.polymarketMarketId?.toLowerCase().includes(queryLower);
        return titleMatch || descMatch || slugMatch || idMatch;
      });
    }

    // Apply sorting
    markets.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "volume":
          comparison = (b.volume || 0) - (a.volume || 0);
          break;
        case "liquidity":
          comparison = (b.liquidity || 0) - (a.liquidity || 0);
          break;
        case "recent":
          comparison = (b.lastIngestedAt || 0) - (a.lastIngestedAt || 0);
          break;
        case "title":
          comparison = (a.title || "").localeCompare(b.title || "");
          break;
      }

      return sortDirection === "asc" ? -comparison : comparison;
    });

    // Apply limit
    if (limit) {
      markets = markets.slice(0, limit);
    }

    return {
      markets,
      total: markets.length,
      hasMore: limit ? markets.length === limit : false,
    };
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

export const getRealtimeChance = query({
  args: {
    marketId: v.string(),
  },
  handler: async (ctx, args) => {
    const chance = await ctx.db
      .query("realtimePrices")
      .withIndex("by_market_id", (q) => q.eq("marketId", args.marketId))
      .first();
    
    // Only return if updated within last 5 minutes (real-time chance data should be fresh)
    if (chance && chance.lastUpdated > Date.now() - 5 * 60 * 1000) {
      return chance;
    }
    return null;
  },
});

// Alias for backward compatibility
export const getRealtimePrice = getRealtimeChance;

export const getMarketSentimentSnapshotBefore = query({
  args: {
    polymarketMarketId: v.string(),
    before: v.number(),
  },
  handler: async (ctx, args) => {
    // Keep this simple: snapshot volume is low (only written when factCheck runs).
    const snapshots = await ctx.db
      .query("marketSentimentSnapshots")
      .withIndex("by_market_id", (q) => q.eq("polymarketMarketId", args.polymarketMarketId))
      .collect();

    const eligible = snapshots
      .filter((s) => s.createdAt <= args.before)
      .sort((a, b) => b.createdAt - a.createdAt);

    return eligible[0] ?? null;
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

// ============================================
// LEARNING SYSTEM QUERIES
// ============================================

/**
 * Get the currently active learned weights
 */
export const getActiveWeights = query({
  args: {},
  handler: async (ctx) => {
    const activeWeights = await ctx.db
      .query("learnedWeights")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first();

    return activeWeights;
  },
});

/**
 * Get the latest weight version number
 */
export const getLatestWeightVersion = query({
  args: {},
  handler: async (ctx) => {
    const allWeights = await ctx.db
      .query("learnedWeights")
      .withIndex("by_version")
      .order("desc")
      .first();

    return allWeights?.version ?? 0;
  },
});

/**
 * Get all predictions with recorded outcomes (for training)
 */
export const getPredictionsWithOutcomes = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 1000;

    const predictions = await ctx.db
      .query("predictions")
      .withIndex("by_created_at")
      .order("desc")
      .collect();

    // Filter to only those with outcomes
    const withOutcomes = predictions.filter((p) => p.actualOutcome !== null);

    return withOutcomes.slice(0, limit);
  },
});

/**
 * Get predictions pending outcome (market closed but no outcome recorded)
 */
export const getPendingOutcomePredictions = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const predictions = await ctx.db
      .query("predictions")
      .withIndex("by_outcome_pending")
      .collect();

    // Filter: no outcome yet AND market close date has passed
    return predictions.filter(
      (p) =>
        p.actualOutcome === null &&
        p.marketCloseDate !== null &&
        p.marketCloseDate < now
    );
  },
});

/**
 * Get predictions by market ID (for checking when a market resolves)
 */
export const getPredictionsByMarket = query({
  args: {
    marketId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("predictions")
      .withIndex("by_primary_market", (q) => q.eq("primaryMarketId", args.marketId))
      .collect();
  },
});

/**
 * Get learning stats summary
 */
export const getLearningStats = query({
  args: {},
  handler: async (ctx) => {
    const predictions = await ctx.db.query("predictions").collect();
    const weights = await ctx.db.query("learnedWeights").collect();
    const calibrationSnapshots = await ctx.db.query("calibrationSnapshots").collect();

    const withOutcomes = predictions.filter((p) => p.actualOutcome !== null);
    const withFeedback = predictions.filter((p) => p.userFeedback !== null);
    const pendingOutcome = predictions.filter(
      (p) =>
        p.actualOutcome === null &&
        p.marketCloseDate !== null &&
        p.marketCloseDate < Date.now()
    );

    // Calculate average Brier score
    const brierScores = withOutcomes
      .map((p) => p.brierScore)
      .filter((s): s is number => s !== null);
    const avgBrierScore =
      brierScores.length > 0
        ? brierScores.reduce((a, b) => a + b, 0) / brierScores.length
        : null;

    // Get active weights
    const activeWeights = weights.find((w) => w.isActive);

    // Get latest calibration
    const latestCalibration = calibrationSnapshots.sort(
      (a, b) => b.createdAt - a.createdAt
    )[0];

    return {
      totalPredictions: predictions.length,
      predictionsWithOutcomes: withOutcomes.length,
      predictionsWithFeedback: withFeedback.length,
      predictionsPendingOutcome: pendingOutcome.length,
      avgBrierScore,
      weightVersions: weights.length,
      activeWeightsVersion: activeWeights?.version ?? null,
      latestCalibrationError: latestCalibration?.expectedCalibrationError ?? null,
      readyToLearn: withOutcomes.length >= 50,
      feedbackBreakdown: {
        accurate: withFeedback.filter((p) => p.userFeedback === "accurate").length,
        inaccurate: withFeedback.filter((p) => p.userFeedback === "inaccurate").length,
        partial: withFeedback.filter((p) => p.userFeedback === "partial").length,
      },
    };
  },
});

/**
 * Get recent predictions (for UI display)
 */
export const getRecentPredictions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    return await ctx.db
      .query("predictions")
      .withIndex("by_created_at")
      .order("desc")
      .take(limit);
  },
});

/**
 * Get calibration curve data
 */
export const getCalibrationData = query({
  args: {},
  handler: async (ctx) => {
    const predictions = await ctx.db
      .query("predictions")
      .collect();

    const withOutcomes = predictions.filter((p) => p.actualOutcome !== null);

    // Group by calibration bucket
    const buckets: Record<string, { predicted: number[]; actual: boolean[] }> = {};

    for (const pred of withOutcomes) {
      const bucket = pred.calibrationBucket || "unknown";
      if (!buckets[bucket]) {
        buckets[bucket] = { predicted: [], actual: [] };
      }
      buckets[bucket].predicted.push(pred.predictedProbability);
      buckets[bucket].actual.push(pred.actualOutcome!);
    }

    // Calculate stats for each bucket
    const calibrationCurve = Object.entries(buckets)
      .map(([range, data]) => ({
        range,
        predictedAvg:
          data.predicted.reduce((a, b) => a + b, 0) / data.predicted.length,
        actualRate:
          data.actual.filter((x) => x).length / data.actual.length,
        sampleSize: data.predicted.length,
      }))
      .sort((a, b) => {
        const aStart = parseInt(a.range.split("-")[0]);
        const bStart = parseInt(b.range.split("-")[0]);
        return aStart - bStart;
      });

    // Calculate expected calibration error (ECE)
    const totalSamples = withOutcomes.length;
    const ece =
      totalSamples > 0
        ? calibrationCurve.reduce((sum, bucket) => {
            const weight = bucket.sampleSize / totalSamples;
            const error = Math.abs(bucket.predictedAvg - bucket.actualRate);
            return sum + weight * error;
          }, 0)
        : 0;

    return {
      calibrationCurve,
      expectedCalibrationError: ece,
      totalPredictions: withOutcomes.length,
    };
  },
});

/**
 * Get weight history for visualization
 */
export const getWeightHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    return await ctx.db
      .query("learnedWeights")
      .withIndex("by_created_at")
      .order("desc")
      .take(limit);
  },
});
