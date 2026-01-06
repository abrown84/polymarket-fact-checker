"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { hashString } from "../utils";

// Type-safe internal API references
const internalApi = internal as {
  queries: {
    getCache: any;
  };
  mutations: {
    setCache: any;
  };
  actions: {
    retrieveNews: { retrieveNews: any };
    retrieveTwitter: { retrieveTwitter: any };
    retrieveReddit: { retrieveReddit: any };
    retrieveGoogleTrends: { retrieveGoogleTrends: any };
    aiEmbed: { embedText: any };
  };
};

interface FeedItem {
  id: string;
  type: "news" | "tweet" | "reddit" | "trend";
  title: string;
  content: string;
  source: string;
  url: string;
  timestamp: number;
  category: "crypto" | "politics" | "sports" | "prediction-markets" | "general";
  relevanceScore: number;
  marketImpact?: {
    hasImpact: boolean;
    relatedMarkets?: string[];
    impactLevel?: "low" | "medium" | "high";
  };
  metadata?: {
    author?: string;
    engagement?: number;
    imageUrl?: string;
  };
}

/**
 * Categorize content using AI
 */
async function categorizeContent(
  title: string,
  content: string,
  embedAction: any
): Promise<"crypto" | "politics" | "sports" | "prediction-markets" | "general"> {
  const text = `${title} ${content}`.toLowerCase();
  
  // Simple keyword-based categorization (can be enhanced with AI)
  if (
    text.includes("bitcoin") || text.includes("crypto") || text.includes("ethereum") ||
    text.includes("blockchain") || text.includes("defi") || text.includes("nft") ||
    text.includes("btc") || text.includes("eth")
  ) {
    return "crypto";
  }
  
  if (
    text.includes("trump") || text.includes("biden") || text.includes("election") ||
    text.includes("president") || text.includes("senate") || text.includes("congress") ||
    text.includes("vote") || text.includes("democrat") || text.includes("republican")
  ) {
    return "politics";
  }
  
  if (
    text.includes("nfl") || text.includes("nba") || text.includes("super bowl") ||
    text.includes("championship") || text.includes("game") || text.includes("player") ||
    text.includes("team") || text.includes("sport")
  ) {
    return "sports";
  }
  
  if (
    text.includes("polymarket") || text.includes("prediction market") ||
    text.includes("kalshi") || text.includes("bet") || text.includes("odds")
  ) {
    return "prediction-markets";
  }
  
  return "general";
}

/**
 * Assess market impact of a feed item
 */
async function assessMarketImpact(
  item: FeedItem,
  embedAction: any
): Promise<{ hasImpact: boolean; relatedMarkets?: string[]; impactLevel?: "low" | "medium" | "high" }> {
  // Simple heuristic: if it mentions prediction markets or has high engagement, it likely has impact
  const text = `${item.title} ${item.content}`.toLowerCase();
  const hasMarketKeywords = text.includes("polymarket") || text.includes("prediction") || text.includes("market");
  const hasHighEngagement = (item.metadata?.engagement || 0) > 1000;
  
  if (hasMarketKeywords || hasHighEngagement) {
    return {
      hasImpact: true,
      impactLevel: hasHighEngagement ? "high" : hasMarketKeywords ? "medium" : "low",
    };
  }
  
  return { hasImpact: false };
}

/**
 * Get live feed of news and social media posts
 */
