import { mutation } from "./_generated/server";
import { v } from "convex/values";

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

export const upsertRealtimePrice = mutation({
  args: {
    marketId: v.string(),
    tokenId: v.union(v.string(), v.null()),
    price: v.union(v.number(), v.null()),
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
    const priceData = {
      marketId: args.marketId,
      tokenId: args.tokenId,
      price: args.price,
      bid: args.bid,
      ask: args.ask,
      spread: args.spread,
      volume: args.volume,
      lastUpdated: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, priceData);
      return existing._id;
    } else {
      return await ctx.db.insert("realtimePrices", priceData);
    }
  },
});

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
    priceYes: v.union(v.number(), v.null()),
    spread: v.union(v.number(), v.null()),
    volume: v.union(v.number(), v.null()),
    liquidity: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("marketSentimentSnapshots", {
      polymarketMarketId: args.polymarketMarketId,
      priceYes: args.priceYes,
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
    lastPrice: v.union(v.number(), v.null()),
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
      lastPrice: args.lastPrice,
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
