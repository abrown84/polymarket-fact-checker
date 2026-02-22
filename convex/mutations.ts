import { mutation } from "./_generated/server";
import { v } from "convex/values";

function toDedupeHash(parts: Array<string | number | null | undefined>): string {
  return parts.map((p) => String(p ?? "")).join("|").slice(0, 512);
}

export const setCache = mutation({
  args: {
    key: v.string(),
    value: v.any(),
    expiresAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Check size before storing (Convex limit is 1 MiB per document)
    const valueSize = JSON.stringify(args.value).length;
    const maxSize = 900 * 1024; // 900KB to be safe (leave room for other fields)
    
    if (valueSize > maxSize) {
      throw new Error(`Cache value too large: ${(valueSize / 1024).toFixed(2)}KB > ${(maxSize / 1024).toFixed(2)}KB. Key: ${args.key}`);
    }
    
    const existing = await ctx.db
      .query("cache")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        expiresAt: args.expiresAt,
        updatedAt: args.updatedAt,
      });
    } else {
      await ctx.db.insert("cache", {
        key: args.key,
        value: args.value,
        expiresAt: args.expiresAt,
        updatedAt: args.updatedAt,
      });
    }
  },
});

export const upsertMarket = mutation({
  args: {
    polymarketMarketId: v.string(),
    title: v.string(),
    description: v.string(),
    slug: v.union(v.string(), v.null()),
    url: v.union(v.string(), v.null()),
    endDate: v.union(v.number(), v.null()),
    outcomes: v.array(v.string()),
    volume: v.union(v.number(), v.null()),
    liquidity: v.union(v.number(), v.null()),
    lastIngestedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("markets")
      .withIndex("by_polymarket_market_id", (q) =>
        q.eq("polymarketMarketId", args.polymarketMarketId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title,
        description: args.description,
        slug: args.slug,
        url: args.url,
        endDate: args.endDate,
        outcomes: args.outcomes,
        volume: args.volume,
        liquidity: args.liquidity,
        lastIngestedAt: args.lastIngestedAt,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("markets", {
        polymarketMarketId: args.polymarketMarketId,
        title: args.title,
        description: args.description,
        slug: args.slug,
        url: args.url,
        endDate: args.endDate,
        outcomes: args.outcomes,
        volume: args.volume,
        liquidity: args.liquidity,
        lastIngestedAt: args.lastIngestedAt,
      });
    }
  },
});

export const upsertEmbedding = mutation({
  args: {
    polymarketMarketId: v.string(),
    vector: v.array(v.number()),
    model: v.string(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("embeddings")
      .withIndex("by_polymarket_market_id", (q) =>
        q.eq("polymarketMarketId", args.polymarketMarketId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        vector: args.vector,
        model: args.model,
        updatedAt: args.updatedAt,
      });
    } else {
      await ctx.db.insert("embeddings", {
        polymarketMarketId: args.polymarketMarketId,
        vector: args.vector,
        model: args.model,
        updatedAt: args.updatedAt,
      });
    }
  },
});

export const logQuery = mutation({
  args: {
    question: v.string(),
    parsedClaim: v.any(),
    bestMarketId: v.union(v.string(), v.null()),
    confidence: v.union(v.number(), v.null()),
    debug: v.union(v.any(), v.null()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("queriesLog", {
      question: args.question,
      parsedClaim: args.parsedClaim,
      createdAt: Date.now(),
      bestMarketId: args.bestMarketId,
      confidence: args.confidence,
      debug: args.debug,
    });
  },
});

export const createFactCheckRun = mutation({
  args: {
    question: v.string(),
    mode: v.union(v.literal("fast"), v.literal("deep")),
    model: v.union(v.string(), v.null()),
    providerFlags: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("factCheckRuns", {
      question: args.question,
      mode: args.mode,
      status: "started",
      model: args.model,
      startedAt: Date.now(),
      completedAt: null,
      durationMs: null,
      error: null,
      bestMarketId: null,
      confidence: null,
      providerFlags: args.providerFlags,
      metrics: null,
    });
  },
});

export const appendRunEvent = mutation({
  args: {
    runId: v.id("factCheckRuns"),
    stage: v.string(),
    status: v.union(v.literal("started"), v.literal("progress"), v.literal("completed"), v.literal("failed")),
    message: v.string(),
    meta: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("runEvents", {
      runId: args.runId,
      stage: args.stage,
      status: args.status,
      message: args.message,
      meta: args.meta,
      createdAt: Date.now(),
    });
  },
});

export const completeFactCheckRun = mutation({
  args: {
    runId: v.id("factCheckRuns"),
    status: v.union(v.literal("completed"), v.literal("failed")),
    bestMarketId: v.union(v.string(), v.null()),
    confidence: v.union(v.number(), v.null()),
    metrics: v.optional(v.any()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return;
    const completedAt = Date.now();
    await ctx.db.patch(args.runId, {
      status: args.status,
      completedAt,
      durationMs: completedAt - run.startedAt,
      bestMarketId: args.bestMarketId,
      confidence: args.confidence,
      metrics: args.metrics,
      error: args.error ?? null,
    });
  },
});

export const upsertEvidenceItem = mutation({
  args: {
    claimKey: v.string(),
    sourceType: v.string(),
    sourceId: v.string(),
    url: v.union(v.string(), v.null()),
    title: v.union(v.string(), v.null()),
    content: v.union(v.string(), v.null()),
    publishedAt: v.union(v.number(), v.null()),
    relevanceScore: v.union(v.number(), v.null()),
    stanceScore: v.union(v.number(), v.null()),
    credibilityScore: v.union(v.number(), v.null()),
    freshnessScore: v.union(v.number(), v.null()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const dedupeHash = toDedupeHash([
      args.claimKey,
      args.sourceType,
      args.sourceId,
      args.url,
      args.title,
    ]);

    const existing = await ctx.db
      .query("evidenceItems")
      .withIndex("by_dedupe_hash", (q) => q.eq("dedupeHash", dedupeHash))
      .first();

    const payload = {
      claimKey: args.claimKey,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      url: args.url,
      title: args.title,
      content: args.content,
      publishedAt: args.publishedAt,
      ingestedAt: Date.now(),
      relevanceScore: args.relevanceScore,
      stanceScore: args.stanceScore,
      credibilityScore: args.credibilityScore,
      freshnessScore: args.freshnessScore,
      dedupeHash,
      metadata: args.metadata,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("evidenceItems", payload);
  },
});

export const deleteMarket = mutation({
  args: {
    marketId: v.id("markets"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.marketId);
  },
});

export const deleteEmbedding = mutation({
  args: {
    polymarketMarketId: v.string(),
  },
  handler: async (ctx, args) => {
    const embedding = await ctx.db
      .query("embeddings")
      .withIndex("by_polymarket_market_id", (q) =>
        q.eq("polymarketMarketId", args.polymarketMarketId)
      )
      .first();
    
    if (embedding) {
      await ctx.db.delete(embedding._id);
    }
  },
});

export const upsertRealtimeChance = mutation({
  args: {
    marketId: v.string(),
    tokenId: v.union(v.string(), v.null()),
    chance: v.union(v.number(), v.null()), // Market-implied probability (0-100)
    bid: v.union(v.number(), v.null()),
    ask: v.union(v.number(), v.null()),
    spread: v.union(v.number(), v.null()),
    volume: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    const identifier = args.marketId || args.tokenId;
    if (!identifier) {
      throw new Error("Either marketId or tokenId must be provided");
    }

    const existing = await ctx.db
      .query("realtimePrices")
      .withIndex("by_market_id", (q) => q.eq("marketId", args.marketId))
      .first();

    const now = Date.now();
    const chanceData = {
      marketId: args.marketId,
      tokenId: args.tokenId,
      chance: args.chance,
      bid: args.bid,
      ask: args.ask,
      spread: args.spread,
      volume: args.volume,
      lastUpdated: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, chanceData);
      return existing._id;
    } else {
      return await ctx.db.insert("realtimePrices", chanceData);
    }
  },
});

// Alias for backward compatibility
export const upsertRealtimePrice = upsertRealtimeChance;

export const upsertMarketFromWebSocket = mutation({
  args: {
    polymarketMarketId: v.string(),
    title: v.union(v.string(), v.null()),
    description: v.union(v.string(), v.null()),
    slug: v.union(v.string(), v.null()),
    url: v.union(v.string(), v.null()),
    endDate: v.union(v.number(), v.null()),
    outcomes: v.union(v.array(v.string()), v.null()),
    volume: v.union(v.number(), v.null()),
    liquidity: v.union(v.number(), v.null()),
    active: v.union(v.boolean(), v.null()),
  },
  handler: async (ctx, args) => {
    if (!args.polymarketMarketId) {
      throw new Error("polymarketMarketId is required");
    }

    const existing = await ctx.db
      .query("markets")
      .withIndex("by_polymarket_market_id", (q) =>
        q.eq("polymarketMarketId", args.polymarketMarketId)
      )
      .first();

    const now = Date.now();
    const marketData = {
      polymarketMarketId: args.polymarketMarketId,
      title: args.title || "Unknown Market",
      description: args.description || "",
      slug: args.slug,
      url: args.url,
      endDate: args.endDate,
      outcomes: args.outcomes || ["Yes", "No"],
      volume: args.volume,
      liquidity: args.liquidity,
      lastIngestedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, marketData);
      return existing._id;
    } else {
      return await ctx.db.insert("markets", marketData);
    }
  },
});

export const insertMarketSentimentSnapshot = mutation({
  args: {
    polymarketMarketId: v.string(),
    chanceYes: v.union(v.number(), v.null()), // YES outcome probability (0-1)
    spread: v.union(v.number(), v.null()),
    volume: v.union(v.number(), v.null()),
    liquidity: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("marketSentimentSnapshots", {
      polymarketMarketId: args.polymarketMarketId,
      chanceYes: args.chanceYes, // YES outcome probability (0-1)
      spread: args.spread,
      volume: args.volume,
      liquidity: args.liquidity,
      createdAt: now,
    });
  },
});

export const upsertNewsArticle = mutation({
  args: {
    title: v.string(),
    url: v.string(),
    source: v.string(),
    publishedAt: v.number(),
    snippet: v.union(v.string(), v.null()),
    relevanceScore: v.union(v.number(), v.null()),
    queryHash: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if article already exists (by URL)
    const existing = await ctx.db
      .query("newsArticles")
      .filter((q) => q.eq(q.field("url"), args.url))
      .first();

    const now = Date.now();
    const articleData = {
      title: args.title,
      url: args.url,
      source: args.source,
      publishedAt: args.publishedAt,
      snippet: args.snippet,
      relevanceScore: args.relevanceScore,
      queryHash: args.queryHash,
      createdAt: now,
    };

    if (existing) {
      // Update if relevance score is better or if it's a new query
      if (
        (args.relevanceScore !== null && (existing.relevanceScore === null || args.relevanceScore > existing.relevanceScore)) ||
        existing.queryHash !== args.queryHash
      ) {
        await ctx.db.patch(existing._id, articleData);
      }
      return existing._id;
    } else {
      return await ctx.db.insert("newsArticles", articleData);
    }
  },
});

export const upsertTweet = mutation({
  args: {
    tweetId: v.string(),
    text: v.string(),
    author: v.string(),
    authorUsername: v.string(),
    createdAt: v.number(),
    url: v.string(),
    retweetCount: v.union(v.number(), v.null()),
    likeCount: v.union(v.number(), v.null()),
    relevanceScore: v.union(v.number(), v.null()),
    queryHash: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if tweet already exists (by tweetId)
    const existing = await ctx.db
      .query("tweets")
      .withIndex("by_tweet_id", (q) => q.eq("tweetId", args.tweetId))
      .first();

    const now = Date.now();
    const tweetData = {
      tweetId: args.tweetId,
      text: args.text,
      author: args.author,
      authorUsername: args.authorUsername,
      tweetCreatedAt: args.createdAt,
      url: args.url,
      retweetCount: args.retweetCount,
      likeCount: args.likeCount,
      relevanceScore: args.relevanceScore,
      queryHash: args.queryHash,
      createdAt: now,
    };

    if (existing) {
      // Update if relevance score is better
      if (
        args.relevanceScore !== null && 
        (existing.relevanceScore === null || args.relevanceScore > existing.relevanceScore)
      ) {
        await ctx.db.patch(existing._id, tweetData);
      }
      return existing._id;
    } else {
      return await ctx.db.insert("tweets", tweetData);
    }
  },
});

export const upsertKalshiMarket = mutation({
  args: {
    ticker: v.string(),
    title: v.string(),
    subtitle: v.union(v.string(), v.null()),
    category: v.string(),
    seriesTicker: v.union(v.string(), v.null()),
    openTime: v.number(),
    closeTime: v.union(v.number(), v.null()),
    expiryTime: v.union(v.number(), v.null()),
    status: v.string(),
    yesBid: v.union(v.number(), v.null()),
    yesAsk: v.union(v.number(), v.null()),
    noBid: v.union(v.number(), v.null()),
    noAsk: v.union(v.number(), v.null()),
    lastChance: v.union(v.number(), v.null()), // Last traded probability (0-100)
    volume: v.union(v.number(), v.null()),
    liquidity: v.union(v.number(), v.null()),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if market already exists (by ticker)
    const existing = await ctx.db
      .query("kalshiMarkets")
      .withIndex("by_ticker", (q) => q.eq("ticker", args.ticker))
      .first();

    const now = Date.now();
    const marketData = {
      ticker: args.ticker,
      title: args.title,
      subtitle: args.subtitle,
      category: args.category,
      seriesTicker: args.seriesTicker,
      openTime: args.openTime,
      closeTime: args.closeTime,
      expiryTime: args.expiryTime,
      status: args.status,
      yesBid: args.yesBid,
      yesAsk: args.yesAsk,
      noBid: args.noBid,
      noAsk: args.noAsk,
      lastChance: args.lastChance,
      volume: args.volume,
      liquidity: args.liquidity,
      url: args.url,
      lastIngestedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, marketData);
      return existing._id;
    } else {
      return await ctx.db.insert("kalshiMarkets", marketData);
    }
  },
});

export const upsertRedditPost = mutation({
  args: {
    postId: v.string(),
    title: v.string(),
    text: v.union(v.string(), v.null()),
    author: v.string(),
    subreddit: v.string(),
    score: v.number(),
    numComments: v.number(),
    createdAt: v.number(),
    url: v.string(),
    permalink: v.string(),
    relevanceScore: v.union(v.number(), v.null()),
    queryHash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("redditPosts")
      .withIndex("by_post_id", (q) => q.eq("postId", args.postId))
      .first();

    const now = Date.now();
    const postData = {
      postId: args.postId,
      title: args.title,
      text: args.text,
      author: args.author,
      subreddit: args.subreddit,
      score: args.score,
      numComments: args.numComments,
      createdAt: args.createdAt,
      url: args.url,
      permalink: args.permalink,
      relevanceScore: args.relevanceScore,
      queryHash: args.queryHash,
      storedAt: now,
    };

    if (existing) {
      if (
        args.relevanceScore !== null && 
        (existing.relevanceScore === null || args.relevanceScore > existing.relevanceScore)
      ) {
        await ctx.db.patch(existing._id, postData);
      }
      return existing._id;
    } else {
      return await ctx.db.insert("redditPosts", postData);
    }
  },
});

export const upsertTikTokVideo = mutation({
  args: {
    videoId: v.string(),
    description: v.string(),
    author: v.string(),
    authorUsername: v.string(),
    likeCount: v.union(v.number(), v.null()),
    commentCount: v.union(v.number(), v.null()),
    shareCount: v.union(v.number(), v.null()),
    viewCount: v.union(v.number(), v.null()),
    createdAt: v.number(),
    url: v.string(),
    relevanceScore: v.union(v.number(), v.null()),
    queryHash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tiktokVideos")
      .withIndex("by_video_id", (q) => q.eq("videoId", args.videoId))
      .first();

    const now = Date.now();
    const videoData = {
      videoId: args.videoId,
      description: args.description,
      author: args.author,
      authorUsername: args.authorUsername,
      likeCount: args.likeCount,
      commentCount: args.commentCount,
      shareCount: args.shareCount,
      viewCount: args.viewCount,
      createdAt: args.createdAt,
      url: args.url,
      relevanceScore: args.relevanceScore,
      queryHash: args.queryHash,
      storedAt: now,
    };

    if (existing) {
      if (
        args.relevanceScore !== null && 
        (existing.relevanceScore === null || args.relevanceScore > existing.relevanceScore)
      ) {
        await ctx.db.patch(existing._id, videoData);
      }
      return existing._id;
    } else {
      return await ctx.db.insert("tiktokVideos", videoData);
    }
  },
});

export const upsertInstagramPost = mutation({
  args: {
    postId: v.string(),
    caption: v.union(v.string(), v.null()),
    author: v.string(),
    authorUsername: v.string(),
    likeCount: v.union(v.number(), v.null()),
    commentCount: v.union(v.number(), v.null()),
    createdAt: v.number(),
    url: v.string(),
    mediaType: v.string(),
    relevanceScore: v.union(v.number(), v.null()),
    queryHash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("instagramPosts")
      .withIndex("by_post_id", (q) => q.eq("postId", args.postId))
      .first();

    const now = Date.now();
    const postData = {
      postId: args.postId,
      caption: args.caption,
      author: args.author,
      authorUsername: args.authorUsername,
      likeCount: args.likeCount,
      commentCount: args.commentCount,
      createdAt: args.createdAt,
      url: args.url,
      mediaType: args.mediaType,
      relevanceScore: args.relevanceScore,
      queryHash: args.queryHash,
      storedAt: now,
    };

    if (existing) {
      if (
        args.relevanceScore !== null && 
        (existing.relevanceScore === null || args.relevanceScore > existing.relevanceScore)
      ) {
        await ctx.db.patch(existing._id, postData);
      }
      return existing._id;
    } else {
      return await ctx.db.insert("instagramPosts", postData);
    }
  },
});

export const upsertGoogleTrend = mutation({
  args: {
    keyword: v.string(),
    searchInterest: v.number(),
    relatedQueries: v.array(v.string()),
    relatedTopics: v.array(v.string()),
    timeRange: v.string(),
    region: v.string(),
    trendScore: v.union(v.number(), v.null()),
    queryHash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("googleTrends")
      .withIndex("by_keyword", (q) => q.eq("keyword", args.keyword))
      .first();

    const now = Date.now();
    const trendData = {
      keyword: args.keyword,
      searchInterest: args.searchInterest,
      relatedQueries: args.relatedQueries,
      relatedTopics: args.relatedTopics,
      timeRange: args.timeRange,
      region: args.region,
      trendScore: args.trendScore,
      queryHash: args.queryHash,
      storedAt: now,
    };

    if (existing) {
      if (
        args.trendScore !== null &&
        (existing.trendScore === null || args.trendScore > existing.trendScore)
      ) {
        await ctx.db.patch(existing._id, trendData);
      }
      return existing._id;
    } else {
      return await ctx.db.insert("googleTrends", trendData);
    }
  },
});

export const upsertYouTubeVideo = mutation({
  args: {
    videoId: v.string(),
    title: v.string(),
    description: v.union(v.string(), v.null()),
    channelTitle: v.string(),
    channelId: v.string(),
    publishedAt: v.number(),
    url: v.string(),
    thumbnailUrl: v.union(v.string(), v.null()),
    viewCount: v.union(v.number(), v.null()),
    likeCount: v.union(v.number(), v.null()),
    commentCount: v.union(v.number(), v.null()),
    relevanceScore: v.union(v.number(), v.null()),
    queryHash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("youtubeVideos")
      .withIndex("by_video_id", (q) => q.eq("videoId", args.videoId))
      .first();

    const now = Date.now();
    const videoData = {
      videoId: args.videoId,
      title: args.title,
      description: args.description,
      channelTitle: args.channelTitle,
      channelId: args.channelId,
      publishedAt: args.publishedAt,
      url: args.url,
      thumbnailUrl: args.thumbnailUrl,
      viewCount: args.viewCount,
      likeCount: args.likeCount,
      commentCount: args.commentCount,
      relevanceScore: args.relevanceScore,
      queryHash: args.queryHash,
      storedAt: now,
    };

    if (existing) {
      if (
        args.relevanceScore !== null &&
        (existing.relevanceScore === null || args.relevanceScore > existing.relevanceScore)
      ) {
        await ctx.db.patch(existing._id, videoData);
      }
      return existing._id;
    } else {
      return await ctx.db.insert("youtubeVideos", videoData);
    }
  },
});

// ============================================
// LEARNING SYSTEM MUTATIONS
// ============================================

/**
 * Log a prediction with source contributions for later learning
 */
export const logPrediction = mutation({
  args: {
    queryId: v.optional(v.id("queriesLog")),
    question: v.string(),
    predictedProbability: v.number(),
    confidence: v.number(),
    sourceContributions: v.object({
      polymarket: v.optional(
        v.object({
          probability: v.number(),
          marketId: v.string(),
          volume: v.optional(v.number()),
          liquidity: v.optional(v.number()),
        })
      ),
      kalshi: v.optional(
        v.object({
          probability: v.number(),
          ticker: v.string(),
          volume: v.optional(v.number()),
        })
      ),
      news: v.optional(
        v.object({
          sentiment: v.number(),
          articleCount: v.number(),
          avgRelevance: v.optional(v.number()),
        })
      ),
      twitter: v.optional(
        v.object({
          sentiment: v.number(),
          tweetCount: v.number(),
          totalEngagement: v.optional(v.number()),
        })
      ),
      reddit: v.optional(
        v.object({
          sentiment: v.number(),
          postCount: v.number(),
          totalScore: v.optional(v.number()),
        })
      ),
      youtube: v.optional(
        v.object({
          sentiment: v.number(),
          videoCount: v.number(),
          totalViews: v.optional(v.number()),
        })
      ),
    }),
    primaryMarketId: v.union(v.string(), v.null()),
    primaryMarketSource: v.union(v.string(), v.null()),
    marketCloseDate: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    // Determine calibration bucket (0-10, 10-20, etc.)
    const bucket = Math.floor(args.predictedProbability * 10) * 10;
    const calibrationBucket = `${bucket}-${bucket + 10}`;

    return await ctx.db.insert("predictions", {
      queryId: args.queryId,
      question: args.question,
      predictedProbability: args.predictedProbability,
      confidence: args.confidence,
      sourceContributions: args.sourceContributions,
      primaryMarketId: args.primaryMarketId,
      primaryMarketSource: args.primaryMarketSource,
      marketCloseDate: args.marketCloseDate,
      actualOutcome: null,
      outcomeRecordedAt: null,
      brierScore: null,
      calibrationBucket,
      userFeedback: null,
      userFeedbackAt: null,
      userFeedbackNote: null,
      createdAt: Date.now(),
    });
  },
});

/**
 * Record user feedback on a prediction (faster signal than waiting for market resolution)
 */
export const recordUserFeedback = mutation({
  args: {
    predictionId: v.id("predictions"),
    feedback: v.union(
      v.literal("accurate"),
      v.literal("inaccurate"),
      v.literal("partial")
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.predictionId, {
      userFeedback: args.feedback,
      userFeedbackAt: Date.now(),
      userFeedbackNote: args.note ?? null,
    });
  },
});

/**
 * Record the actual outcome when a market resolves
 */
export const recordOutcome = mutation({
  args: {
    predictionId: v.id("predictions"),
    actualOutcome: v.boolean(),
  },
  handler: async (ctx, args) => {
    const prediction = await ctx.db.get(args.predictionId);
    if (!prediction) {
      throw new Error("Prediction not found");
    }

    // Calculate Brier score: (predicted - actual)²
    const actual = args.actualOutcome ? 1 : 0;
    const brierScore = Math.pow(prediction.predictedProbability - actual, 2);

    await ctx.db.patch(args.predictionId, {
      actualOutcome: args.actualOutcome,
      outcomeRecordedAt: Date.now(),
      brierScore,
    });

    return { brierScore };
  },
});

/**
 * Save new learned weights
 */
export const saveLearnedWeights = mutation({
  args: {
    version: v.number(),
    weights: v.object({
      polymarket: v.number(),
      kalshi: v.number(),
      news: v.number(),
      twitter: v.number(),
      reddit: v.number(),
      youtube: v.number(),
    }),
    trainingSize: v.number(),
    avgBrierScore: v.number(),
    calibrationError: v.union(v.number(), v.null()),
    sourcePerformance: v.optional(
      v.object({
        polymarket: v.object({ avgError: v.number(), sampleSize: v.number() }),
        kalshi: v.optional(v.object({ avgError: v.number(), sampleSize: v.number() })),
        news: v.optional(v.object({ avgError: v.number(), sampleSize: v.number() })),
        twitter: v.optional(v.object({ avgError: v.number(), sampleSize: v.number() })),
        reddit: v.optional(v.object({ avgError: v.number(), sampleSize: v.number() })),
        youtube: v.optional(v.object({ avgError: v.number(), sampleSize: v.number() })),
      })
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Deactivate all previous weights
    const activeWeights = await ctx.db
      .query("learnedWeights")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    for (const w of activeWeights) {
      await ctx.db.patch(w._id, { isActive: false });
    }

    // Insert new weights as active
    return await ctx.db.insert("learnedWeights", {
      version: args.version,
      weights: args.weights,
      trainingSize: args.trainingSize,
      avgBrierScore: args.avgBrierScore,
      calibrationError: args.calibrationError,
      sourcePerformance: args.sourcePerformance,
      isActive: true,
      notes: args.notes ?? null,
      createdAt: Date.now(),
    });
  },
});

/**
 * Save a calibration snapshot
 */
export const saveCalibrationSnapshot = mutation({
  args: {
    buckets: v.array(
      v.object({
        range: v.string(),
        predictedAvg: v.number(),
        actualRate: v.number(),
        sampleSize: v.number(),
      })
    ),
    expectedCalibrationError: v.number(),
    overconfidenceScore: v.number(),
    totalPredictions: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("calibrationSnapshots", {
      buckets: args.buckets,
      expectedCalibrationError: args.expectedCalibrationError,
      overconfidenceScore: args.overconfidenceScore,
      totalPredictions: args.totalPredictions,
      createdAt: Date.now(),
    });
  },
});
