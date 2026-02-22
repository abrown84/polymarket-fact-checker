"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { clamp01, ParsedClaim, parseDateFromQuery } from "../utils";
import {
  bayesianFusion,
  detectMomentum,
  detectAnomalies,
  ensemblePrediction,
  calibrateConfidence,
  calculateVelocity,
  calculateAcceleration,
  applyTemporalDecay,
  SourceReliability,
  FusionResult,
  MomentumResult,
  AnomalyResult,
  EnsembleResult,
} from "../utils/algorithms";
import {
  buildKnowledgeGraph,
  detectSentimentCascade,
  GraphResult,
  CascadeResult,
} from "../utils/graphAnalysis";
import {
  analyzeSentimentEnhanced,
  analyzeSentimentSimple,
  SentimentResult,
} from "../utils/sentiment";
import {
  ANSWER_GENERATION_PROMPT_GOOD_MATCH,
  ANSWER_GENERATION_PROMPT_WEAK_MATCH,
  MODEL_CONFIGS,
} from "../prompts/factCheckSystemPrompt";

function getOpenRouterApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("OPENROUTER_API_KEY environment variable is required");
  }
  return key;
}

// Type-safe internal API references
const internalApi = internal as {
  queries: {
    getCache: any;
    getMarket: any;
    getAllEmbeddings: any;
    getRecentQueries: any;
    getMarketsByEndDate: any;
  };
  mutations: {
    setCache: any;
    upsertMarket: any;
    upsertEmbedding: any;
    logQuery: any;
    logPrediction: any;
    createFactCheckRun: any;
    completeFactCheckRun: any;
    appendRunEvent: any;
    upsertEvidenceItem: any;
  };
  actions: {
    aiEmbed: { embedText: any };
    aiParseClaim: { aiParseClaim: any };
    aiRerank: { aiRerank: any };
    polymarket: { fetchGammaMarkets: any; fetchClobBook: any; fetchClobLastChance: any; fetchClobLastPrice: any };
    retrieveCandidates: { retrieveCandidates: any };
    ingestMarkets: { ingestMarkets: any };
    retrieveNews: { retrieveNews: any };
    retrieveTwitter: { retrieveTwitter: any };
    retrieveReddit: { retrieveReddit: any };
    retrieveTikTok: { retrieveTikTok: any };
    retrieveInstagram: { retrieveInstagram: any };
    retrieveGoogleTrends: { retrieveGoogleTrends: any };
    retrieveYouTube: { retrieveYouTube: any };
    retrievePerplexity: { retrievePerplexity: any };
    kalshi: { searchKalshiMarkets: any };
  };
};

interface MarketCandidate {
  polymarketMarketId: string;
  title: string;
  description: string;
  endDate: number | null;
  url: string | null;
  outcomes: string[];
  volume: number | null;
  liquidity: number | null;
  similarity: number;
}

interface RankedMarket {
  polymarketMarketId: string;
  matchScore: number;
  reasons: string[];
  mismatchFlags: string[];
}

interface MarketWithEvidence extends MarketCandidate, RankedMarket {
  evidence: {
    chanceYes: number | null; // YES outcome probability (0-1)
    spread: number | null;
    volume: number | null;
    liquidity: number | null;
    updatedAt: number;
  };
}

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: number;
  snippet: string | null;
  relevanceScore: number | null;
}

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

interface KalshiMarket {
  ticker: string;
  title: string;
  subtitle: string | null;
  category: string;
  lastChance: number | null; // Last traded probability (0-100)
  volume: number | null;
  url: string;
}

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


interface GoogleTrend {
  keyword: string;
  searchInterest: number;
  relatedQueries: string[];
  relatedTopics: string[];
  timeRange: string;
  region: string;
  trendScore: number | null;
}

interface TikTokVideo {
  id: string;
  description: string;
  author: string;
  authorUsername: string;
  createdAt: number;
  url: string;
  likeCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
  viewCount: number | null;
  relevanceScore: number | null;
}

interface InstagramPost {
  id: string;
  caption: string;
  author: string;
  authorUsername: string;
  createdAt: number;
  url: string;
  likeCount: number | null;
  commentCount: number | null;
  relevanceScore: number | null;
}

interface YouTubeVideo {
  id: string;
  title: string;
  description: string | null;
  channelTitle: string;
  channelId: string;
  publishedAt: number;
  url: string;
  thumbnailUrl: string | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  relevanceScore: number | null;
}

interface RiskAssessment {
  overall: "low" | "medium" | "high";
  score: number;
  factors: Array<{
    name: string;
    level: "low" | "medium" | "high";
    description: string;
  }>;
  confidence: number;
}

interface FactCheckResult {
  runId: string;
  parsedClaim: ParsedClaim;
  answer: {
    summary: string;
    probYes: number | null;
    confidence: number;
    ambiguity: "low" | "medium" | "high";
    reasoning?: string; // AI's chain-of-thought reasoning (shows how it arrived at the answer)
    keyInsight?: string; // Single most important takeaway
    caveats?: string[]; // Important limitations to consider
  };
  bestMarket: MarketWithEvidence | null;
  alternatives: MarketWithEvidence[];
  newsArticles?: NewsArticle[]; // Relevant news articles
  tweets?: Tweet[]; // Relevant tweets
  redditPosts?: RedditPost[]; // Relevant Reddit posts
  tiktokVideos?: TikTokVideo[]; // Relevant TikTok videos
  instagramPosts?: InstagramPost[]; // Relevant Instagram posts
  youtubeVideos?: YouTubeVideo[]; // Relevant YouTube videos
  googleTrends?: GoogleTrend[]; // Google Trends data
  kalshiMarkets?: KalshiMarket[]; // Relevant Kalshi markets
  expiringMarkets?: MarketWithEvidence[]; // Markets expiring on the queried date
  targetDate?: number; // The date parsed from the query
  // Deep analysis algorithms applied automatically
  sentiment?: SentimentResult;
  risk?: RiskAssessment;
  fusion?: FusionResult;
  momentum?: MomentumResult;
  anomalies?: AnomalyResult;
  ensemble?: EnsembleResult | null;
  graph?: GraphResult;
  cascade?: CascadeResult;
  insights?: string[];
  debug: {
    scoringBreakdown: Record<string, number>;
    timings: { total: number };
  };
}

/**
 * Main fact-check orchestrator
 */
