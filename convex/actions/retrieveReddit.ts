"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { hashString, ParsedClaim } from "../utils";

// Type-safe internal API references
const internalApi = internal as {
  queries: {
    getCache: any;
  };
  mutations: {
    setCache: any;
    upsertRedditPost: any;
  };
  actions: {
    aiEmbed: { embedText: any };
  };
};

interface RedditPost {
  id: string;
  title: string;
  text: string | null;
  author: string;
  subreddit: string;
  score: number;
  numComments: number;
  createdAt: number;
  url: string;
  permalink: string;
  relevanceScore: number | null;
}

/**
 * Search Reddit using Reddit API (no auth required for read-only)
 */
async function searchRedditAPI(query: string, limit: number = 20): Promise<RedditPost[]> {
  try {
    // Reddit search endpoint - no auth needed for public data
    const searchQuery = query.split(" ").slice(0, 10).join(" ");
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(searchQuery)}&limit=${Math.min(limit, 100)}&sort=relevance&t=week`;
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "PolymarketFactChecker/1.0 (by /u/polymarket-fact-checker)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`[retrieveReddit] Reddit API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    if (!data.data || !data.data.children || !Array.isArray(data.data.children)) {
      return [];
    }

    return data.data.children
      .filter((child: any) => child.data && !child.data.over_18) // Filter NSFW
      .map((child: any) => {
        const post = child.data;
        return {
          id: post.id,
          title: post.title,
          text: post.selftext || null,
          author: post.author || "unknown",
          subreddit: post.subreddit || "unknown",
          score: post.score || 0,
          numComments: post.num_comments || 0,
          createdAt: post.created_utc ? post.created_utc * 1000 : Date.now(),
          url: post.url || `https://reddit.com${post.permalink}`,
          permalink: `https://reddit.com${post.permalink}`,
          relevanceScore: null,
        };
      });
  } catch (error) {
    console.error("[retrieveReddit] Reddit API error:", error);
    return [];
  }
}

/**
 * Score post relevance using embeddings
 */
async function scoreRelevance(
  posts: RedditPost[],
  queryEmbedding: number[],
  embedAction: any
): Promise<RedditPost[]> {
  const scoredPosts: RedditPost[] = [];

  for (const post of posts) {
    try {
      // Create text for embedding (title + text)
      const postText = [post.title, post.text].filter(Boolean).join(" ");
      
      // Embed post text
      const postEmbedding = await embedAction({ text: postText });
      
      // Compute cosine similarity
      let similarity = 0;
      if (postEmbedding && Array.isArray(postEmbedding) && postEmbedding.length === queryEmbedding.length) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < queryEmbedding.length; i++) {
          dotProduct += queryEmbedding[i] * postEmbedding[i];
          normA += queryEmbedding[i] * queryEmbedding[i];
          normB += postEmbedding[i] * postEmbedding[i];
        }
        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        similarity = denominator > 0 ? dotProduct / denominator : 0;
      }

      scoredPosts.push({
        ...post,
        relevanceScore: similarity,
      });
    } catch (error) {
      console.error(`[retrieveReddit] Error scoring post ${post.id}:`, error);
      scoredPosts.push(post);
    }
  }

  return scoredPosts;
}

/**
 * Retrieve relevant Reddit posts for a parsed claim
 */
export const retrieveReddit = action({
  args: {
    parsedClaim: v.any(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<RedditPost[]> => {
    const parsedClaim = args.parsedClaim as ParsedClaim;
    const limit = args.limit || 15;

    // Build query text from parsed claim
    const queryText = [
      parsedClaim.claim,
      ...parsedClaim.must_include,
      ...parsedClaim.entities.map((e) => e.name),
    ]
      .filter(Boolean)
      .join(" ");

    // Check cache first
    const queryHash = hashString(`reddit:${queryText}`);
    const cached = await ctx.runQuery(internalApi.queries.getCache, {
      key: `reddit:${queryHash}`,
    });

    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[retrieveReddit] Returning cached posts for query hash ${queryHash}`);
      return cached.value as RedditPost[];
    }

    // Embed query for relevance scoring
    const queryEmbedding: number[] = await ctx.runAction(internalApi.actions.aiEmbed.embedText, {
      text: queryText,
    });

    // Fetch posts from Reddit API
    const posts = await searchRedditAPI(queryText, limit * 2); // Fetch more to filter

    if (posts.length === 0) {
      console.log(`[retrieveReddit] No posts found for query`);
      return [];
    }

    // Score relevance
    const scoredPosts = await scoreRelevance(
      posts,
      queryEmbedding,
      (args: { text: string }) => ctx.runAction(internalApi.actions.aiEmbed.embedText, args)
    );

    // Sort by relevance and engagement
    scoredPosts.sort((a, b) => {
      const scoreA = (a.relevanceScore || 0) * 0.5 + 
                     Math.min(a.score / 1000, 0.3) +
                     Math.min(a.numComments / 100, 0.2);
      const scoreB = (b.relevanceScore || 0) * 0.5 + 
                     Math.min(b.score / 1000, 0.3) +
                     Math.min(b.numComments / 100, 0.2);
      return scoreB - scoreA;
    });

    // Take top N posts
    const topPosts = scoredPosts.slice(0, limit);

    // Store in cache (30 minutes TTL)
    const now = Date.now();
    await ctx.runMutation(internalApi.mutations.setCache, {
      key: `reddit:${queryHash}`,
      value: topPosts,
      expiresAt: now + 30 * 60 * 1000,
      updatedAt: now,
    });

    // Store posts in database
    for (const post of topPosts) {
      try {
        await ctx.runMutation(internalApi.mutations.upsertRedditPost, {
          postId: post.id,
          title: post.title,
          text: post.text,
          author: post.author,
          subreddit: post.subreddit,
          score: post.score,
          numComments: post.numComments,
          createdAt: post.createdAt,
          url: post.url,
          permalink: post.permalink,
          relevanceScore: post.relevanceScore,
          queryHash,
        });
      } catch (error) {
        console.error(`[retrieveReddit] Error storing post ${post.id}:`, error);
      }
    }

    console.log(`[retrieveReddit] Retrieved ${topPosts.length} Reddit posts for query`);
    return topPosts;
  },
});



