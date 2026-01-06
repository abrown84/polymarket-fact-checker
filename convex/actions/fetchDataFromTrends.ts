"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { hashString } from "../utils";

// Type-safe internal API references
const internalApi = internal as {
  queries: {
    getGoogleTrends: any;
    getCache: any;
  };
  mutations: {
    setCache: any;
    upsertNewsArticle: any;
    upsertTweet: any;
    upsertRedditPost: any;
  };
  actions: {
    retrieveNews: { retrieveNews: any };
    retrieveTwitter: { retrieveTwitter: any };
    retrieveReddit: { retrieveReddit: any };
    aiParseClaim: { aiParseClaim: any };
  };
};

/**
 * Fetch fresh data from all sources using trending keywords
 * This action:
 * 1. Gets top trending keywords from Google Trends
 * 2. Uses those keywords to fetch news, tweets, and Reddit posts
 * 3. Stores them in the database
 */
export const fetchDataFromTrends = action({
  args: {
    limit: v.optional(v.number()), // Number of trending keywords to use
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5; // Use top 5 trending keywords by default
    
    console.log(`[fetchDataFromTrends] Starting data fetch using top ${limit} trending keywords`);
    
    // Get top trending keywords (sorted by search interest)
    const allTrends = await ctx.runQuery(internalApi.queries.getGoogleTrends, {
      limit: limit * 2, // Get more to filter
      sortBy: "popular",
    });
    
    if (!allTrends || allTrends.length === 0) {
      console.log("[fetchDataFromTrends] No trends found, skipping data fetch");
      return {
        success: false,
        message: "No trending keywords found",
        fetched: {
          news: 0,
          tweets: 0,
          reddit: 0,
        },
      };
    }
    
    // Get top N keywords with highest search interest
    const topKeywords = allTrends
      .slice(0, limit)
      .map((t: any) => t.keyword)
      .filter(Boolean);
    
    console.log(`[fetchDataFromTrends] Using keywords: ${topKeywords.join(", ")}`);
    
    let totalNews = 0;
    let totalTweets = 0;
    let totalReddit = 0;
    const errors: string[] = [];
    
    // Fetch data for each trending keyword
    for (const keyword of topKeywords) {
      try {
        // Parse the keyword as a claim to get structured query
        const parsedClaim = await ctx.runAction(internalApi.actions.aiParseClaim.aiParseClaim, {
          question: keyword,
        });
        
        // Fetch news articles
        try {
          const newsArticles = await ctx.runAction(internalApi.actions.retrieveNews.retrieveNews, {
            parsedClaim,
            limit: 10,
          });
          totalNews += newsArticles?.length || 0;
          console.log(`[fetchDataFromTrends] Fetched ${newsArticles?.length || 0} news articles for "${keyword}"`);
        } catch (error: any) {
          const errorMsg = `News fetch error for "${keyword}": ${error?.message || String(error)}`;
          console.error(`[fetchDataFromTrends] ${errorMsg}`);
          errors.push(errorMsg);
        }
        
        // Fetch tweets
        try {
          const tweets = await ctx.runAction(internalApi.actions.retrieveTwitter.retrieveTwitter, {
            parsedClaim,
            limit: 10,
          });
          totalTweets += tweets?.length || 0;
          console.log(`[fetchDataFromTrends] Fetched ${tweets?.length || 0} tweets for "${keyword}"`);
        } catch (error: any) {
          const errorMsg = `Twitter fetch error for "${keyword}": ${error?.message || String(error)}`;
          console.error(`[fetchDataFromTrends] ${errorMsg}`);
          errors.push(errorMsg);
        }
        
        // Fetch Reddit posts
        try {
          const redditPosts = await ctx.runAction(internalApi.actions.retrieveReddit.retrieveReddit, {
            parsedClaim,
            limit: 10,
          });
          totalReddit += redditPosts?.length || 0;
          console.log(`[fetchDataFromTrends] Fetched ${redditPosts?.length || 0} Reddit posts for "${keyword}"`);
        } catch (error: any) {
          const errorMsg = `Reddit fetch error for "${keyword}": ${error?.message || String(error)}`;
          console.error(`[fetchDataFromTrends] ${errorMsg}`);
          errors.push(errorMsg);
        }
        
        // Small delay between keywords to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
        const errorMsg = `Error processing keyword "${keyword}": ${error?.message || String(error)}`;
        console.error(`[fetchDataFromTrends] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    console.log(`[fetchDataFromTrends] Complete: ${totalNews} news, ${totalTweets} tweets, ${totalReddit} Reddit posts`);
    
    return {
      success: true,
      message: `Fetched data using ${topKeywords.length} trending keywords`,
      keywords: topKeywords,
      fetched: {
        news: totalNews,
        tweets: totalTweets,
        reddit: totalReddit,
      },
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});