export const factCheck = action({
  args: {
    question: v.string(),
    mode: v.optional(v.union(v.literal("fast"), v.literal("deep"))),
    runId: v.optional(v.id("factCheckRuns")),
  },
  handler: async (ctx, args): Promise<FactCheckResult> => {
    const startTime = Date.now();
    const mode = args.mode === "deep" ? "deep" : "fast";
    const runId = args.runId ?? await ctx.runMutation(internalApi.mutations.createFactCheckRun, {
      question: args.question,
      mode,
      model: MODEL_CONFIGS.answerGeneration ?? null,
      providerFlags: {
        enablePerplexityRetrieval: process.env.ENABLE_PERPLEXITY_RETRIEVAL === "true",
      },
    });

    await ctx.runMutation(internalApi.mutations.appendRunEvent, {
      runId,
      stage: "started",
      status: "started",
      message: "Fact-check run started",
      meta: { mode },
    });

    // Step 1: Parse claim
    const parsedClaim: ParsedClaim = await ctx.runAction(
      internalApi.actions.aiParseClaim.aiParseClaim,
      { question: args.question }
    );

    await ctx.runMutation(internalApi.mutations.appendRunEvent, {
      runId,
      stage: "retrieval",
      status: "started",
      message: "Retrieving news, social, and market sources",
    });

    // Step 1.5: Retrieve news articles, social media posts, and Kalshi markets (in parallel for performance)
    // Increase limits based on mode: deep = 25, fast = 15
    const limit = args.mode === "deep" ? 25 : 15;
    
    let newsArticles: NewsArticle[] = [];
    let tweets: Tweet[] = [];
    let redditPosts: RedditPost[] = [];
    let tiktokVideos: TikTokVideo[] = [];
    let instagramPosts: InstagramPost[] = [];
    let youtubeVideos: YouTubeVideo[] = [];
    let googleTrends: GoogleTrend[] = [];
    let kalshiMarkets: KalshiMarket[] = [];
    
    try {
      newsArticles = await ctx.runAction(internalApi.actions.retrieveNews.retrieveNews, {
        parsedClaim,
        limit,
      });
      console.log(`[factCheck] Retrieved ${newsArticles.length} news articles`);
    } catch (error) {
      console.error("[factCheck] Error retrieving news:", error);
    }

    // Optional Perplexity retrieval (feature flagged)
    try {
      const pxItems = await ctx.runAction(internalApi.actions.retrievePerplexity.retrievePerplexity, {
        parsedClaim,
        limit: Math.min(limit, 10),
      });
      if (Array.isArray(pxItems) && pxItems.length > 0) {
        newsArticles = [...newsArticles, ...pxItems];
        console.log(`[factCheck] Retrieved ${pxItems.length} Perplexity evidence items`);
      }
    } catch (error) {
      console.error("[factCheck] Error retrieving Perplexity evidence:", error);
    }

    try {
      tweets = await ctx.runAction(internalApi.actions.retrieveTwitter.retrieveTwitter, {
        parsedClaim,
        limit,
      });
      console.log(`[factCheck] Retrieved ${tweets.length} tweets`);
    } catch (error) {
      console.error("[factCheck] Error retrieving tweets:", error);
    }

    try {
      redditPosts = await ctx.runAction(internalApi.actions.retrieveReddit.retrieveReddit, {
        parsedClaim,
        limit,
      });
      console.log(`[factCheck] Retrieved ${redditPosts.length} Reddit posts`);
    } catch (error) {
      console.error("[factCheck] Error retrieving Reddit posts:", error);
    }

    try {
      tiktokVideos = await ctx.runAction(internalApi.actions.retrieveTikTok.retrieveTikTok, {
        parsedClaim,
        limit,
      });
      console.log(`[factCheck] Retrieved ${tiktokVideos.length} TikTok videos`);
    } catch (error) {
      console.error("[factCheck] Error retrieving TikTok videos:", error);
    }

    try {
      instagramPosts = await ctx.runAction(internalApi.actions.retrieveInstagram.retrieveInstagram, {
        parsedClaim,
        limit,
      });
      console.log(`[factCheck] Retrieved ${instagramPosts.length} Instagram posts`);
    } catch (error) {
      console.error("[factCheck] Error retrieving Instagram posts:", error);
    }

    try {
      youtubeVideos = await ctx.runAction(internalApi.actions.retrieveYouTube.retrieveYouTube, {
        parsedClaim,
        limit,
      });
      console.log(`[factCheck] Retrieved ${youtubeVideos.length} YouTube videos`);
    } catch (error) {
      console.error("[factCheck] Error retrieving YouTube videos:", error);
    }

    try {
      googleTrends = await ctx.runAction(internalApi.actions.retrieveGoogleTrends.retrieveGoogleTrends, {
        parsedClaim,
        limit,
      });
      console.log(`[factCheck] Retrieved ${googleTrends.length} Google Trends`);
    } catch (error) {
      console.error("[factCheck] Error retrieving Google Trends:", error);
    }

    try {
      const kalshiData = await ctx.runAction(internalApi.actions.kalshi.searchKalshiMarkets, {
        query: parsedClaim.claim,
        limit,
      });
      kalshiMarkets = (kalshiData.markets || []).map((m: any) => ({
        ticker: m.ticker,
        title: m.title,
        subtitle: m.subtitle,
        category: m.category,
        lastPrice: m.lastPrice,
        volume: m.volume,
        url: m.url,
      }));
      console.log(`[factCheck] Retrieved ${kalshiMarkets.length} Kalshi markets`);
    } catch (error) {
      console.error("[factCheck] Error retrieving Kalshi markets:", error);
    }

    await ctx.runMutation(internalApi.mutations.appendRunEvent, {
      runId,
      stage: "retrieval",
      status: "progress",
      message: "Source retrieval complete",
      meta: {
        news: newsArticles.length,
        tweets: tweets.length,
        reddit: redditPosts.length,
        tiktok: tiktokVideos.length,
        instagram: instagramPosts.length,
        youtube: youtubeVideos.length,
        trends: googleTrends.length,
        kalshi: kalshiMarkets.length,
      },
    });

    // Persist normalized evidence (best-effort)
    const claimKey = `${parsedClaim.claim}|${parsedClaim.time_window?.start || ""}|${parsedClaim.time_window?.end || ""}`.slice(0, 300);
    try {
      for (const article of newsArticles.slice(0, 25)) {
        await ctx.runMutation(internalApi.mutations.upsertEvidenceItem, {
          claimKey,
          sourceType: "news",
          sourceId: article.url || article.title,
          url: article.url || null,
          title: article.title || null,
          content: article.snippet || null,
          publishedAt: article.publishedAt ?? null,
          relevanceScore: article.relevanceScore ?? null,
          stanceScore: null,
          credibilityScore: null,
          freshnessScore: null,
          metadata: { source: article.source },
        });
      }
    } catch (error) {
      console.error("[factCheck] Failed to persist normalized evidence:", error);
    }

    // Step 2: Retrieve candidates
    const candidates: MarketCandidate[] = await ctx.runAction(
      internalApi.actions.retrieveCandidates.retrieveCandidates,
      { parsedClaim }
    );

    if (candidates.length === 0) {
      // Even without market matches, provide available news/social data
      const hasExternalData = newsArticles.length > 0 || tweets.length > 0 || redditPosts.length > 0 || kalshiMarkets.length > 0;

      let summary = "No Polymarket markets found matching this claim.";
      if (hasExternalData) {
        const dataSources = [];
        if (newsArticles.length > 0) dataSources.push(`${newsArticles.length} news articles`);
        if (tweets.length > 0) dataSources.push(`${tweets.length} tweets`);
        if (redditPosts.length > 0) dataSources.push(`${redditPosts.length} Reddit posts`);
        if (kalshiMarkets.length > 0) dataSources.push(`${kalshiMarkets.length} Kalshi markets`);
        summary = `No direct Polymarket match found, but we found related data: ${dataSources.join(", ")}. See the News, Social, and Kalshi tabs below for relevant information.`;
      }

      const result: FactCheckResult = {
        runId,
        parsedClaim,
        answer: {
          summary,
          probYes: null,
          confidence: 0,
          ambiguity: "high" as const,
          keyInsight: hasExternalData
            ? "While no prediction market covers this exact topic, the news and social media data below may provide useful context."
            : "This topic may be too niche or recent for prediction markets to cover.",
        },
        bestMarket: null,
        alternatives: [],
        // Include all fetched external data even without market matches
        ...(newsArticles.length > 0 && { newsArticles }),
        ...(tweets.length > 0 && { tweets }),
        ...(redditPosts.length > 0 && { redditPosts }),
        ...(tiktokVideos.length > 0 && { tiktokVideos }),
        ...(instagramPosts.length > 0 && { instagramPosts }),
        ...(youtubeVideos.length > 0 && { youtubeVideos }),
        ...(googleTrends.length > 0 && { googleTrends }),
        ...(kalshiMarkets.length > 0 && { kalshiMarkets }),
        debug: {
          scoringBreakdown: {
            newsArticles: newsArticles.length,
            tweets: tweets.length,
            redditPosts: redditPosts.length,
            kalshiMarkets: kalshiMarkets.length,
          },
          timings: { total: Date.now() - startTime },
        },
      };

      await ctx.runMutation(internalApi.mutations.logQuery, {
        question: args.question,
        parsedClaim,
        bestMarketId: null,
        confidence: 0,
        debug: result.debug,
      });

      await ctx.runMutation(internalApi.mutations.completeFactCheckRun, {
        runId,
        status: "completed",
        bestMarketId: null,
        confidence: 0,
        metrics: { noCandidates: true, newsCount: newsArticles.length },
      });

      return result;
    }

    // Step 3: Rerank
    await ctx.runMutation(internalApi.mutations.appendRunEvent, {
      runId,
      stage: "scoring",
      status: "started",
      message: "Scoring and reranking candidate markets",
      meta: { candidateCount: candidates.length },
    });

    const reranked: { ranked: RankedMarket[]; overallAmbiguity: "low" | "medium" | "high" } = 
      await ctx.runAction(internalApi.actions.aiRerank.aiRerank, {
        parsedClaim,
        candidates,
      });

    // Fallback: If reranking returned no markets, use similarity scores directly
    let rankedMarkets: RankedMarket[] = reranked.ranked;
    if (rankedMarkets.length === 0 && candidates.length > 0) {
      console.log(`[factCheck] Reranking returned no markets, using similarity fallback`);
      rankedMarkets = candidates.map((c) => ({
        polymarketMarketId: c.polymarketMarketId,
        matchScore: Math.max(0, Math.min(1, c.similarity * 1.2)), // Scale similarity to 0-1
        reasons: ["Based on embedding similarity"],
        mismatchFlags: [],
      }));
      // Sort by match score
      rankedMarkets.sort((a, b) => b.matchScore - a.matchScore);
    }

    // Step 4: Fetch evidence for top 15 (more markets for better coverage)
    const topMarkets: RankedMarket[] = rankedMarkets.slice(0, 15);
    const marketsWithEvidence: MarketWithEvidence[] = [];

    for (const rankedMarket of topMarkets) {
      const market = candidates.find(
        (c: MarketCandidate) => c.polymarketMarketId === rankedMarket.polymarketMarketId
      );
      if (!market) continue;

      try {
        // Fetch chance from WebSocket (includes bid/ask for spread calculation)
        const chanceData = await ctx
          .runAction(internalApi.actions.polymarket.fetchClobLastChance, {
            marketId: market.polymarketMarketId,
            tokenId: null,
          })
          .catch(() => null);

        // Extract YES chance and spread from WebSocket data
        let chanceYes: number | null = null;
        let spread: number | null = null;

        if (chanceData && typeof chanceData === "object") {
          // Use chance field first, then bid as fallback
          if ("chance" in chanceData && typeof chanceData.chance === "number") {
            chanceYes = chanceData.chance;
          } else if ("bid" in chanceData && typeof chanceData.bid === "number") {
            chanceYes = chanceData.bid;
          }
          
          // Use spread from WebSocket data if available
          if ("spread" in chanceData && typeof chanceData.spread === "number") {
            spread = chanceData.spread;
          } else if ("ask" in chanceData && "bid" in chanceData && 
                     typeof chanceData.ask === "number" && typeof chanceData.bid === "number") {
            spread = chanceData.ask - chanceData.bid;
          }
        }

        marketsWithEvidence.push({
          ...market,
          ...rankedMarket,
          evidence: {
            chanceYes,
            spread,
            volume: market.volume,
            liquidity: market.liquidity,
            updatedAt: Date.now(),
          },
        });
      } catch (error) {
        console.error("Error fetching evidence:", error);
        marketsWithEvidence.push({
          ...market,
          ...rankedMarket,
          evidence: {
            chanceYes: null,
            spread: null,
            volume: market.volume,
            liquidity: market.liquidity,
            updatedAt: Date.now(),
          },
        });
      }
    }

    // Step 5: Compute confidence for best market
    const bestMarket = marketsWithEvidence[0];
    if (!bestMarket) {
      // If we still have no markets, return a helpful response with external data
      console.warn(`[factCheck] No markets found after processing. Candidates: ${candidates.length}, Reranked: ${reranked.ranked.length}, WithEvidence: ${marketsWithEvidence.length}`);

      const hasExternalData = newsArticles.length > 0 || tweets.length > 0 || redditPosts.length > 0 || kalshiMarkets.length > 0;

      let summary = "No matching Polymarket markets found for this question.";
      if (hasExternalData) {
        const dataSources = [];
        if (newsArticles.length > 0) dataSources.push(`${newsArticles.length} news articles`);
        if (tweets.length > 0) dataSources.push(`${tweets.length} tweets`);
        if (redditPosts.length > 0) dataSources.push(`${redditPosts.length} Reddit posts`);
        if (kalshiMarkets.length > 0) dataSources.push(`${kalshiMarkets.length} Kalshi markets`);
        summary = `No direct Polymarket match found, but we found related data: ${dataSources.join(", ")}. Check the tabs below for news, social media, and alternative market data.`;
      } else {
        summary = "No matching Polymarket markets found for this question. This could mean: (1) No markets exist on this topic yet, (2) The markets haven't been ingested yet, or (3) The question needs to be rephrased.";
      }

      const result: FactCheckResult = {
        runId,
        parsedClaim,
        answer: {
          summary,
          probYes: null,
          confidence: 0,
          ambiguity: "high" as const,
          keyInsight: hasExternalData
            ? "While no prediction market directly addresses this, the news and social data below provide relevant context."
            : "Try asking about a specific event, date, or topic that might have prediction markets.",
        },
        bestMarket: null,
        alternatives: [],
        // Include all fetched external data
        ...(newsArticles.length > 0 && { newsArticles }),
        ...(tweets.length > 0 && { tweets }),
        ...(redditPosts.length > 0 && { redditPosts }),
        ...(tiktokVideos.length > 0 && { tiktokVideos }),
        ...(instagramPosts.length > 0 && { instagramPosts }),
        ...(youtubeVideos.length > 0 && { youtubeVideos }),
        ...(googleTrends.length > 0 && { googleTrends }),
        ...(kalshiMarkets.length > 0 && { kalshiMarkets }),
        debug: {
          scoringBreakdown: {
            candidatesFound: candidates.length,
            rerankedCount: reranked.ranked.length,
            marketsWithEvidence: marketsWithEvidence.length,
            newsArticles: newsArticles.length,
            tweets: tweets.length,
            redditPosts: redditPosts.length,
            kalshiMarkets: kalshiMarkets.length,
          },
          timings: { total: Date.now() - startTime },
        },
      };

      await ctx.runMutation(internalApi.mutations.logQuery, {
        question: args.question,
        parsedClaim,
        bestMarketId: null,
        confidence: 0,
        debug: result.debug,
      });

      await ctx.runMutation(internalApi.mutations.completeFactCheckRun, {
        runId,
        status: "completed",
        bestMarketId: null,
        confidence: 0,
        metrics: { noBestMarket: true, candidateCount: candidates.length },
      });

      return result;
    }

    const matchScore = bestMarket.matchScore || 0;
    const volumeScore = bestMarket.evidence.volume
      ? clamp01(bestMarket.evidence.volume / 1000000) // Normalize to 1M volume
      : 0.5;
    const spreadScore = bestMarket.evidence.spread !== null
      ? clamp01(1 - bestMarket.evidence.spread * 10) // Lower spread = higher score
      : 0.5;
    const recencyScore = 0.8; // Assume recent if we just fetched

    // More lenient confidence calculation - give more weight to match score
    // but accept lower scores as valid matches
    const confidence = clamp01(
      0.50 * matchScore +
        0.25 * volumeScore +
        0.15 * spreadScore +
        0.10 * recencyScore
    );

    // Step 6: Generate comprehensive answer based on market data
    // Always try to provide an answer, even if match isn't perfect
    await ctx.runMutation(internalApi.mutations.appendRunEvent, {
      runId,
      stage: "generation",
      status: "started",
      message: "Generating answer with citations and confidence",
    });
    let answerSummary: string;
    let answerReasoning: string | undefined;
    let answerKeyInsight: string | undefined;
    let answerCaveats: string[] | undefined;
    let probYes: number | null = bestMarket.evidence.chanceYes;

    // Get current date for context
    const currentDate = new Date().toISOString().split('T')[0];

    // Always generate an answer, but adjust the approach based on match quality
    const hasGoodMatch = matchScore >= 0.35 && confidence >= 0.25;

    if (!hasGoodMatch) {
      // Even with poor matches, provide an answer using available data
      try {
        const topMarketsForAnalysis = marketsWithEvidence
          .filter(m => m.evidence.chanceYes !== null)
          .slice(0, 3)
          .map(m => ({
            title: m.title,
            probability: m.evidence.chanceYes !== null ? m.evidence.chanceYes.toFixed(1) + "%" : "N/A",
            matchScore: (m.matchScore * 100).toFixed(0) + "%",
          }));

        const summaryResponse = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getOpenRouterApiKey()}`,
            },
            body: JSON.stringify({
              model: MODEL_CONFIGS.answerGeneration,
              messages: [
                {
                  role: "system",
                  content: ANSWER_GENERATION_PROMPT_WEAK_MATCH,
                },
                {
                  role: "user",
                  content: `Today's date: ${currentDate}

## User's Question
"${args.question}"

## Parsed Claim
${parsedClaim.claim}

## Best Available Market (${(matchScore * 100).toFixed(0)}% match - ${matchScore < 0.5 ? "WEAK" : "MODERATE"})
- Title: ${bestMarket.title}
- Description: ${bestMarket.description || "N/A"}
- Market Probability: ${probYes !== null ? probYes.toFixed(1) + "%" : "not available"}
- Volume: ${bestMarket.evidence.volume !== null ? `$${bestMarket.evidence.volume.toLocaleString()}` : "unknown"}
- Liquidity: ${bestMarket.evidence.liquidity !== null ? `$${bestMarket.evidence.liquidity.toLocaleString()}` : "unknown"}

${topMarketsForAnalysis.length > 1 ? `## Other Related Markets\n${topMarketsForAnalysis.slice(1).map((m, i) => `${i + 1}. ${m.title} - ${m.probability} (${m.matchScore} match)`).join("\n")}` : ""}

${newsArticles.length > 0 ? `## Recent News (${newsArticles.length} articles)\n${newsArticles.slice(0, 5).map((article, i) => `${i + 1}. "${article.title}" (${article.source})\n   ${article.snippet || ""}`).join("\n\n")}` : "## No recent news found"}

${tweets.length > 0 ? `## Social Sentiment - Twitter (${tweets.length} tweets)\n${tweets.slice(0, 3).map((tweet, i) => `${i + 1}. @${tweet.authorUsername}: "${tweet.text.substring(0, 150)}..." (${tweet.likeCount || 0} likes)`).join("\n")}` : ""}

${redditPosts.length > 0 ? `## Social Sentiment - Reddit (${redditPosts.length} posts)\n${redditPosts.slice(0, 3).map((post, i) => `${i + 1}. r/${post.subreddit}: "${post.title}" (${post.score} upvotes)`).join("\n")}` : ""}

${kalshiMarkets.length > 0 ? `## Alternative Markets - Kalshi\n${kalshiMarkets.slice(0, 3).map((market, i) => `${i + 1}. ${market.title} - ${market.lastChance !== null ? market.lastChance.toFixed(1) + "%" : "N/A"}`).join("\n")}` : ""}

Think through this step by step, then provide your analysis.`,
                },
              ],
              response_format: { type: "json_object" },
              temperature: 0.5,
            }),
            signal: AbortSignal.timeout(60000),
          }
        );

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          const summaryContent = summaryData.choices[0].message.content;
          const summaryParsed = JSON.parse(summaryContent);

          answerReasoning = summaryParsed.reasoning || undefined;
          answerSummary = summaryParsed.answer || summaryParsed.summary || "Unable to generate answer.";

          // Add related insight and data gap info
          if (summaryParsed.related_insight) {
            answerSummary = `${answerSummary}\n\n**Related Market Insight:** ${summaryParsed.related_insight}`;
          }
          if (summaryParsed.data_gap) {
            answerSummary = `${answerSummary}\n\n**Note:** ${summaryParsed.data_gap}`;
          }
          answerKeyInsight = summaryParsed.suggestion || undefined;
        } else {
          // Fallback
          const probText = probYes !== null
            ? `While there isn't a perfect market match, the closest related market (${bestMarket.title}) shows a ${probYes.toFixed(1)}% probability.`
            : `We found a related market (${bestMarket.title}), but it doesn't directly address your question.`;
          answerSummary = probText;
        }
      } catch (error) {
        console.error("Error generating answer for weak match:", error);
        const probText = probYes !== null
          ? `The closest related market suggests a ${probYes.toFixed(1)}% probability, but this market may not directly address your specific question.`
          : `We found a related market (${bestMarket.title}), but it doesn't directly address your question.`;
        answerSummary = probText;
      }
    } else {
      // Good match - provide comprehensive answer with chain-of-thought reasoning
      try {
        const topMarketsForAnalysis = marketsWithEvidence
          .filter(m => m.evidence.chanceYes !== null && m.matchScore >= 0.4)
          .slice(0, 5)
          .map(m => ({
            title: m.title,
            description: m.description,
            probability: m.evidence.chanceYes !== null ? m.evidence.chanceYes.toFixed(1) + "%" : "N/A",
            volume: m.evidence.volume ? `$${m.evidence.volume.toLocaleString()}` : "N/A",
            matchScore: (m.matchScore * 100).toFixed(0) + "%",
            reasons: m.reasons || [],
          }));

        const summaryResponse = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getOpenRouterApiKey()}`,
            },
            body: JSON.stringify({
              model: MODEL_CONFIGS.answerGeneration,
              messages: [
                {
                  role: "system",
                  content: ANSWER_GENERATION_PROMPT_GOOD_MATCH,
                },
                {
                  role: "user",
                  content: `Today's date: ${currentDate}

## User's Question
"${args.question}"

## Primary Market (${(matchScore * 100).toFixed(0)}% match)
- **Title**: ${bestMarket.title}
- **Description**: ${bestMarket.description || "N/A"}
- **Current Probability**: ${probYes !== null ? probYes.toFixed(1) + "%" : "not available"}
- **Bid-Ask Spread**: ${bestMarket.evidence.spread !== null ? (bestMarket.evidence.spread * 100).toFixed(2) + "%" : "unknown"}
- **Trading Volume**: ${bestMarket.evidence.volume !== null ? `$${bestMarket.evidence.volume.toLocaleString()}` : "unknown"}
- **Liquidity**: ${bestMarket.evidence.liquidity !== null ? `$${bestMarket.evidence.liquidity.toLocaleString()}` : "unknown"}
- **Why this matches**: ${bestMarket.reasons?.join("; ") || "Semantic similarity"}

${topMarketsForAnalysis.length > 1 ? `## Corroborating Markets
${topMarketsForAnalysis.slice(1).map((m, i) => `${i + 1}. **${m.title}** - ${m.probability} probability, ${m.volume} volume (${m.matchScore} match)`).join("\n")}` : ""}

${kalshiMarkets.length > 0 ? `## Kalshi Markets (Alternative Platform)
${kalshiMarkets.slice(0, 3).map((market, i) => `${i + 1}. **${market.title}** - ${market.lastChance !== null ? market.lastChance.toFixed(1) + "%" : "N/A"} probability`).join("\n")}` : ""}

${newsArticles.length > 0 ? `## Recent News Context (${newsArticles.length} articles)
${newsArticles.slice(0, 5).map((article, i) => `${i + 1}. **${article.title}** (${article.source})
   "${article.snippet || "No snippet"}"`).join("\n\n")}` : "## No recent news"}

${tweets.length > 0 ? `## Twitter Sentiment (${tweets.length} tweets)
${tweets.slice(0, 3).map((tweet, i) => `- @${tweet.authorUsername} (${tweet.likeCount || 0} likes): "${tweet.text.substring(0, 120)}..."`).join("\n")}` : ""}

${redditPosts.length > 0 ? `## Reddit Discussion (${redditPosts.length} posts)
${redditPosts.slice(0, 3).map((post, i) => `- r/${post.subreddit}: "${post.title}" (${post.score} votes, ${post.numComments} comments)`).join("\n")}` : ""}

${googleTrends.length > 0 ? `## Search Interest (Google Trends)
${googleTrends.slice(0, 3).map((trend, i) => `- "${trend.keyword}": ${trend.searchInterest}/100 interest`).join("\n")}` : ""}

Analyze all this data step-by-step, then provide your definitive answer.`,
                },
              ],
              response_format: { type: "json_object" },
              temperature: 0.4,
            }),
            signal: AbortSignal.timeout(60000),
          }
        );

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          const summaryContent = summaryData.choices[0].message.content;
          const summaryParsed = JSON.parse(summaryContent);

          // Extract all the enhanced response fields
          answerReasoning = summaryParsed.reasoning || undefined;
          answerKeyInsight = summaryParsed.key_insight || undefined;
          answerCaveats = summaryParsed.caveats || undefined;

          // Build the summary from answer + explanation
          const mainAnswer = summaryParsed.answer || summaryParsed.summary || "Evidence available but answer generation failed.";
          const explanation = summaryParsed.explanation || "";

          answerSummary = explanation ? `${mainAnswer}\n\n${explanation}` : mainAnswer;

          // Add confidence factors if available
          if (summaryParsed.confidence_factors && summaryParsed.confidence_factors.length > 0) {
            const factors = summaryParsed.confidence_factors.slice(0, 3).join("; ");
            answerSummary = `${answerSummary}\n\n**Confidence Factors:** ${factors}`;
          }
        } else {
          // Fallback
          const probText = probYes !== null
            ? `Prediction markets show a ${probYes.toFixed(1)}% probability for this outcome.`
            : "Market probability data is not available.";

          const volumeText = bestMarket.evidence.volume
            ? ` This market has $${bestMarket.evidence.volume.toLocaleString()} in volume, indicating ${bestMarket.evidence.volume > 1000000 ? "high" : bestMarket.evidence.volume > 100000 ? "moderate" : "limited"} confidence.`
            : "";

          answerSummary = `${probText}${volumeText}`;
        }
      } catch (error) {
        console.error("Error generating answer:", error);
        const probText = probYes !== null
          ? `Based on Polymarket data, there is a ${probYes.toFixed(1)}% probability that this claim is true.`
          : "Market data is available but probability information could not be retrieved.";
        answerSummary = probText;
      }
    }

    // Check if query contains a date and fetch expiring markets
    const targetDate = parseDateFromQuery(args.question);
    let expiringMarkets: MarketWithEvidence[] = [];
    
    if (targetDate) {
      try {
        console.log(`[factCheck] Detected date in query: ${new Date(targetDate).toISOString()}`);
        const expiringMarketsData = await ctx.runQuery(
          internalApi.queries.getMarketsByEndDate,
          { targetDate, dayRange: 1 }
        );
        
        // Fetch evidence for expiring markets
        for (const market of expiringMarketsData.slice(0, 20)) {
          try {
            const chanceData = await ctx
              .runAction(internalApi.actions.polymarket.fetchClobLastChance, {
                marketId: market.polymarketMarketId,
                tokenId: null,
              })
              .catch(() => null);

            let chanceYes: number | null = null;
            let spread: number | null = null;

            if (chanceData && typeof chanceData === "object") {
              if ("chance" in chanceData && typeof chanceData.chance === "number") {
                chanceYes = chanceData.chance;
              } else if ("bid" in chanceData && typeof chanceData.bid === "number") {
                chanceYes = chanceData.bid;
              }
              
              if ("spread" in chanceData && typeof chanceData.spread === "number") {
                spread = chanceData.spread;
              } else if ("ask" in chanceData && "bid" in chanceData && 
                         typeof chanceData.ask === "number" && typeof chanceData.bid === "number") {
                spread = chanceData.ask - chanceData.bid;
              }
            }

            expiringMarkets.push({
              polymarketMarketId: market.polymarketMarketId,
              title: market.title,
              description: market.description,
              endDate: market.endDate,
              url: market.url,
              outcomes: market.outcomes,
              volume: market.volume,
              liquidity: market.liquidity,
              similarity: 0, // Not based on similarity
              matchScore: 0,
              reasons: [`Expires on ${new Date(market.endDate!).toLocaleDateString()}`],
              mismatchFlags: [],
              evidence: {
                chanceYes,
                spread,
                volume: market.volume,
                liquidity: market.liquidity,
                updatedAt: Date.now(),
              },
            });
          } catch (error) {
            console.error(`Error fetching evidence for expiring market ${market.polymarketMarketId}:`, error);
            // Still add market without chance data
            expiringMarkets.push({
              polymarketMarketId: market.polymarketMarketId,
              title: market.title,
              description: market.description,
              endDate: market.endDate,
              url: market.url,
              outcomes: market.outcomes,
              volume: market.volume,
              liquidity: market.liquidity,
              similarity: 0,
              matchScore: 0,
              reasons: [`Expires on ${new Date(market.endDate!).toLocaleDateString()}`],
              mismatchFlags: [],
              evidence: {
                chanceYes: null,
                spread: null,
                volume: market.volume,
                liquidity: market.liquidity,
                updatedAt: Date.now(),
              },
            });
          }
        }
        
        console.log(`[factCheck] Found ${expiringMarkets.length} expiring markets`);
      } catch (error) {
        console.error("[factCheck] Error fetching expiring markets:", error);
      }
    }

    // Apply deep analysis algorithms automatically
    let sentiment: SentimentResult | undefined;
    let risk: RiskAssessment | undefined;
    let fusion: FusionResult | undefined;
    let momentum: MomentumResult | undefined;
    let anomalies: AnomalyResult | undefined;
    let ensemble: EnsembleResult | null = null;
    let graph: GraphResult | undefined;
    let cascade: CascadeResult | undefined;
    let insights: string[] = [];

    if (bestMarket && args.mode !== "fast") {
      try {
        const marketProb = bestMarket.evidence.chanceYes ?? null;
        const spread = bestMarket.evidence.spread ?? null;
        const volume = bestMarket.evidence.volume ?? null;
        const liquidity = bestMarket.evidence.liquidity ?? null;

        // 1. SENTIMENT ANALYSIS (using simple version)
        sentiment = analyzeSentimentSimple(
          newsArticles.map(a => ({ title: a.title, snippet: a.snippet || undefined })),
          tweets.map(t => ({ text: t.text })),
          [
            ...redditPosts.map(r => ({ title: r.title, text: r.text || undefined })),
            ...tiktokVideos.map(v => ({ title: v.description.substring(0, 200), text: v.description })),
            ...instagramPosts.map(p => ({ title: p.caption.substring(0, 200), text: p.caption })),
          ],
          marketProb
        );

        // 2. BAYESIAN FUSION
        const sourceReliability: SourceReliability = {
          markets: volume && volume > 50000 ? 0.9 : volume && volume > 10000 ? 0.7 : 0.5,
          news: newsArticles.length > 5 ? 0.8 : newsArticles.length > 0 ? 0.6 : 0.3,
          social: (tweets.length + redditPosts.length + tiktokVideos.length + instagramPosts.length) > 10 ? 0.6 : (tweets.length + redditPosts.length + tiktokVideos.length + instagramPosts.length) > 0 ? 0.4 : 0.2,
          trends: googleTrends.length > 0 ? 0.5 : 0.2,
        };

        const marketProbForFusion = marketProb !== null ? marketProb : 0.5;
        const newsSentiment = sentiment.breakdown.news; // -1 to 1
        const socialSentiment = sentiment.breakdown.social; // -1 to 1
        const trendSignal = googleTrends.length > 0 
          ? (googleTrends.reduce((sum, t) => sum + (t.searchInterest || 50), 0) / (googleTrends.length * 50)) - 1 // Convert 0-100 to -1 to 1
          : 0;

        fusion = bayesianFusion(
          marketProbForFusion,
          newsSentiment,
          socialSentiment,
          trendSignal,
          sourceReliability
        );

        // 3. ANOMALY DETECTION
        const recentNewsCount = newsArticles.filter((a: any) => {
          const age = Date.now() - (a.publishedAt || Date.now());
          return age < 24 * 60 * 60 * 1000;
        }).length;

        const socialEngagement = [
          ...tweets.map((t: any) => (t.likeCount || 0) + (t.retweetCount || 0)),
          ...redditPosts.map((r: any) => r.score || 0),
          ...tiktokVideos.map((t: any) => (t.likeCount || 0) + (t.viewCount || 0) / 1000),
          ...instagramPosts.map((i: any) => (i.likeCount || 0) + (i.commentCount || 0)),
        ].reduce((sum, val) => sum + val, 0);

        anomalies = detectAnomalies(
          {
            volume: volume || 0,
            spread: spread || 0,
            newsCount24h: recentNewsCount,
            socialEngagement24h: socialEngagement,
            trendInterest: googleTrends.length > 0
              ? googleTrends.reduce((sum: number, t: any) => sum + (t.searchInterest || 50), 0) / googleTrends.length
              : undefined,
          },
          {
            volumeAvg: 50000,
            volumeStd: 25000,
            spreadAvg: 0.05,
            spreadStd: 0.02,
            newsCountAvg: 5,
            newsCountStd: 3,
            socialEngagementAvg: 1000,
            socialEngagementStd: 500,
            trendInterestAvg: 50,
            trendInterestStd: 20,
          }
        );

        // 4. RISK ASSESSMENT
        if (anomalies) {
          risk = assessRisk(
            bestMarket,
            newsArticles,
            marketProb,
            spread,
            volume,
            liquidity,
            anomalies
          );
        }

        // 5. ENSEMBLE PREDICTION
        const baseModels = [
          {
            modelName: "market_probability",
            probability: marketProb !== null ? marketProb : 50, // Percentage (0-100)
            confidence: marketProb !== null ? 0.8 : 0.1,
          },
          {
            modelName: "fusion_probability",
            probability: fusion.fusedProbability, // Already percentage (0-100)
            confidence: fusion.confidence,
          },
          {
            modelName: "sentiment_probability",
            probability: ((sentiment.score + 1) / 2) * 100, // Convert -1,1 to 0-100 percentage
            confidence: sentiment.confidence,
          },
        ].filter(m => m.probability !== null && m.probability !== undefined);

        if (baseModels.length > 1) {
          ensemble = ensemblePrediction(baseModels);
        }

        // 6. MOMENTUM DETECTION
        // Calculate news and social velocity (items per hour in last 24h)
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;

        const recentNews = newsArticles.filter((a: any) => (a.publishedAt || 0) > oneDayAgo);
        const recentTweets = tweets.filter((t: any) => (t.createdAt || 0) > oneDayAgo);
        const recentReddit = redditPosts.filter((r: any) => (r.createdAt || 0) > oneDayAgo);
        const recentSocial = recentTweets.length + recentReddit.length +
          tiktokVideos.filter((v: any) => (v.createdAt || 0) > oneDayAgo).length +
          instagramPosts.filter((p: any) => (p.createdAt || 0) > oneDayAgo).length;

        const newsVelocity = recentNews.length / 24; // items per hour
        const socialVelocity = recentSocial / 24;

        // Calculate trend acceleration from Google Trends data
        const trendAcceleration = googleTrends.length > 0
          ? calculateAcceleration(googleTrends.map((t: any) => ({
              timestamp: t.storedAt || now,
              value: t.searchInterest || 50
            })))
          : 0;

        // Build price history for momentum (use market evidence if available)
        const priceHistory: Array<{ timestamp: number; price: number }> = [];
        if (marketProb !== null) {
          // We have current price - create a simple history point
          priceHistory.push({ timestamp: now, price: marketProb });
        }

        momentum = detectMomentum(
          priceHistory,
          newsVelocity,
          socialVelocity,
          trendAcceleration
        );

        // 7. KNOWLEDGE GRAPH BUILDING
        graph = buildKnowledgeGraph(
          // Markets
          marketsWithEvidence.slice(0, 10).map((m: any) => ({
            id: m.polymarketMarketId,
            title: m.title,
            description: m.description || "",
            timestamp: m.evidence?.updatedAt || now
          })),
          // News
          newsArticles.slice(0, 15).map((a: any) => ({
            id: `news-${a.url}`,
            title: a.title,
            snippet: a.snippet || "",
            timestamp: a.publishedAt || now,
            source: a.source
          })),
          // Social (combine all social sources)
          [
            ...tweets.slice(0, 10).map((t: any) => ({
              id: `tweet-${t.id}`,
              text: t.text,
              timestamp: t.createdAt || now,
              author: t.authorUsername,
              engagement: (t.likeCount || 0) + (t.retweetCount || 0)
            })),
            ...redditPosts.slice(0, 10).map((r: any) => ({
              id: `reddit-${r.id}`,
              text: `${r.title} ${r.text || ""}`,
              timestamp: r.createdAt || now,
              author: r.author,
              engagement: r.score || 0
            })),
          ],
          // Trends
          googleTrends.map((t: any) => ({
            keyword: t.keyword,
            searchInterest: t.searchInterest || 50,
            timestamp: t.storedAt || now
          }))
        );

        // 8. SENTIMENT CASCADE DETECTION
        // Build timeline from all sources
        const cascadeTimeline: Array<{
          timestamp: number;
          source: "news" | "twitter" | "reddit" | "tiktok" | "market" | "trend";
          sentiment: number;
          engagement: number;
          content: string;
        }> = [
          ...newsArticles.map((a: any) => ({
            timestamp: a.publishedAt || now,
            source: "news" as const,
            sentiment: sentiment?.breakdown.news || 0,
            engagement: 1, // News doesn't have engagement metrics
            content: a.title
          })),
          ...tweets.map((t: any) => ({
            timestamp: t.createdAt || now,
            source: "twitter" as const,
            sentiment: sentiment?.breakdown.social || 0,
            engagement: (t.likeCount || 0) + (t.retweetCount || 0),
            content: t.text
          })),
          ...redditPosts.map((r: any) => ({
            timestamp: r.createdAt || now,
            source: "reddit" as const,
            sentiment: sentiment?.breakdown.social || 0,
            engagement: r.score || 0,
            content: r.title
          })),
          ...tiktokVideos.map((v: any) => ({
            timestamp: v.createdAt || now,
            source: "tiktok" as const,
            sentiment: sentiment?.breakdown.social || 0,
            engagement: (v.likeCount || 0) + (v.viewCount || 0) / 100,
            content: v.description
          })),
        ];

        if (cascadeTimeline.length >= 3) {
          cascade = detectSentimentCascade(cascadeTimeline, 1); // 1 hour window
        }

        // 9. GENERATE INSIGHTS
        insights = [];
        if (sentiment) {
          if (sentiment.overall === "positive" && marketProb && marketProb > 60) {
            insights.push("Strong positive sentiment aligns with high market probability");
          } else if (sentiment.overall === "negative" && marketProb && marketProb < 40) {
            insights.push("Negative sentiment aligns with low market probability");
          }
        }
        if (anomalies?.isAnomaly) {
          insights.push(`Market anomaly detected: ${anomalies.explanation}`);
        }
        if (risk && risk.overall === "high") {
          insights.push("High risk detected - consider multiple risk factors before trading");
        }
        // Both ensemble.finalProbability and marketProb are now percentages (0-100)
        if (ensemble && marketProb && Math.abs(ensemble.finalProbability - marketProb) > 15) {
          insights.push("Ensemble prediction differs significantly from market price - potential opportunity");
        }
        // Momentum insights
        if (momentum) {
          if (momentum.earlySignal) {
            insights.push(`Early signal detected: ${momentum.momentum} momentum building in news/social before price movement`);
          }
          if (momentum.strength > 0.5 && momentum.momentum !== "neutral") {
            insights.push(`Strong ${momentum.momentum} momentum detected (${(momentum.strength * 100).toFixed(0)}% strength)`);
          }
        }
        // Graph insights
        if (graph && graph.communities.length > 2) {
          insights.push(`Knowledge graph shows ${graph.communities.length} distinct information clusters`);
        }
        // Cascade insights
        if (cascade?.isCascade) {
          insights.push(`Active ${cascade.sentiment} sentiment cascade detected - information spreading rapidly across sources`);
        }
      } catch (error) {
        console.error("[factCheck] Error applying deep analysis algorithms:", error);
        // Continue without deep analysis if it fails
      }
    }

    // Risk assessment helper function
    function assessRisk(
      market: any,
      newsArticles: any[],
      marketProbability: number | null,
      spread: number | null,
      volume: number | null,
      liquidity: number | null,
      anomalies: AnomalyResult
    ): RiskAssessment {
      const factors: Array<{ name: string; level: "low" | "medium" | "high"; description: string }> = [];

      if (spread !== null) {
        const volatilityRisk: "low" | "medium" | "high" = spread > 0.1 ? "high" : spread > 0.05 ? "medium" : "low";
        factors.push({
          name: "Volatility",
          level: volatilityRisk,
          description: spread > 0.1 
            ? "High spread indicates significant chance uncertainty"
            : spread > 0.05
            ? "Moderate spread suggests some chance uncertainty"
            : "Low spread indicates stable pricing",
        });
      }

      if (liquidity !== null) {
        const liquidityRisk: "low" | "medium" | "high" = liquidity < 10000 ? "high" : liquidity < 50000 ? "medium" : "low";
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

      if (newsArticles.length === 0) {
        factors.push({
          name: "Information Availability",
          level: "high",
          description: "Limited news coverage makes it harder to assess market fundamentals",
        });
      } else if (newsArticles.length < 3) {
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

      if (anomalies.isAnomaly) {
        factors.push({
          name: "Market Anomaly",
          level: anomalies.anomalyScore > 0.7 ? "high" : anomalies.anomalyScore > 0.4 ? "medium" : "low",
          description: anomalies.explanation,
        });
      }

      const riskScores = factors.map(f => {
        if (f.level === "high") return 0.8;
        if (f.level === "medium") return 0.5;
        return 0.2;
      });
      const overallScore = riskScores.length > 0 
        ? riskScores.reduce((a, b) => a + b, 0) / riskScores.length
        : 0.3;

      return {
        overall: overallScore > 0.6 ? "high" : overallScore > 0.4 ? "medium" : "low",
        score: overallScore,
        factors,
        confidence: Math.min(factors.length / 4, 1),
      };
    }

    const result: FactCheckResult = {
      runId,
      parsedClaim,
      answer: {
        summary: answerSummary,
        probYes,
        confidence,
        ambiguity: reranked.overallAmbiguity,
        ...(answerReasoning && { reasoning: answerReasoning }),
        ...(answerKeyInsight && { keyInsight: answerKeyInsight }),
        ...(answerCaveats && answerCaveats.length > 0 && { caveats: answerCaveats }),
      },
      bestMarket: {
        ...bestMarket,
        reasons: bestMarket.reasons || [],
        mismatchFlags: bestMarket.mismatchFlags || [],
      },
      alternatives: marketsWithEvidence.slice(1, 10).map((m: MarketWithEvidence) => ({
        ...m,
        reasons: m.reasons || [],
        mismatchFlags: m.mismatchFlags || [],
      })),
      ...(newsArticles.length > 0 && { newsArticles }),
      ...(tweets.length > 0 && { tweets }),
      ...(redditPosts.length > 0 && { redditPosts }),
      ...(tiktokVideos.length > 0 && { tiktokVideos }),
      ...(instagramPosts.length > 0 && { instagramPosts }),
      ...(youtubeVideos.length > 0 && { youtubeVideos }),
      ...(googleTrends.length > 0 && { googleTrends }),
      ...(kalshiMarkets.length > 0 && { kalshiMarkets }),
      ...(targetDate && { targetDate }),
      ...(expiringMarkets.length > 0 && { expiringMarkets }),
      ...(sentiment && { sentiment }),
      ...(risk && { risk }),
      ...(fusion && { fusion }),
      ...(momentum && { momentum }),
      ...(anomalies && { anomalies }),
      ...(ensemble && { ensemble }),
      ...(graph && { graph }),
      ...(cascade && { cascade }),
      ...(insights.length > 0 && { insights }),
      debug: {
        scoringBreakdown: {
          matchScore,
          volumeScore,
          spreadScore,
          recencyScore,
        },
        timings: {
          total: Date.now() - startTime,
        },
      },
    };

    // Log query
    await ctx.runMutation(internalApi.mutations.logQuery, {
      question: args.question,
      parsedClaim,
      bestMarketId: bestMarket.polymarketMarketId,
      confidence,
      debug: result.debug,
    });

    // Log prediction for learning system
    // Extract source contributions from the analysis
    try {
      const sourceContributions: {
        polymarket?: { probability: number; marketId: string; volume?: number; liquidity?: number };
        kalshi?: { probability: number; ticker: string; volume?: number };
        news?: { sentiment: number; articleCount: number; avgRelevance?: number };
        twitter?: { sentiment: number; tweetCount: number; totalEngagement?: number };
        reddit?: { sentiment: number; postCount: number; totalScore?: number };
        youtube?: { sentiment: number; videoCount: number; totalViews?: number };
      } = {};

      // Polymarket data
      if (bestMarket.evidence.chanceYes !== null) {
        sourceContributions.polymarket = {
          probability: bestMarket.evidence.chanceYes / 100, // Convert from percentage to 0-1
          marketId: bestMarket.polymarketMarketId,
          volume: bestMarket.evidence.volume ?? undefined,
          liquidity: bestMarket.evidence.liquidity ?? undefined,
        };
      }

      // Kalshi data (use first matching market)
      if (kalshiMarkets.length > 0 && kalshiMarkets[0].lastChance !== null) {
        sourceContributions.kalshi = {
          probability: kalshiMarkets[0].lastChance / 100, // Convert from percentage to 0-1
          ticker: kalshiMarkets[0].ticker,
          volume: kalshiMarkets[0].volume ?? undefined,
        };
      }

      // News sentiment
      if (newsArticles.length > 0 && sentiment) {
        const avgRelevance = newsArticles
          .filter(a => a.relevanceScore !== null)
          .reduce((sum, a) => sum + (a.relevanceScore || 0), 0) / newsArticles.length || undefined;
        sourceContributions.news = {
          sentiment: sentiment.breakdown.news,
          articleCount: newsArticles.length,
          avgRelevance,
        };
      }

      // Twitter sentiment
      if (tweets.length > 0 && sentiment) {
        const totalEngagement = tweets.reduce(
          (sum, t) => sum + (t.likeCount || 0) + (t.retweetCount || 0),
          0
        );
        sourceContributions.twitter = {
          sentiment: sentiment.breakdown.social,
          tweetCount: tweets.length,
          totalEngagement,
        };
      }

      // Reddit sentiment
      if (redditPosts.length > 0 && sentiment) {
        const totalScore = redditPosts.reduce((sum, r) => sum + r.score, 0);
        sourceContributions.reddit = {
          sentiment: sentiment.breakdown.social,
          postCount: redditPosts.length,
          totalScore,
        };
      }

      // YouTube data
      if (youtubeVideos.length > 0 && sentiment) {
        const totalViews = youtubeVideos.reduce(
          (sum, v) => sum + (v.viewCount || 0),
          0
        );
        sourceContributions.youtube = {
          sentiment: sentiment.breakdown.social,
          videoCount: youtubeVideos.length,
          totalViews,
        };
      }

      // Only log prediction if we have at least one source
      if (Object.keys(sourceContributions).length > 0) {
        await ctx.runMutation(internalApi.mutations.logPrediction, {
          question: args.question,
          predictedProbability: probYes !== null ? probYes / 100 : 0.5, // Convert percentage to 0-1
          confidence,
          sourceContributions,
          primaryMarketId: bestMarket.polymarketMarketId,
          primaryMarketSource: "polymarket",
          marketCloseDate: bestMarket.endDate,
        });
        console.log("[factCheck] Logged prediction for learning system");
      }
    } catch (error) {
      console.error("[factCheck] Error logging prediction:", error);
      // Don't fail the whole request if prediction logging fails
    }

    await ctx.runMutation(internalApi.mutations.appendRunEvent, {
      runId,
      stage: "done",
      status: "completed",
      message: "Fact-check completed",
      meta: { bestMarketId: bestMarket.polymarketMarketId, confidence },
    });

    await ctx.runMutation(internalApi.mutations.completeFactCheckRun, {
      runId,
      status: "completed",
      bestMarketId: bestMarket.polymarketMarketId,
      confidence,
      metrics: {
        candidateCount: candidates.length,
        rankedCount: rankedMarkets.length,
        newsCount: newsArticles.length,
        socialCount: tweets.length + redditPosts.length + tiktokVideos.length + instagramPosts.length,
      },
    });

    return result;
  },
});
