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
    upsertInstagramPost: any;
  };
  actions: {
    aiEmbed: { embedText: any };
  };
};

interface InstagramPost {
  id: string;
  caption: string | null;
  author: string;
  authorUsername: string;
  likeCount: number | null;
  commentCount: number | null;
  createdAt: number;
  url: string;
  mediaType: string;
  relevanceScore: number | null;
}

const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;

/**
 * Search Instagram using Instagram Graph API
 */
async function searchInstagramAPI(query: string, limit: number = 20): Promise<InstagramPost[]> {
  if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_APP_ID) {
    console.log("[retrieveInstagram] Instagram API credentials not set, skipping Instagram");
    return [];
  }

  try {
    // Instagram Graph API search endpoint
    // Note: Instagram Basic Display API has limited search capabilities
    // This uses Graph API which requires business/creator account
    const searchQuery = query.split(" ").slice(0, 10).join(" ");
    
    // Search hashtags and locations
    const hashtagUrl = `https://graph.instagram.com/v18.0/ig_hashtag_search?q=${encodeURIComponent(searchQuery)}&access_token=${INSTAGRAM_ACCESS_TOKEN}`;
    
    const hashtagResponse = await fetch(hashtagUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!hashtagResponse.ok) {
      console.warn(`[retrieveInstagram] Instagram API error: ${hashtagResponse.status}`);
      return [];
    }

    const hashtagData = await hashtagResponse.json();
    const posts: InstagramPost[] = [];

    // If we found a hashtag, get recent media
    if (hashtagData.data && hashtagData.data.length > 0) {
      const hashtagId = hashtagData.data[0].id;
      const mediaUrl = `https://graph.instagram.com/v18.0/${hashtagId}/recent_media?fields=id,caption,like_count,comments_count,timestamp,media_type,permalink&limit=${limit}&access_token=${INSTAGRAM_ACCESS_TOKEN}`;
      
      const mediaResponse = await fetch(mediaUrl, {
        signal: AbortSignal.timeout(10000),
      });

      if (mediaResponse.ok) {
        const mediaData = await mediaResponse.json();
        
        if (mediaData.data && Array.isArray(mediaData.data)) {
          for (const item of mediaData.data) {
            // Get user info for each post
            const userUrl = `https://graph.instagram.com/v18.0/${item.id}?fields=username&access_token=${INSTAGRAM_ACCESS_TOKEN}`;
            const userResponse = await fetch(userUrl, { signal: AbortSignal.timeout(5000) });
            const userData = userResponse.ok ? await userResponse.json() : { username: "unknown" };

            posts.push({
              id: item.id,
              caption: item.caption || null,
              author: userData.username || "unknown",
              authorUsername: userData.username || "unknown",
              likeCount: item.like_count || null,
              commentCount: item.comments_count || null,
              createdAt: item.timestamp ? new Date(item.timestamp).getTime() : Date.now(),
              url: item.permalink || `https://www.instagram.com/p/${item.id}/`,
              mediaType: item.media_type || "IMAGE",
              relevanceScore: null,
            });
          }
        }
      }
    }

    return posts;
  } catch (error) {
    console.error("[retrieveInstagram] Instagram API error:", error);
    return [];
  }
}

/**
 * Score post relevance using embeddings
 */
async function scoreRelevance(
  posts: InstagramPost[],
  queryEmbedding: number[],
  embedAction: any
): Promise<InstagramPost[]> {
  const scoredPosts: InstagramPost[] = [];

  for (const post of posts) {
    try {
      // Embed post caption
      const caption = post.caption || "";
      const postEmbedding = await embedAction({ text: caption });
      
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
      console.error(`[retrieveInstagram] Error scoring post ${post.id}:`, error);
      scoredPosts.push(post);
    }
  }

  return scoredPosts;
}

/**
 * Retrieve relevant Instagram posts for a parsed claim
 */
export const retrieveInstagram = action({
  args: {
    parsedClaim: v.any(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<InstagramPost[]> => {
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
    const queryHash = hashString(`instagram:${queryText}`);
    const cached = await ctx.runQuery(internalApi.queries.getCache, {
      key: `instagram:${queryHash}`,
    });

    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[retrieveInstagram] Returning cached posts for query hash ${queryHash}`);
      return cached.value as InstagramPost[];
    }

    // Embed query for relevance scoring
    const queryEmbedding: number[] = await ctx.runAction(internalApi.actions.aiEmbed.embedText, {
      text: queryText,
    });

    // Fetch posts from Instagram API
    const posts = await searchInstagramAPI(queryText, limit * 2);

    if (posts.length === 0) {
      console.log(`[retrieveInstagram] No posts found for query`);
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
                     (a.likeCount ? Math.min(a.likeCount / 10000, 0.3) : 0) +
                     (a.commentCount ? Math.min(a.commentCount / 1000, 0.2) : 0);
      const scoreB = (b.relevanceScore || 0) * 0.5 + 
                     (b.likeCount ? Math.min(b.likeCount / 10000, 0.3) : 0) +
                     (b.commentCount ? Math.min(b.commentCount / 1000, 0.2) : 0);
      return scoreB - scoreA;
    });

    // Take top N posts
    const topPosts = scoredPosts.slice(0, limit);

    // Store in cache (30 minutes TTL)
    const now = Date.now();
    await ctx.runMutation(internalApi.mutations.setCache, {
      key: `instagram:${queryHash}`,
      value: topPosts,
      expiresAt: now + 30 * 60 * 1000,
      updatedAt: now,
    });

    // Store posts in database
    for (const post of topPosts) {
      try {
        await ctx.runMutation(internalApi.mutations.upsertInstagramPost, {
          postId: post.id,
          caption: post.caption,
          author: post.author,
          authorUsername: post.authorUsername,
          likeCount: post.likeCount,
          commentCount: post.commentCount,
          createdAt: post.createdAt,
          url: post.url,
          mediaType: post.mediaType,
          relevanceScore: post.relevanceScore,
          queryHash,
        });
      } catch (error) {
        console.error(`[retrieveInstagram] Error storing post ${post.id}:`, error);
      }
    }

    console.log(`[retrieveInstagram] Retrieved ${topPosts.length} Instagram posts for query`);
    return topPosts;
  },
});



