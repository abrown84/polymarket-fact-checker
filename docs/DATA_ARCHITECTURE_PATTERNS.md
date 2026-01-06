# How Analysis Sites Handle Data

This document outlines common data handling patterns used by successful analysis platforms (Bloomberg, Yahoo Finance, Google News, Polymarket, etc.) and how they apply to this codebase.

## 1. Multi-Layer Caching Strategy

### Pattern
Analysis sites use **3-4 layers of caching**:

1. **Browser Cache** (CDN/Edge) - Static assets, rarely changing data
2. **Application Cache** (Redis/Memcached) - Frequently accessed queries, 5-15 min TTL
3. **Database Cache** (Current: Convex cache table) - Query results, 30 min - 1 hour TTL
4. **Computed Aggregations** - Pre-calculated metrics, updated periodically

### Current Implementation
```typescript
// ✅ You have: Database-level caching with TTL
cache: {
  key: string,
  value: any,
  expiresAt: number,
  updatedAt: number
}

// TTL Examples:
- News: 1 hour
- Twitter: 30 minutes  
- Reddit: 30 minutes
- Google Trends: 1 hour
- Kalshi Markets: 5 minutes
```

### Recommended Improvements

1. **Add Aggregation Tables** - Pre-compute popular queries:
```typescript
// New table: aggregatedStats
aggregatedStats: {
  period: "hourly" | "daily",
  timestamp: number,
  topMarkets: Market[],
  topNews: NewsArticle[],
  topTweets: Tweet[],
  trendingKeywords: string[],
  updatedAt: number
}
```

2. **Implement Cache Warming** - Pre-fetch likely queries:
```typescript
// Cron job that pre-fetches trending topics
crons.interval(
  "warm-trending-cache",
  { minutes: 15 },
  async () => {
    const trends = await getTopTrends(10);
    for (const trend of trends) {
      await fetchAndCacheData(trend.keyword);
    }
  }
);
```

## 2. Data Ingestion Patterns

### Pattern: Hybrid Batch + Real-Time

**Batch Processing** (Current):
- ✅ Scheduled ingestion every 6 hours
- ✅ Bulk processing with cursors
- ✅ Background jobs for heavy operations

**Real-Time Updates** (Missing):
- WebSocket connections for live prices
- Event-driven updates for breaking news
- Incremental updates instead of full refreshes

### Recommended Architecture

```typescript
// 1. Batch Ingestion (Current - Keep)
crons.interval("ingest-markets", { hours: 6 }, ingestMarkets);

// 2. Real-Time Updates (Add)
// WebSocket connection to Polymarket for live prices
// Subscribe to specific markets that are "hot" (recently queried)

// 3. Incremental Updates (Add)
// Instead of re-fetching all markets, only fetch:
// - New markets (created since last run)
// - Updated markets (volume/price changes > threshold)
// - Markets expiring soon (within 7 days)
```

## 3. Data Freshness Strategy

### Pattern: Tiered Freshness

Different data types need different update frequencies:

| Data Type | Update Frequency | Staleness Threshold |
|-----------|------------------|---------------------|
| Market Prices | Real-time (WebSocket) | 5 seconds |
| Market Metadata | Every 2 hours | 6 hours |
| News Articles | Every 15 minutes | 1 hour |
| Social Media | Every 30 minutes | 2 hours |
| Trends | Every hour | 4 hours |
| Historical Data | Daily | 24 hours |

### Current Implementation
```typescript
// ✅ You track: lastIngestedAt, lastUpdated
// ⚠️ Missing: Staleness checks in queries
```

### Recommended: Add Staleness Checks

```typescript
export const getMarket = query({
  args: { marketId: v.string() },
  handler: async (ctx, args) => {
    const market = await ctx.db
      .query("markets")
      .withIndex("by_polymarket_market_id", q => q.eq("polymarketMarketId", args.marketId))
      .first();
    
    // Check if data is stale
    const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
    if (market && market.lastIngestedAt < sixHoursAgo) {
      // Trigger background refresh
      await ctx.scheduler.runAfter(0, internal.actions.ingestMarkets.refreshMarket, {
        marketId: args.marketId
      });
    }
    
    return market;
  }
});
```

## 4. Query Optimization

### Pattern: Pre-compute + Materialized Views

Analysis sites pre-compute expensive queries:

1. **Popular Markets** - Pre-sorted by volume, updated hourly
2. **Trending Content** - Pre-calculated engagement scores
3. **Aggregated Stats** - Dashboard metrics computed once, cached

### Current Implementation
```typescript
// ✅ You have: getPopularMarkets with sorting
// ⚠️ Sorting happens on every query (expensive)
```

### Recommended: Materialized Popular Markets

```typescript
// New table: popularMarketsSnapshot
popularMarketsSnapshot: {
  rank: number,
  marketId: string,
  volume: number,
  liquidity: number,
  updatedAt: number
}

// Update every hour via cron
crons.interval(
  "update-popular-markets",
  { hours: 1 },
  async () => {
    const markets = await getAllMarkets();
    const sorted = markets.sort((a, b) => (b.volume || 0) - (a.volume || 0));
    
    // Store top 100
    await updatePopularMarketsSnapshot(sorted.slice(0, 100));
  }
);
```

## 5. Data Aggregation & Pre-computation

### Pattern: Time-Series Aggregations

For analytics dashboards, pre-compute:
- Hourly aggregations (last 24 hours)
- Daily aggregations (last 30 days)
- Weekly aggregations (last 12 weeks)

### Recommended: Add Aggregation Tables

