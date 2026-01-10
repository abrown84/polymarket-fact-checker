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
    upsertTweet: any;
  };
  actions: {
    aiEmbed: { embedText: any };
  };
};

interface Tweet {
  id: string;
  text: string;
  author: string;
  authorUsername: string;
  createdAt: number;
  url: string;
  retweetCount: number | null;
  likeCount: number | null;
  relevanceScore: number | null;
}

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

/**
 * Search Twitter using Twitter API v2
 */
async function searchTwitterAPI(query: string, limit: number = 20): Promise<Tweet[]> {
  if (!TWITTER_BEARER_TOKEN) {
    console.log("[retrieveTwitter] TWITTER_BEARER_TOKEN not set, skipping Twitter API");
    return [];
  }

  try {
    // Build search query - focus on recent tweets with high engagement
    const searchQuery = query.split(" ").slice(0, 10).join(" ");
    
    // Twitter API v2 search endpoint
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(searchQuery)}&max_results=${Math.min(limit, 100)}&tweet.fields=created_at,public_metrics,author_id&expansions=author_id&user.fields=username,name`;
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${TWITTER_BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Handle rate limiting (429)
      if (response.status === 429) {
        console.warn(`[retrieveTwitter] Twitter API rate limited (429). Credentials valid but quota exceeded.`);
        // Return empty array - rate limiting is temporary
        return [];
      }
      
      // Handle authentication errors (401/403)
      if (response.status === 401 || response.status === 403) {
        console.error(`[retrieveTwitter] Twitter API authentication error: ${response.status}`);
        return [];
      }
      
      console.warn(`[retrieveTwitter] Twitter API error: ${response.status} ${errorText.substring(0, 200)}`);
      return [];
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }

    // Map users by ID for author lookup
    const usersMap: Record<string, any> = {};
    if (data.includes && data.includes.users) {
      data.includes.users.forEach((user: any) => {
        usersMap[user.id] = user;
      });
    }

    return data.data
      .filter((tweet: any) => tweet.text && !tweet.text.startsWith("RT @"))
      .map((tweet: any) => {
        const author = usersMap[tweet.author_id];
        return {
          id: tweet.id,
          text: tweet.text,
          author: author?.name || "Unknown",
          authorUsername: author?.username || "unknown",
          createdAt: tweet.created_at ? new Date(tweet.created_at).getTime() : Date.now(),
          url: `https://twitter.com/${author?.username || "unknown"}/status/${tweet.id}`,
          retweetCount: tweet.public_metrics?.retweet_count || null,
          likeCount: tweet.public_metrics?.like_count || null,
          relevanceScore: null,
        };
      });
  } catch (error) {
    console.error("[retrieveTwitter] Twitter API error:", error);
    return [];
  }
}

/**
 * Score tweet relevance using embeddings
 */
async function scoreRelevance(
  tweets: Tweet[],
  queryEmbedding: number[],
  embedAction: any
): Promise<Tweet[]> {
  const scoredTweets: Tweet[] = [];

  for (const tweet of tweets) {
    try {
      // Embed tweet text
      const tweetEmbedding = await embedAction({ text: tweet.text });
      
      // Compute cosine similarity
      let similarity = 0;
      if (tweetEmbedding && Array.isArray(tweetEmbedding) && tweetEmbedding.length === queryEmbedding.length) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < queryEmbedding.length; i++) {
          dotProduct += queryEmbedding[i] * tweetEmbedding[i];
          normA += queryEmbedding[i] * queryEmbedding[i];
          normB += tweetEmbedding[i] * tweetEmbedding[i];
        }
        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        similarity = denominator > 0 ? dotProduct / denominator : 0;
      }

      scoredTweets.push({
        ...tweet,
        relevanceScore: similarity,
      });
    } catch (error) {
      console.error(`[retrieveTwitter] Error scoring tweet ${tweet.id}:`, error);
      scoredTweets.push(tweet);
    }
  }

  return scoredTweets;
}

/**
 * Retrieve relevant tweets for a parsed claim
 */
export const retrieveTwitter = action({
  args: {
    parsedClaim: v.any(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Tweet[]> => {
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
    const queryHash = hashString(`twitter:${queryText}`);
    const cached = await ctx.runQuery(internalApi.queries.getCache, {
      key: `twitter:${queryHash}`,
    });

    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[retrieveTwitter] Returning cached tweets for query hash ${queryHash}`);
      return cached.value as Tweet[];
    }

    // Embed query for relevance scoring
    const queryEmbedding: number[] = await ctx.runAction(internalApi.actions.aiEmbed.embedText, {
      text: queryText,
    });

    // Fetch tweets from Twitter API
    const tweets = await searchTwitterAPI(queryText, limit * 2); // Fetch more to filter

    if (tweets.length === 0) {
      console.log(`[retrieveTwitter] No tweets found for query`);
      return [];
    }

    // Score relevance
    const scoredTweets = await scoreRelevance(
      tweets,
      queryEmbedding,
      (args: { text: string }) => ctx.runAction(internalApi.actions.aiEmbed.embedText, args)
    );

    // Sort by relevance and engagement
    scoredTweets.sort((a, b) => {
      const scoreA = (a.relevanceScore || 0) * 0.6 + 
                     (a.likeCount ? Math.min(a.likeCount / 1000, 0.3) : 0) +
                     (a.retweetCount ? Math.min(a.retweetCount / 500, 0.1) : 0);
      const scoreB = (b.relevanceScore || 0) * 0.6 + 
                     (b.likeCount ? Math.min(b.likeCount / 1000, 0.3) : 0) +
                     (b.retweetCount ? Math.min(b.retweetCount / 500, 0.1) : 0);
      return scoreB - scoreA;
    });

    // Take top N tweets
    const topTweets = scoredTweets.slice(0, limit);

    // Store in cache (30 minutes TTL for Twitter - more dynamic than news)
    const now = Date.now();
    await ctx.runMutation(internalApi.mutations.setCache, {
      key: `twitter:${queryHash}`,
      value: topTweets,
      expiresAt: now + 30 * 60 * 1000,
      updatedAt: now,
    });

    // Store tweets in database for future reference
    for (const tweet of topTweets) {
      try {
        await ctx.runMutation(internalApi.mutations.upsertTweet, {
          tweetId: tweet.id,
          text: tweet.text,
          author: tweet.author,
          authorUsername: tweet.authorUsername,
          createdAt: tweet.createdAt,
          url: tweet.url,
          retweetCount: tweet.retweetCount,
          likeCount: tweet.likeCount,
          relevanceScore: tweet.relevanceScore,
          queryHash,
        });
      } catch (error) {
        console.error(`[retrieveTwitter] Error storing tweet ${tweet.id}:`, error);
      }
    }

    console.log(`[retrieveTwitter] Retrieved ${topTweets.length} tweets for query`);
    return topTweets;
  },
});

