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
    upsertTikTokVideo: any;
  };
  actions: {
    aiEmbed: { embedText: any };
  };
};

interface TikTokVideo {
  id: string;
  description: string;
  author: string;
  authorUsername: string;
  likeCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
  viewCount: number | null;
  createdAt: number;
  url: string;
  relevanceScore: number | null;
}

const TIKTOK_API_KEY = process.env.TIKTOK_API_KEY;
const TIKTOK_API_SECRET = process.env.TIKTOK_API_SECRET;

/**
 * Search TikTok using TikTok API (if available) or web scraping fallback
 */
async function searchTikTokAPI(query: string, limit: number = 20): Promise<TikTokVideo[]> {
  // TikTok Research API requires authentication
  // For now, we'll use a placeholder that can be extended with actual API integration
  if (!TIKTOK_API_KEY || !TIKTOK_API_SECRET) {
    console.log("[retrieveTikTok] TikTok API credentials not set, skipping TikTok");
    return [];
  }

  try {
    // TikTok Research API endpoint for video search
    // Note: This is a placeholder - actual implementation depends on TikTok API version
    const searchQuery = query.split(" ").slice(0, 10).join(" ");
    
    // TikTok Research API v2 endpoint (example)
    const url = `https://open.tiktokapis.com/v2/research/video/query/?fields=video_id,video_description,username,like_count,comment_count,share_count,view_count,create_time`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TIKTOK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: {
          and: [
            {
              operation: "IN",
              field_name: "keyword_list",
              field_values: searchQuery.split(" "),
            },
          ],
        },
        max_count: limit,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[retrieveTikTok] TikTok API error: ${response.status} ${errorText}`);
      return [];
    }

    const data = await response.json();
    
    if (!data.data || !data.data.videos || !Array.isArray(data.data.videos)) {
      return [];
    }

    return data.data.videos.map((video: any) => ({
      id: video.video_id || video.id,
      description: video.video_description || video.description || "",
      author: video.username || video.author || "unknown",
      authorUsername: video.username || "unknown",
      likeCount: video.like_count || null,
      commentCount: video.comment_count || null,
      shareCount: video.share_count || null,
      viewCount: video.view_count || null,
      createdAt: video.create_time ? new Date(video.create_time).getTime() : Date.now(),
      url: `https://www.tiktok.com/@${video.username || "unknown"}/video/${video.video_id || video.id}`,
      relevanceScore: null,
    }));
  } catch (error) {
    console.error("[retrieveTikTok] TikTok API error:", error);
    return [];
  }
}

/**
 * Score video relevance using embeddings
 */
async function scoreRelevance(
  videos: TikTokVideo[],
  queryEmbedding: number[],
  embedAction: any
): Promise<TikTokVideo[]> {
  const scoredVideos: TikTokVideo[] = [];

  for (const video of videos) {
    try {
      // Embed video description
      const videoEmbedding = await embedAction({ text: video.description });
      
      // Compute cosine similarity
      let similarity = 0;
      if (videoEmbedding && Array.isArray(videoEmbedding) && videoEmbedding.length === queryEmbedding.length) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < queryEmbedding.length; i++) {
          dotProduct += queryEmbedding[i] * videoEmbedding[i];
          normA += queryEmbedding[i] * queryEmbedding[i];
          normB += videoEmbedding[i] * videoEmbedding[i];
        }
        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        similarity = denominator > 0 ? dotProduct / denominator : 0;
      }

      scoredVideos.push({
        ...video,
        relevanceScore: similarity,
      });
    } catch (error) {
      console.error(`[retrieveTikTok] Error scoring video ${video.id}:`, error);
      scoredVideos.push(video);
    }
  }

  return scoredVideos;
}

/**
 * Retrieve relevant TikTok videos for a parsed claim
 */
export const retrieveTikTok = action({
  args: {
    parsedClaim: v.any(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<TikTokVideo[]> => {
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
    const queryHash = hashString(`tiktok:${queryText}`);
    const cached = await ctx.runQuery(internalApi.queries.getCache, {
      key: `tiktok:${queryHash}`,
    });

    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[retrieveTikTok] Returning cached videos for query hash ${queryHash}`);
      return cached.value as TikTokVideo[];
    }

    // Embed query for relevance scoring
    const queryEmbedding: number[] = await ctx.runAction(internalApi.actions.aiEmbed.embedText, {
      text: queryText,
    });

    // Fetch videos from TikTok API
    const videos = await searchTikTokAPI(queryText, limit * 2);

    if (videos.length === 0) {
      console.log(`[retrieveTikTok] No videos found for query`);
      return [];
    }

    // Score relevance
    const scoredVideos = await scoreRelevance(
      videos,
      queryEmbedding,
      (args: { text: string }) => ctx.runAction(internalApi.actions.aiEmbed.embedText, args)
    );

    // Sort by relevance and engagement
    scoredVideos.sort((a, b) => {
      const scoreA = (a.relevanceScore || 0) * 0.5 + 
                     (a.likeCount ? Math.min(a.likeCount / 100000, 0.3) : 0) +
                     (a.viewCount ? Math.min(a.viewCount / 1000000, 0.2) : 0);
      const scoreB = (b.relevanceScore || 0) * 0.5 + 
                     (b.likeCount ? Math.min(b.likeCount / 100000, 0.3) : 0) +
                     (b.viewCount ? Math.min(b.viewCount / 1000000, 0.2) : 0);
      return scoreB - scoreA;
    });

    // Take top N videos
    const topVideos = scoredVideos.slice(0, limit);

    // Store in cache (30 minutes TTL)
    const now = Date.now();
    await ctx.runMutation(internalApi.mutations.setCache, {
      key: `tiktok:${queryHash}`,
      value: topVideos,
      expiresAt: now + 30 * 60 * 1000,
      updatedAt: now,
    });

    // Store videos in database
    for (const video of topVideos) {
      try {
        await ctx.runMutation(internalApi.mutations.upsertTikTokVideo, {
          videoId: video.id,
          description: video.description,
          author: video.author,
          authorUsername: video.authorUsername,
          likeCount: video.likeCount,
          commentCount: video.commentCount,
          shareCount: video.shareCount,
          viewCount: video.viewCount,
          createdAt: video.createdAt,
          url: video.url,
          relevanceScore: video.relevanceScore,
          queryHash,
        });
      } catch (error) {
        console.error(`[retrieveTikTok] Error storing video ${video.id}:`, error);
      }
    }

    console.log(`[retrieveTikTok] Retrieved ${topVideos.length} TikTok videos for query`);
    return topVideos;
  },
});



