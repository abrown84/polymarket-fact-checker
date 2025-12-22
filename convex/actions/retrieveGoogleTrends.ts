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
    upsertGoogleTrend: any;
  };
  actions: {
    aiEmbed: { embedText: any };
  };
};

interface GoogleTrend {
  keyword: string;
  searchInterest: number; // 0-100 scale
  relatedQueries: string[];
  relatedTopics: string[];
  timeRange: string;
  region: string;
  trendScore: number | null; // Calculated relevance score
}

/**
 * Fetch Google Trends data using Google Trends public endpoints
 * Note: Google Trends doesn't have an official API, so we use the public JSON endpoints
 */
async function fetchGoogleTrendsData(keywords: string[], timeRange: string = "today 12-m"): Promise<GoogleTrend[]> {
  try {
    const trends: GoogleTrend[] = [];

    for (const keyword of keywords.slice(0, 5)) { // Limit to 5 keywords to avoid rate limits
      try {
        // Use Google Trends interest over time endpoint
        // This is a public endpoint that returns JSON data
        const encodedKeyword = encodeURIComponent(keyword);
        
        // Build the request payload for Google Trends API
        const reqPayload = {
          comparisonItem: [{
            keyword: keyword,
            geo: "",
            time: timeRange,
          }],
          category: 0,
          property: "",
        };

        // Google Trends explore endpoint
        const exploreUrl = `https://trends.google.com/trends/api/explore?hl=en-US&req=${encodeURIComponent(JSON.stringify(reqPayload))}&tz=-480`;
        
        const exploreResponse = await fetch(exploreUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!exploreResponse.ok) {
          console.warn(`[retrieveGoogleTrends] Google Trends explore error for ${keyword}: ${exploreResponse.status}`);
          // Fallback: create a basic trend entry
          trends.push({
            keyword,
            searchInterest: 50, // Default medium interest
            relatedQueries: [],
            relatedTopics: [],
            timeRange,
            region: "US",
            trendScore: null,
          });
          continue;
        }

        // Google Trends returns JSON wrapped in a comment
        const exploreText = await exploreResponse.text();
        const jsonText = exploreText.replace(/^\)\]\}'\,/, "").trim();
        const exploreData = JSON.parse(jsonText);

        // Get widget tokens for interest over time
        let interestValue = 50; // Default
        const relatedQueries: string[] = [];
        const relatedTopics: string[] = [];

        if (exploreData.default && exploreData.default.timelineData) {
          const timelineData = exploreData.default.timelineData;
          if (timelineData.length > 0) {
            // Get average of last 12 data points
            const recentData = timelineData.slice(-12);
            const values = recentData
              .map((point: any) => point.value?.[0] || 0)
              .filter((v: number) => v > 0);
            if (values.length > 0) {
              interestValue = Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length);
            }
          }
        }

        // Try to get related queries
        if (exploreData.default?.relatedQueries?.default) {
          const topQueries = exploreData.default.relatedQueries.default.slice(0, 5);
          relatedQueries.push(...topQueries.map((q: any) => q.query || q.title || String(q)).filter(Boolean));
        }

        trends.push({
          keyword,
          searchInterest: interestValue,
          relatedQueries,
          relatedTopics,
          timeRange,
          region: "US",
          trendScore: null,
        });
      } catch (error) {
        console.error(`[retrieveGoogleTrends] Error fetching trend for ${keyword}:`, error);
        // Create a fallback entry
        trends.push({
          keyword,
          searchInterest: 50,
          relatedQueries: [],
          relatedTopics: [],
          timeRange,
          region: "US",
          trendScore: null,
        });
      }
    }

    return trends;
  } catch (error) {
    console.error("[retrieveGoogleTrends] Error fetching Google Trends:", error);
    return [];
  }
}

/**
 * Score trend relevance using embeddings
 */
