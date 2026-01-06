"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { ParsedClaim } from "../utils";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_CHAT_MODEL =
  process.env.OPENROUTER_CHAT_MODEL || "openai/gpt-4o-mini";

// Type-safe internal API references
const internalApi = internal as {
  actions: {
    factCheck: { factCheck: any };
    aiEmbed: { embedText: any };
  };
  queries: {
    getMarket: any;
  };
};

interface SentimentAnalysis {
  overall: "positive" | "negative" | "neutral";
  score: number; // -1 to 1
  breakdown: {
    news: number;
    social: number;
    market: number;
  };
  confidence: number;
}

interface RiskAssessment {
  overall: "low" | "medium" | "high";
  score: number; // 0 to 1
  factors: Array<{
    name: string;
    level: "low" | "medium" | "high";
    description: string;
  }>;
  confidence: number;
}

interface DeepResearchResult {
  marketId: string;
  marketTitle: string;
  summary: string;
  sentiment: SentimentAnalysis;
  risk: RiskAssessment;
  confidence: {
    overall: number;
    breakdown: {
      marketMatch: number;
      dataQuality: number;
      sourceDiversity: number;
      recency: number;
    };
  };
  insights: string[];
  sources: {
    markets: number;
    news: number;
    social: number;
    trends: number;
  };
  timestamp: number;
}

/**
 * Analyze sentiment from multiple sources
 */
async function analyzeSentiment(
  newsArticles: any[],
  tweets: any[],
  redditPosts: any[],
  marketProbability: number | null
): Promise<SentimentAnalysis> {
  // News sentiment (simple heuristic based on keywords)
  let newsSentiment = 0;
  const positiveKeywords = ["positive", "up", "rise", "gain", "growth", "success", "win"];
  const negativeKeywords = ["negative", "down", "fall", "loss", "decline", "failure", "lose"];
  
  for (const article of newsArticles) {
    const text = `${article.title} ${article.snippet || ""}`.toLowerCase();
    const positiveCount = positiveKeywords.filter(k => text.includes(k)).length;
    const negativeCount = negativeKeywords.filter(k => text.includes(k)).length;
    newsSentiment += (positiveCount - negativeCount) / Math.max(positiveCount + negativeCount, 1);
  }
  newsSentiment = Math.max(-1, Math.min(1, newsSentiment / Math.max(newsArticles.length, 1)));

  // Social media sentiment (based on engagement and keywords)
  let socialSentiment = 0;
  const socialItems = [...tweets, ...redditPosts];
  for (const item of socialItems) {
    const text = (item.text || item.title || "").toLowerCase();
    const positiveCount = positiveKeywords.filter(k => text.includes(k)).length;
    const negativeCount = negativeKeywords.filter(k => text.includes(k)).length;
    const engagement = (item.likeCount || 0) + (item.retweetCount || 0) + (item.score || 0);
    const weight = Math.min(engagement / 1000, 1); // Normalize engagement
    socialSentiment += (positiveCount - negativeCount) * weight;
  }
  socialSentiment = Math.max(-1, Math.min(1, socialSentiment / Math.max(socialItems.length, 1)));

  // Market sentiment (based on probability)
  const marketSentiment = marketProbability !== null 
    ? (marketProbability - 0.5) * 2 // Convert 0-1 to -1 to 1
    : 0;

  // Aggregate sentiment
  const overallScore = (newsSentiment * 0.3 + socialSentiment * 0.3 + marketSentiment * 0.4);
  const overall = overallScore > 0.2 ? "positive" : overallScore < -0.2 ? "negative" : "neutral";

  return {
    overall,
    score: overallScore,
    breakdown: {
      news: newsSentiment,
      social: socialSentiment,
      market: marketSentiment,
    },
    confidence: Math.min(
      (newsArticles.length > 0 ? 0.3 : 0) +
      (socialItems.length > 0 ? 0.3 : 0) +
      (marketProbability !== null ? 0.4 : 0),
      1
    ),
  };
}

/**
 * Assess risk factors for a market
 */