export const getLiveFeed = action({
  args: {
    category: v.optional(v.union(
      v.literal("all"),
      v.literal("crypto"),
      v.literal("politics"),
      v.literal("sports"),
      v.literal("prediction-markets")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ items: FeedItem[]; total: number }> => {
    const category = args.category || "all";
    const limit = args.limit || 50;

    // Check cache
    const cacheKey = `livefeed:${category}:${limit}`;
    const cached = await ctx.runQuery(internalApi.queries.getCache, {
      key: cacheKey,
    });

    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[getLiveFeed] Returning cached feed for category ${category}`);
      return cached.value as { items: FeedItem[]; total: number };
    }

    const feedItems: FeedItem[] = [];

    // Fetch news articles
    try {
      const newsArticles = await ctx.runAction(internalApi.actions.retrieveNews.retrieveNews, {
        parsedClaim: {
          claim: category === "all" ? "prediction markets" : category,
          type: "ongoing",
          time_window: { start: null, end: null },
          entities: [],
          must_include: [],
          must_exclude: [],
          ambiguities: [],
        },
        limit: 20,
      });

      for (const article of newsArticles) {
        const itemCategory = await categorizeContent(
          article.title,
          article.snippet || "",
          (args: { text: string }) => ctx.runAction(internalApi.actions.aiEmbed.embedText, args)
        );

        if (category === "all" || category === itemCategory) {
          const item: FeedItem = {
            id: `news-${article.url}`,
            type: "news",
            title: article.title,
            content: article.snippet || "",
            source: article.source,
            url: article.url,
            timestamp: article.publishedAt,
            category: itemCategory,
            relevanceScore: article.relevanceScore || 0.5,
            metadata: {
              imageUrl: undefined,
            },
          };

          item.marketImpact = await assessMarketImpact(
            item,
            (args: { text: string }) => ctx.runAction(internalApi.actions.aiEmbed.embedText, args)
          );

          feedItems.push(item);
        }
      }
    } catch (error) {
      console.error("[getLiveFeed] Error fetching news:", error);
    }

    // Fetch tweets
    try {
      const tweets = await ctx.runAction(internalApi.actions.retrieveTwitter.retrieveTwitter, {
        parsedClaim: {
          claim: category === "all" ? "prediction markets" : category,
          type: "ongoing",
          time_window: { start: null, end: null },
          entities: [],
          must_include: [],
          must_exclude: [],
          ambiguities: [],
        },
        limit: 20,
      });

      for (const tweet of tweets) {
        const itemCategory = await categorizeContent(
          tweet.text.substring(0, 100),
          tweet.text,
          (args: { text: string }) => ctx.runAction(internalApi.actions.aiEmbed.embedText, args)
        );

        if (category === "all" || category === itemCategory) {
          const item: FeedItem = {
            id: `tweet-${tweet.id}`,
            type: "tweet",
            title: `@${tweet.authorUsername}`,
            content: tweet.text,
            source: "Twitter/X",
            url: tweet.url,
            timestamp: tweet.createdAt,
            category: itemCategory,
            relevanceScore: tweet.relevanceScore || 0.5,
            metadata: {
              author: tweet.authorUsername,
              engagement: (tweet.likeCount || 0) + (tweet.retweetCount || 0),
            },
          };

          item.marketImpact = await assessMarketImpact(
            item,
            (args: { text: string }) => ctx.runAction(internalApi.actions.aiEmbed.embedText, args)
          );

          feedItems.push(item);
        }
      }
    } catch (error) {
      console.error("[getLiveFeed] Error fetching tweets:", error);
    }

    // Fetch Reddit posts
    try {
      const redditPosts = await ctx.runAction(internalApi.actions.retrieveReddit.retrieveReddit, {
        parsedClaim: {
          claim: category === "all" ? "prediction markets" : category,
          type: "ongoing",
          time_window: { start: null, end: null },
          entities: [],
          must_include: [],
          must_exclude: [],
          ambiguities: [],
        },
        limit: 20,
      });

      for (const post of redditPosts) {
        const itemCategory = await categorizeContent(
          post.title,
          post.text || "",
          (args: { text: string }) => ctx.runAction(internalApi.actions.aiEmbed.embedText, args)
        );

        if (category === "all" || category === itemCategory) {
          const item: FeedItem = {
            id: `reddit-${post.id}`,
            type: "reddit",
            title: post.title,
            content: post.text || "",
            source: `r/${post.subreddit}`,
            url: post.url,
            timestamp: post.createdAt,
            category: itemCategory,
            relevanceScore: post.relevanceScore || 0.5,
            metadata: {
              author: post.author,
              engagement: post.score + post.numComments,
            },
          };

          item.marketImpact = await assessMarketImpact(
            item,
            (args: { text: string }) => ctx.runAction(internalApi.actions.aiEmbed.embedText, args)
          );

          feedItems.push(item);
        }
      }
    } catch (error) {
      console.error("[getLiveFeed] Error fetching Reddit posts:", error);
    }

    // Sort by timestamp (newest first) and relevance
    feedItems.sort((a, b) => {
      const timeDiff = b.timestamp - a.timestamp;
      const relevanceDiff = b.relevanceScore - a.relevanceScore;
      // Prioritize recent items, but boost highly relevant items
      return timeDiff * 0.7 + relevanceDiff * 0.3;
    });

    // Take top N items
    const topItems = feedItems.slice(0, limit);

    // Cache for 5 minutes (live feed should be relatively fresh)
    const now = Date.now();
    await ctx.runMutation(internalApi.mutations.setCache, {
      key: cacheKey,
      value: { items: topItems, total: feedItems.length },
      expiresAt: now + 5 * 60 * 1000,
      updatedAt: now,
    });

    console.log(`[getLiveFeed] Returning ${topItems.length} items for category ${category}`);

    return {
      items: topItems,
      total: feedItems.length,
    };
  },
});