```typescript
// Time-series data for analytics
marketStatsHourly: {
  hour: number, // Timestamp of hour start
  totalMarkets: number,
  totalVolume: number,
  activeMarkets: number,
  avgLiquidity: number
}

// Update every hour
crons.interval(
  "aggregate-hourly-stats",
  { hours: 1 },
  async () => {
    const stats = await computeHourlyStats();
    await upsertMarketStatsHourly(stats);
  }
);
```

## 6. Rate Limiting & API Management

### Pattern: Smart Rate Limiting

1. **Priority Queues** - Important queries first
2. **Backoff Strategies** - Exponential backoff on failures
3. **Request Batching** - Combine multiple requests
4. **Circuit Breakers** - Stop requests if API is down

### Current Implementation
```typescript
// ✅ You have: retryWithBackoff in utils.ts
// ⚠️ Missing: Priority queues, circuit breakers
```

### Recommended: Add API Management

```typescript
// API rate limiter with priority
class APIRateLimiter {
  private queues: {
    high: Request[],
    medium: Request[],
    low: Request[]
  };
  
  async execute(request: Request, priority: 'high' | 'medium' | 'low') {
    // Add to appropriate queue
    // Process high priority first
    // Implement exponential backoff
  }
}
```

## 7. Data Deduplication

### Pattern: Content Fingerprinting

Prevent storing duplicate content:
- Hash-based deduplication (URL, content hash)
- Fuzzy matching for similar content
- Merge updates instead of creating duplicates

### Current Implementation
```typescript
// ✅ You have: upsert patterns (upsertMarket, upsertTweet)
// ⚠️ Missing: Content hashing for deduplication
```

### Recommended: Add Content Hashing

```typescript
// Add hash field to prevent duplicates
newsArticles: {
  // ... existing fields
  contentHash: string, // Hash of title + snippet
  urlHash: string,     // Hash of URL
}

// Before inserting, check:
const existing = await ctx.db
  .query("newsArticles")
  .withIndex("by_url_hash", q => q.eq("urlHash", hashUrl(url)))
  .first();

if (existing) {
  // Update instead of insert
  await ctx.db.patch(existing._id, { ... });
} else {
  // Insert new
  await ctx.db.insert("newsArticles", { ... });
}
```

## 8. Background Processing

### Pattern: Async Job Queues

Heavy operations should be async:
- Data ingestion
- Embedding generation
- Trend analysis
- Aggregation computation

### Current Implementation
```typescript
// ✅ You have: Actions for async operations
// ✅ You have: Cron jobs for scheduled tasks
// ⚠️ Missing: Job queue for user-triggered heavy operations
```

### Recommended: Add Job Queue

```typescript
// Job queue table
jobs: {
  type: "fetch_trends" | "generate_embeddings" | "aggregate_stats",
  status: "pending" | "processing" | "completed" | "failed",
  priority: number,
  payload: any,
  createdAt: number,
  startedAt: number | null,
  completedAt: number | null,
  error: string | null
}

// Worker that processes jobs
crons.interval(
  "process-jobs",
  { minutes: 1 },
  async () => {
    const jobs = await getPendingJobs({ limit: 10 });
    for (const job of jobs) {
      await processJob(job);
    }
  }
);
```

## 9. Data Partitioning

### Pattern: Time-Based Partitioning

For large datasets, partition by time:
- Current data (hot) - Fast queries
- Historical data (cold) - Archive after 90 days
- Aggregated data - Pre-computed summaries

### Recommended: Add Data Lifecycle

```typescript
// Archive old data
crons.interval(
  "archive-old-data",
  { days: 1 },
  async () => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    
    // Move old news to archive
    const oldNews = await ctx.db
      .query("newsArticles")
      .filter(q => q.lt("publishedAt", ninetyDaysAgo))
      .collect();
    
    // Archive or delete
    await archiveData(oldNews);
  }
);
```

## 10. Monitoring & Observability

### Pattern: Data Quality Metrics

Track:
- Data freshness (last update time)
- Data completeness (missing fields)
- API health (success/failure rates)
- Query performance (latency, cache hit rates)

### Recommended: Add Monitoring

```typescript
// Metrics table
metrics: {
  type: "api_call" | "query" | "cache_hit",
  source: "polymarket" | "twitter" | "news",
  success: boolean,
  latency: number,
  timestamp: number
}

// Dashboard query
export const getDataHealth = query({
  handler: async (ctx) => {
    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    const metrics = await ctx.db
      .query("metrics")
      .filter(q => q.gte("timestamp", last24h))
      .collect();
    
    return {
      apiSuccessRate: calculateSuccessRate(metrics),
      avgLatency: calculateAvgLatency(metrics),
      cacheHitRate: calculateCacheHitRate(metrics),
      dataFreshness: await getDataFreshness()
    };
  }
});
```

## Summary: Recommended Next Steps

1. **Immediate (High Impact)**:
   - Add staleness checks to queries
   - Implement materialized popular markets
   - Add content hashing for deduplication

2. **Short-term (Medium Impact)**:
   - Create aggregation tables for dashboard stats
   - Add job queue for async operations
   - Implement cache warming for trending topics

3. **Long-term (Scalability)**:
   - Add WebSocket support for real-time prices
   - Implement data partitioning/archiving
   - Add comprehensive monitoring

## References

- **Bloomberg Terminal**: Real-time data with 3-layer caching
- **Yahoo Finance**: Pre-computed aggregations, 15-min cache
- **Google News**: Content deduplication, freshness scoring
- **Polymarket**: WebSocket for live prices, batch for metadata
- **Reddit Analytics**: Engagement scoring, time-decay algorithms