async function assessRisk(
  market: any,
  newsArticles: any[],
  marketProbability: number | null,
  spread: number | null,
  volume: number | null,
  liquidity: number | null
): Promise<RiskAssessment> {
  const factors: Array<{ name: string; level: "low" | "medium" | "high"; description: string }> = [];

  // Volatility risk (based on spread)
  let volatilityRisk: "low" | "medium" | "high" = "low";
  if (spread !== null) {
    if (spread > 0.1) volatilityRisk = "high";
    else if (spread > 0.05) volatilityRisk = "medium";
    factors.push({
      name: "Volatility",
      level: volatilityRisk,
      description: spread > 0.1 
        ? "High spread indicates significant price uncertainty"
        : spread > 0.05
        ? "Moderate spread suggests some price uncertainty"
        : "Low spread indicates stable pricing",
    });
  }

  // Liquidity risk
  let liquidityRisk: "low" | "medium" | "high" = "low";
  if (liquidity !== null) {
    if (liquidity < 10000) liquidityRisk = "high";
    else if (liquidity < 50000) liquidityRisk = "medium";
    factors.push({
      name: "Liquidity",
      level: liquidityRisk,
      description: liquidity < 10000
        ? "Low liquidity may make it difficult to enter/exit positions"
        : liquidity < 50000
        ? "Moderate liquidity - some caution advised"
        : "Good liquidity for trading",
    });
  }

  // Information risk (based on news coverage)
  let informationRisk: "low" | "medium" | "high" = "low";
  if (newsArticles.length === 0) {
    informationRisk = "high";
    factors.push({
      name: "Information Availability",
      level: "high",
      description: "Limited news coverage makes it harder to assess market fundamentals",
    });
  } else if (newsArticles.length < 3) {
    informationRisk = "medium";
    factors.push({
      name: "Information Availability",
      level: "medium",
      description: "Moderate news coverage - more information would improve confidence",
    });
  } else {
    factors.push({
      name: "Information Availability",
      level: "low",
      description: "Good news coverage provides solid information base",
    });
  }

  // Time-based risk (if market is expiring soon)
  if (market.endDate) {
    const daysUntilExpiry = (market.endDate - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysUntilExpiry < 1) {
      factors.push({
        name: "Time Risk",
        level: "high",
        description: "Market expires very soon - limited time for conditions to change",
      });
    } else if (daysUntilExpiry < 7) {
      factors.push({
        name: "Time Risk",
        level: "medium",
        description: "Market expires within a week - monitor closely",
      });
    }
  }

  // Calculate overall risk score
  const riskScores = factors.map(f => {
    if (f.level === "high") return 0.8;
    if (f.level === "medium") return 0.5;
    return 0.2;
  });
  const overallScore = riskScores.length > 0 
    ? riskScores.reduce((a, b) => a + b, 0) / riskScores.length
    : 0.3;

  const overall = overallScore > 0.6 ? "high" : overallScore > 0.4 ? "medium" : "low";

  return {
    overall,
    score: overallScore,
    factors,
    confidence: Math.min(factors.length / 4, 1), // More factors = higher confidence
  };
}

/**
 * Deep research analysis for a market
 */
