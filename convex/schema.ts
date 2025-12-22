import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  markets: defineTable({
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
  })
    .index("by_polymarket_market_id", ["polymarketMarketId"])
    .index("by_last_ingested", ["lastIngestedAt"]),

  embeddings: defineTable({
    polymarketMarketId: v.string(),
    vector: v.array(v.number()),
    model: v.string(),
    updatedAt: v.number(),
  }).index("by_polymarket_market_id", ["polymarketMarketId"]),

  cache: defineTable({
    key: v.string(),
    value: v.any(),
    expiresAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_expires_at", ["expiresAt"]),

  queriesLog: defineTable({
    question: v.string(),
    parsedClaim: v.any(),
    createdAt: v.number(),
    bestMarketId: v.union(v.string(), v.null()),
    confidence: v.union(v.number(), v.null()),
    debug: v.union(v.any(), v.null()),
  }).index("by_created_at", ["createdAt"]),

  realtimePrices: defineTable({
    marketId: v.string(),
    tokenId: v.union(v.string(), v.null()),
    price: v.union(v.number(), v.null()),
    bid: v.union(v.number(), v.null()),
    ask: v.union(v.number(), v.null()),
    spread: v.union(v.number(), v.null()),
    volume: v.union(v.number(), v.null()),
    lastUpdated: v.number(),
  })
    .index("by_market_id", ["marketId"])
    .index("by_token_id", ["tokenId"])
    .index("by_last_updated", ["lastUpdated"]),

  newsArticles: defineTable({
    title: v.string(),
    url: v.string(),
    source: v.string(),
    publishedAt: v.number(),
    snippet: v.union(v.string(), v.null()),
    relevanceScore: v.union(v.number(), v.null()),
    queryHash: v.string(), // Hash of the query/claim for caching
    createdAt: v.number(),
  })
    .index("by_query_hash", ["queryHash"])
    .index("by_published_at", ["publishedAt"])
    .index("by_source", ["source"]),

  tweets: defineTable({
    tweetId: v.string(),
    text: v.string(),
    author: v.string(),
    authorUsername: v.string(),
    tweetCreatedAt: v.number(), // When the tweet was created on Twitter
    url: v.string(),
    retweetCount: v.union(v.number(), v.null()),
    likeCount: v.union(v.number(), v.null()),
    relevanceScore: v.union(v.number(), v.null()),
    queryHash: v.string(),
    createdAt: v.number(), // When we stored it
  })
    .index("by_tweet_id", ["tweetId"])
    .index("by_query_hash", ["queryHash"])
    .index("by_created_at", ["createdAt"]),

  kalshiMarkets: defineTable({
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
    lastIngestedAt: v.number(),
  })
    .index("by_ticker", ["ticker"])
    .index("by_status", ["status"])
    .index("by_category", ["category"])
    .index("by_last_ingested", ["lastIngestedAt"]),

  redditPosts: defineTable({
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
    storedAt: v.number(),
  })
    .index("by_post_id", ["postId"])
    .index("by_query_hash", ["queryHash"])
    .index("by_subreddit", ["subreddit"])
    .index("by_created_at", ["createdAt"]),

  tiktokVideos: defineTable({
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
    storedAt: v.number(),
  })
    .index("by_video_id", ["videoId"])
    .index("by_query_hash", ["queryHash"])
    .index("by_created_at", ["createdAt"]),

  instagramPosts: defineTable({
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
    storedAt: v.number(),
  })
    .index("by_post_id", ["postId"])
    .index("by_query_hash", ["queryHash"])
    .index("by_created_at", ["createdAt"]),

  googleTrends: defineTable({
    keyword: v.string(),
    searchInterest: v.number(), // 0-100 scale
    relatedQueries: v.array(v.string()),
    relatedTopics: v.array(v.string()),
    timeRange: v.string(),
    region: v.string(),
    trendScore: v.union(v.number(), v.null()),
    queryHash: v.string(),
    storedAt: v.number(),
  })
    .index("by_keyword", ["keyword"])
    .index("by_query_hash", ["queryHash"])
    .index("by_stored_at", ["storedAt"]),
});
