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