export const deepResearch = action({
  args: {
    marketId: v.string(),
    analysisDepth: v.optional(v.union(v.literal("standard"), v.literal("deep"))),
  },
  handler: async (ctx, args): Promise<DeepResearchResult> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable is required");
    }

    const analysisDepth = args.analysisDepth || "standard";

    // Get market data
    const market = await ctx.runQuery(internalApi.queries.getMarket, {
      polymarketMarketId: args.marketId,
    });

    if (!market) {
      throw new Error(`Market ${args.marketId} not found`);
    }

    // Use factCheck to get comprehensive data
    const factCheckResult = await ctx.runAction(internalApi.actions.factCheck.factCheck, {
      question: market.title,
      mode: analysisDepth === "deep" ? "deep" : "fast",
    });

    // Extract data from factCheck result
    const bestMarket = factCheckResult.bestMarket;
    const newsArticles = factCheckResult.newsArticles || [];
    const tweets = factCheckResult.tweets || [];
    const redditPosts = factCheckResult.redditPosts || [];
    const googleTrends = factCheckResult.googleTrends || [];

    // Analyze sentiment
    const sentiment = await analyzeSentiment(
      newsArticles,
      tweets,
      redditPosts,
      bestMarket?.evidence.priceYes || null
    );

    // Assess risk
    const risk = await assessRisk(
      market,
      newsArticles,
      bestMarket?.evidence.priceYes || null,
      bestMarket?.evidence.spread || null,
      bestMarket?.evidence.volume || null,
      bestMarket?.evidence.liquidity || null
    );

    // Generate insights using AI
    let insights: string[] = [];
    try {
      const insightsResponse = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: OPENROUTER_CHAT_MODEL,
            messages: [
              {
                role: "system",
                content: `You are a market intelligence analyst. Generate 3-5 key insights about this prediction market based on the provided data. Focus on actionable insights, trends, and important factors.`,
              },
              {
                role: "user",
                content: `Market: ${market.title}
Description: ${market.description || "N/A"}
Probability: ${bestMarket?.evidence.priceYes ? (bestMarket.evidence.priceYes * 100).toFixed(1) + "%" : "N/A"}
Volume: ${bestMarket?.evidence.volume ? `$${bestMarket.evidence.volume.toLocaleString()}` : "N/A"}
Sentiment: ${sentiment.overall} (${(sentiment.score * 100).toFixed(0)})
Risk: ${risk.overall} (${(risk.score * 100).toFixed(0)})

News Articles: ${newsArticles.length}
Social Media Posts: ${tweets.length + redditPosts.length}
Google Trends: ${googleTrends.length}

Generate 3-5 key insights as a JSON array of strings.`,
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
          }),
          signal: AbortSignal.timeout(30000),
        }
      );

      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        const insightsContent = insightsData.choices[0].message.content;
        const insightsParsed = JSON.parse(insightsContent);
        insights = insightsParsed.insights || insightsParsed.items || [];
      }
    } catch (error) {
      console.error("Error generating insights:", error);
      // Fallback insights
      insights = [
        `Market sentiment is ${sentiment.overall} based on ${newsArticles.length} news articles and ${tweets.length + redditPosts.length} social media posts`,
        `Risk level is ${risk.overall} with ${risk.factors.length} identified risk factors`,
        bestMarket?.evidence.priceYes 
          ? `Current market probability: ${(bestMarket.evidence.priceYes * 100).toFixed(1)}%`
          : "Market probability data not available",
      ];
    }

    // Calculate confidence breakdown
    const confidenceBreakdown = {
      marketMatch: factCheckResult.answer.confidence || 0,
      dataQuality: Math.min(
        (newsArticles.length > 0 ? 0.3 : 0) +
        (tweets.length + redditPosts.length > 0 ? 0.3 : 0) +
        (bestMarket?.evidence.priceYes !== null ? 0.4 : 0),
        1
      ),
      sourceDiversity: Math.min(
        (newsArticles.length > 0 ? 0.25 : 0) +
        (tweets.length > 0 ? 0.25 : 0) +
        (redditPosts.length > 0 ? 0.25 : 0) +
        (googleTrends.length > 0 ? 0.25 : 0),
        1
      ),
      recency: 0.8, // Assume recent if we just fetched
    };

    const overallConfidence = (
      confidenceBreakdown.marketMatch * 0.4 +
      confidenceBreakdown.dataQuality * 0.3 +
      confidenceBreakdown.sourceDiversity * 0.2 +
      confidenceBreakdown.recency * 0.1
    );

    return {
      marketId: args.marketId,
      marketTitle: market.title,
      summary: factCheckResult.answer.summary,
      sentiment,
      risk,
      confidence: {
        overall: overallConfidence,
        breakdown: confidenceBreakdown,
      },
      insights,
      sources: {
        markets: 1 + (factCheckResult.alternatives?.length || 0),
        news: newsArticles.length,
        social: tweets.length + redditPosts.length,
        trends: googleTrends.length,
      },
      timestamp: Date.now(),
    };
  },
});