async function scoreRelevance(
  trends: GoogleTrend[],
  queryEmbedding: number[],
  embedAction: any
): Promise<GoogleTrend[]> {
  const scoredTrends: GoogleTrend[] = [];

  for (const trend of trends) {
    try {
      // Create text for embedding (keyword + related queries)
      const trendText = [trend.keyword, ...trend.relatedQueries].filter(Boolean).join(" ");
      
      // Embed trend text
      const trendEmbedding = await embedAction({ text: trendText });
      
      // Compute cosine similarity
      let similarity = 0;
      if (trendEmbedding && Array.isArray(trendEmbedding) && trendEmbedding.length === queryEmbedding.length) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < queryEmbedding.length; i++) {
          dotProduct += queryEmbedding[i] * trendEmbedding[i];
          normA += queryEmbedding[i] * queryEmbedding[i];
          normB += trendEmbedding[i] * trendEmbedding[i];
        }
        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        similarity = denominator > 0 ? dotProduct / denominator : 0;
      }

      // Combine relevance with search interest
      const trendScore = similarity * 0.6 + (trend.searchInterest / 100) * 0.4;

      scoredTrends.push({
        ...trend,
        trendScore,
      });
    } catch (error) {
      console.error(`[retrieveGoogleTrends] Error scoring trend ${trend.keyword}:`, error);
      scoredTrends.push(trend);
    }
  }

  return scoredTrends;
}

/**
 * Retrieve relevant Google Trends data for a parsed claim
 */
export const retrieveGoogleTrends = action({
  args: {
    parsedClaim: v.any(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<GoogleTrend[]> => {
    const parsedClaim = args.parsedClaim as ParsedClaim;
    const limit = args.limit || 10;

    // Build keywords from parsed claim
    const keywords = [
      parsedClaim.claim,
      ...parsedClaim.must_include,
      ...parsedClaim.entities.map((e) => e.name),
    ]
      .filter(Boolean)
      .slice(0, 5); // Limit keywords for API calls

    // Check cache first
    const queryHash = hashString(`googletrends:${keywords.join(" ")}`);
    const cached = await ctx.runQuery(internalApi.queries.getCache, {
      key: `googletrends:${queryHash}`,
    });

    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[retrieveGoogleTrends] Returning cached trends for query hash ${queryHash}`);
      return cached.value as GoogleTrend[];
    }

    // Embed query for relevance scoring
    const queryText = keywords.join(" ");
    const queryEmbedding: number[] = await ctx.runAction(internalApi.actions.aiEmbed.embedText, {
      text: queryText,
    });

    // Fetch trends from Google Trends
    const trends = await fetchGoogleTrendsData(keywords, "today 12-m");

    if (trends.length === 0) {
      console.log(`[retrieveGoogleTrends] No trends found for query`);
      return [];
    }

    // Score relevance
    const scoredTrends = await scoreRelevance(
      trends,
      queryEmbedding,
      (args: { text: string }) => ctx.runAction(internalApi.actions.aiEmbed.embedText, args)
    );

    // Sort by relevance and interest
    scoredTrends.sort((a, b) => {
      const scoreA = (a.trendScore || 0) * 0.6 + (a.searchInterest / 100) * 0.4;
      const scoreB = (b.trendScore || 0) * 0.6 + (b.searchInterest / 100) * 0.4;
      return scoreB - scoreA;
    });

    // Take top N trends
    const topTrends = scoredTrends.slice(0, limit);

    // Store in cache (1 hour TTL - trends change frequently)
    const now = Date.now();
    await ctx.runMutation(internalApi.mutations.setCache, {
      key: `googletrends:${queryHash}`,
      value: topTrends,
      expiresAt: now + 60 * 60 * 1000, // 1 hour
      updatedAt: now,
    });

    // Store trends in database
    for (const trend of topTrends) {
      try {
        await ctx.runMutation(internalApi.mutations.upsertGoogleTrend, {
          keyword: trend.keyword,
          searchInterest: trend.searchInterest,
          relatedQueries: trend.relatedQueries,
          relatedTopics: trend.relatedTopics,
          timeRange: trend.timeRange,
          region: trend.region,
          trendScore: trend.trendScore,
          queryHash,
        });
      } catch (error) {
        console.error(`[retrieveGoogleTrends] Error storing trend ${trend.keyword}:`, error);
      }
    }

    console.log(`[retrieveGoogleTrends] Retrieved ${topTrends.length} Google Trends for query`);
    return topTrends;
  },
});

