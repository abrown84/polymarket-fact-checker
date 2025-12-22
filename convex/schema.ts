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
});
