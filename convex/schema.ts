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
    chance: v.union(v.number(), v.null()), // Market-implied probability (0-100)
    bid: v.union(v.number(), v.null()),
    ask: v.union(v.number(), v.null()),
    spread: v.union(v.number(), v.null()),
    volume: v.union(v.number(), v.null()),
    lastUpdated: v.number(),
  })
    .index("by_market_id", ["marketId"])
    .index("by_token_id", ["tokenId"])
    .index("by_last_updated", ["lastUpdated"]),

  marketSentimentSnapshots: defineTable({
    polymarketMarketId: v.string(),
    chanceYes: v.union(v.number(), v.null()), // YES outcome probability (0-1)
    spread: v.union(v.number(), v.null()),
    volume: v.union(v.number(), v.null()),
    liquidity: v.union(v.number(), v.null()),
    createdAt: v.number(),
  })
    .index("by_market_id", ["polymarketMarketId"])
    .index("by_market_and_created_at", ["polymarketMarketId", "createdAt"])
    .index("by_created_at", ["createdAt"]),

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
    // These fields may exist on older stored tweet documents (e.g. from earlier ingestion versions).
    // Keep them optional so schema validation doesn't fail on existing data.
    authorVerified: v.optional(v.union(v.boolean(), v.null())),
    contextAnnotations: v.optional(v.union(v.array(v.any()), v.null())),
    entities: v.optional(v.union(v.any(), v.null())),
    isQuoteTweet: v.optional(v.union(v.boolean(), v.null())),
    language: v.optional(v.union(v.string(), v.null())),
    mediaUrls: v.optional(v.union(v.array(v.string()), v.null())),
    quoteCount: v.optional(v.union(v.number(), v.null())),
    quotedTweetId: v.optional(v.union(v.string(), v.null())),
    replyCount: v.optional(v.union(v.number(), v.null())),
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
    lastChance: v.union(v.number(), v.null()), // Last traded probability (0-100)
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

  youtubeVideos: defineTable({
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
    storedAt: v.number(),
  })
    .index("by_video_id", ["videoId"])
    .index("by_query_hash", ["queryHash"])
    .index("by_channel_id", ["channelId"])
    .index("by_published_at", ["publishedAt"]),

  // ============================================
  // LEARNING SYSTEM TABLES
  // ============================================

  // Track predictions with source contributions for learning
  predictions: defineTable({
    // Link to original query
    queryId: v.optional(v.id("queriesLog")),
    question: v.string(),

    // The prediction
    predictedProbability: v.number(), // 0-1 scale
    confidence: v.number(), // 0-1 scale

    // Source contributions (what each source said, for learning weights)
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
          sentiment: v.number(), // -1 to 1
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

    // Market reference for outcome tracking
    primaryMarketId: v.union(v.string(), v.null()),
    primaryMarketSource: v.union(v.string(), v.null()), // "polymarket" | "kalshi"
    marketCloseDate: v.union(v.number(), v.null()),

    // Outcome (filled in when market resolves)
    actualOutcome: v.union(v.boolean(), v.null()), // true = YES, false = NO
    outcomeRecordedAt: v.union(v.number(), v.null()),

    // Learning metrics
    brierScore: v.union(v.number(), v.null()), // (predicted - actual)², lower is better
    calibrationBucket: v.union(v.string(), v.null()), // "0-10", "10-20", etc for calibration curves

    // User feedback (faster signal than waiting for market resolution)
    userFeedback: v.union(v.string(), v.null()), // "accurate" | "inaccurate" | "partial" | null
    userFeedbackAt: v.union(v.number(), v.null()),
    userFeedbackNote: v.union(v.string(), v.null()),

    createdAt: v.number(),
  })
    .index("by_primary_market", ["primaryMarketId"])
    .index("by_outcome_pending", ["actualOutcome", "marketCloseDate"])
    .index("by_created_at", ["createdAt"])
    .index("by_user_feedback", ["userFeedback"]),

  // Store learned weights over time (versioned for rollback)
  learnedWeights: defineTable({
    version: v.number(),

    // The learned weights (sum to 1)
    weights: v.object({
      polymarket: v.number(),
      kalshi: v.number(),
      news: v.number(),
      twitter: v.number(),
      reddit: v.number(),
      youtube: v.number(),
    }),

    // Training metadata
    trainingSize: v.number(), // How many predictions used
    avgBrierScore: v.number(), // Average prediction error
    calibrationError: v.union(v.number(), v.null()), // Expected calibration error

    // Performance by source (which sources were most accurate)
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

    // Status
    isActive: v.boolean(), // Currently in use?
    notes: v.union(v.string(), v.null()),

    createdAt: v.number(),
  })
    .index("by_version", ["version"])
    .index("by_active", ["isActive"])
    .index("by_created_at", ["createdAt"]),

  // Track calibration over time (are we overconfident/underconfident?)
  calibrationSnapshots: defineTable({
    // Bucket data: for predictions in X% range, what % actually happened?
    buckets: v.array(
      v.object({
        range: v.string(), // "0-10", "10-20", etc
        predictedAvg: v.number(), // Average predicted probability in this bucket
        actualRate: v.number(), // Actual outcome rate
        sampleSize: v.number(),
      })
    ),

    // Overall metrics
    expectedCalibrationError: v.number(), // Lower is better calibrated
    overconfidenceScore: v.number(), // Positive = overconfident, negative = underconfident
    totalPredictions: v.number(),

    createdAt: v.number(),
  }).index("by_created_at", ["createdAt"]),

  // Normalized evidence layer across all providers/content types.
  evidenceItems: defineTable({
    claimKey: v.string(),
    sourceType: v.string(), // news|twitter|reddit|youtube|market|trends|perplexity|...
    sourceId: v.string(),
    url: v.union(v.string(), v.null()),
    title: v.union(v.string(), v.null()),
    content: v.union(v.string(), v.null()),
    publishedAt: v.union(v.number(), v.null()),
    ingestedAt: v.number(),
    relevanceScore: v.union(v.number(), v.null()),
    stanceScore: v.union(v.number(), v.null()),
    credibilityScore: v.union(v.number(), v.null()),
    freshnessScore: v.union(v.number(), v.null()),
    dedupeHash: v.string(),
    metadata: v.optional(v.any()),
  })
    .index("by_claim_key", ["claimKey"])
    .index("by_dedupe_hash", ["dedupeHash"])
    .index("by_source_type", ["sourceType"])
    .index("by_ingested_at", ["ingestedAt"]),

  // Tracks end-to-end fact-check execution runs for observability/debugging.
  factCheckRuns: defineTable({
    question: v.string(),
    mode: v.union(v.literal("fast"), v.literal("deep")),
    status: v.union(v.literal("started"), v.literal("completed"), v.literal("failed")),
    model: v.union(v.string(), v.null()),
    startedAt: v.number(),
    completedAt: v.union(v.number(), v.null()),
    durationMs: v.union(v.number(), v.null()),
    error: v.union(v.string(), v.null()),
    bestMarketId: v.union(v.string(), v.null()),
    confidence: v.union(v.number(), v.null()),
    providerFlags: v.optional(v.any()),
    metrics: v.optional(v.any()),
  })
    .index("by_started_at", ["startedAt"])
    .index("by_status", ["status"]),

  runEvents: defineTable({
    runId: v.id("factCheckRuns"),
    stage: v.string(),
    status: v.union(v.literal("started"), v.literal("progress"), v.literal("completed"), v.literal("failed")),
    message: v.string(),
    meta: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_run", ["runId"])
    .index("by_created_at", ["createdAt"]),
});
