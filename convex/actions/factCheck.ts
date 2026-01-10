"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { clamp01, ParsedClaim, parseDateFromQuery } from "../utils";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_CHAT_MODEL =
  process.env.OPENROUTER_CHAT_MODEL || "openai/gpt-4o-mini";

if (!OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY environment variable is required");
}

// Type-safe internal API references
const internalApi = internal as {
  queries: {
    getCache: any;
    getMarket: any;
    getAllEmbeddings: any;
    getRecentQueries: any;
    getMarketsByEndDate: any;
    getMarketSentimentSnapshotBefore: any;
  };
  mutations: {
    setCache: any;
    upsertMarket: any;
    upsertEmbedding: any;
    logQuery: any;
    insertMarketSentimentSnapshot: any;
  };
  actions: {
    aiEmbed: { embedText: any };
    aiParseClaim: { aiParseClaim: any };
    aiRerank: { aiRerank: any };
    polymarket: { fetchGammaMarkets: any; fetchClobBook: any; fetchClobLastPrice: any; fetchGammaMarketById: any };
    retrieveCandidates: { retrieveCandidates: any };
    ingestMarkets: { ingestMarkets: any };
    retrieveNews: { retrieveNews: any };
    retrieveTwitter: { retrieveTwitter: any };
    retrieveReddit: { retrieveReddit: any };
    retrieveTikTok: { retrieveTikTok: any };
    retrieveInstagram: { retrieveInstagram: any };
    retrieveGoogleTrends: { retrieveGoogleTrends: any };
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
    priceYes: number | null;
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
  lastPrice: number | null;
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

interface GoogleTrend {
  keyword: string;
  searchInterest: number;
  relatedQueries: string[];
  relatedTopics: string[];
  timeRange: string;
  region: string;
  trendScore: number | null;
}

interface FactCheckResult {
  parsedClaim: ParsedClaim;
  answer: {
    summary: string;
    probYes: number | null;
    confidence: number;
    ambiguity: "low" | "medium" | "high";
  };
  bestMarket: MarketWithEvidence | null;
  alternatives: MarketWithEvidence[];
  marketSentiment?: {
    label: "bullish" | "bearish" | "neutral" | "unknown";
    priceYes: number | null;
    delta1h: number | null;
    delta24h: number | null;
    confidence: number;
    drivers: {
      volumeScore: number;
      spreadScore: number;
      momentumScore: number;
    };
  };
  newsArticles?: NewsArticle[]; // Relevant news articles
  tweets?: Tweet[]; // Relevant tweets
  redditPosts?: RedditPost[]; // Relevant Reddit posts
  tiktokVideos?: TikTokVideo[]; // Relevant TikTok videos
  instagramPosts?: InstagramPost[]; // Relevant Instagram posts
  googleTrends?: GoogleTrend[]; // Google Trends data
  kalshiMarkets?: KalshiMarket[]; // Relevant Kalshi markets
  expiringMarkets?: MarketWithEvidence[]; // Markets expiring on the queried date
  targetDate?: number; // The date parsed from the query
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
  },
  handler: async (ctx, args): Promise<FactCheckResult> => {
    const startTime = Date.now();

    // Step 1: Parse claim
    const parsedClaim: ParsedClaim = await ctx.runAction(
      internalApi.actions.aiParseClaim.aiParseClaim,
      { question: args.question }
    );

    // Step 1.5: Retrieve news articles, social media posts, and Kalshi markets (in parallel for performance)
    let newsArticles: NewsArticle[] = [];
    let tweets: Tweet[] = [];
    let redditPosts: RedditPost[] = [];
    let tiktokVideos: TikTokVideo[] = [];
    let instagramPosts: InstagramPost[] = [];
    let googleTrends: GoogleTrend[] = [];
    let kalshiMarkets: KalshiMarket[] = [];
    
    try {
      newsArticles = await ctx.runAction(internalApi.actions.retrieveNews.retrieveNews, {
        parsedClaim,
        limit: 10,
      });
      console.log(`[factCheck] Retrieved ${newsArticles.length} news articles`);
    } catch (error) {
      console.error("[factCheck] Error retrieving news:", error);
    }

    try {
      tweets = await ctx.runAction(internalApi.actions.retrieveTwitter.retrieveTwitter, {
        parsedClaim,
        limit: 10,
      });
      console.log(`[factCheck] Retrieved ${tweets.length} tweets`);
    } catch (error) {
      console.error("[factCheck] Error retrieving tweets:", error);
    }

    try {
      redditPosts = await ctx.runAction(internalApi.actions.retrieveReddit.retrieveReddit, {
        parsedClaim,
        limit: 10,
      });
      console.log(`[factCheck] Retrieved ${redditPosts.length} Reddit posts`);
    } catch (error) {
      console.error("[factCheck] Error retrieving Reddit posts:", error);
    }

    try {
      tiktokVideos = await ctx.runAction(internalApi.actions.retrieveTikTok.retrieveTikTok, {
        parsedClaim,
        limit: 10,
      });
      console.log(`[factCheck] Retrieved ${tiktokVideos.length} TikTok videos`);
    } catch (error) {
      console.error("[factCheck] Error retrieving TikTok videos:", error);
    }

    try {
      instagramPosts = await ctx.runAction(internalApi.actions.retrieveInstagram.retrieveInstagram, {
        parsedClaim,
        limit: 10,
      });
      console.log(`[factCheck] Retrieved ${instagramPosts.length} Instagram posts`);
    } catch (error) {
      console.error("[factCheck] Error retrieving Instagram posts:", error);
    }

    try {
      googleTrends = await ctx.runAction(internalApi.actions.retrieveGoogleTrends.retrieveGoogleTrends, {
        parsedClaim,
        limit: 10,
      });
      console.log(`[factCheck] Retrieved ${googleTrends.length} Google Trends`);
    } catch (error) {
      console.error("[factCheck] Error retrieving Google Trends:", error);
    }

    try {
      const kalshiData = await ctx.runAction(internalApi.actions.kalshi.searchKalshiMarkets, {
        query: parsedClaim.claim,
        limit: 10,
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

    // Step 2: Retrieve candidates
    const candidates: MarketCandidate[] = await ctx.runAction(
      internalApi.actions.retrieveCandidates.retrieveCandidates,
      { parsedClaim }
    );

    if (candidates.length === 0) {
      const result: FactCheckResult = {
        parsedClaim,
        answer: {
          summary: "No Polymarket markets found matching this claim.",
          probYes: null,
          confidence: 0,
          ambiguity: "high" as const,
        },
        bestMarket: null,
        alternatives: [],
        debug: {
          scoringBreakdown: {},
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

      return result;
    }

    // Step 3: Rerank
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
    const evidenceNow = Date.now();

    for (const rankedMarket of topMarkets) {
      const market = candidates.find(
        (c: MarketCandidate) => c.polymarketMarketId === rankedMarket.polymarketMarketId
      );
      if (!market) continue;

      try {
        // Refresh market metadata from Gamma (so title/volume/liquidity/endDate aren't tied to ingestion cadence).
        // If Gamma says it's ended, skip it entirely.
        let refreshedMarket: Partial<MarketCandidate> | null = null;
        try {
          const gamma = await ctx.runAction(internalApi.actions.polymarket.fetchGammaMarketById, {
            marketId: market.polymarketMarketId,
          });
          const m = gamma?.market;
          if (m) {
            const endDateRaw = m.endDate || m.endDateISO || m.endDateIso || m.endDate_iso;
            const endDateMs = endDateRaw ? new Date(endDateRaw).getTime() : null;
            if (typeof endDateMs === "number" && Number.isFinite(endDateMs) && endDateMs <= evidenceNow) {
              continue;
            }

            let outcomes: string[] = ["Yes", "No"];
            if (m.outcomes) {
              if (typeof m.outcomes === "string") {
                try {
                  const parsed = JSON.parse(m.outcomes);
                  if (Array.isArray(parsed)) outcomes = parsed.map((x) => String(x));
                } catch {
                  outcomes = [String(m.outcomes)];
                }
              } else if (Array.isArray(m.outcomes)) {
                outcomes = m.outcomes.map((x: any) => String(x));
              }
            }

            refreshedMarket = {
              title: String(m.question || m.title || market.title),
              description: String(m.description || m.resolution || market.description || ""),
              endDate: endDateMs && Number.isFinite(endDateMs) ? endDateMs : market.endDate,
              outcomes,
              url: m.slug ? `https://polymarket.com/event/${m.slug}` : market.url,
              volume: typeof m.volumeNum === "number" ? m.volumeNum : m.volume ? Number.parseFloat(String(m.volume)) : market.volume,
              liquidity: typeof m.liquidityNum === "number" ? m.liquidityNum : m.liquidity ? Number.parseFloat(String(m.liquidity)) : market.liquidity,
            };
          }
        } catch {
          // If Gamma refresh fails, continue using ingested market data.
        }

        const mergedMarket: MarketCandidate = {
          ...market,
          ...(refreshedMarket || {}),
        };

        // Fetch price from WebSocket (includes bid/ask for spread calculation)
        const price = await ctx
          .runAction(internalApi.actions.polymarket.fetchClobLastPrice, {
            marketId: market.polymarketMarketId,
            tokenId: null,
          })
          .catch(() => null);

        // Extract YES price and spread from WebSocket data
        let priceYes: number | null = null;
        let spread: number | null = null;

        if (price && typeof price === "object") {
          // Use price field first, then bid as fallback
          if ("price" in price && typeof price.price === "number") {
            priceYes = price.price;
          } else if ("bid" in price && typeof price.bid === "number") {
            priceYes = price.bid;
          }
          
          // Use spread from WebSocket data if available
          if ("spread" in price && typeof price.spread === "number") {
            spread = price.spread;
          } else if ("ask" in price && "bid" in price && 
                     typeof price.ask === "number" && typeof price.bid === "number") {
            spread = price.ask - price.bid;
          }
        }

        marketsWithEvidence.push({
          ...mergedMarket,
          ...rankedMarket,
          evidence: {
            priceYes,
            spread,
            volume: mergedMarket.volume,
            liquidity: mergedMarket.liquidity,
            updatedAt: Date.now(),
          },
        });
      } catch (error) {
        console.error("Error fetching evidence:", error);
        marketsWithEvidence.push({
          ...market,
          ...rankedMarket,
          evidence: {
            priceYes: null,
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
      // If we still have no markets, return a helpful response instead of throwing
      console.warn(`[factCheck] No markets found after processing. Candidates: ${candidates.length}, Reranked: ${reranked.ranked.length}, WithEvidence: ${marketsWithEvidence.length}`);
      
      const result: FactCheckResult = {
        parsedClaim,
        answer: {
          summary: "No matching Polymarket markets found for this question. This could mean: (1) No markets exist on this topic yet, (2) The markets haven't been ingested yet, or (3) The question needs to be rephrased. Try asking about a specific event, date, or topic that might have prediction markets.",
          probYes: null,
          confidence: 0,
          ambiguity: "high" as const,
        },
        bestMarket: null,
        alternatives: [],
        debug: {
          scoringBreakdown: {
            candidatesFound: candidates.length,
            rerankedCount: reranked.ranked.length,
            marketsWithEvidence: marketsWithEvidence.length,
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

    // Step 5.5: Derive market sentiment (probability + momentum + confidence)
    const now = Date.now();
    const priceYesNow = bestMarket.evidence.priceYes;
    const snap1h = await ctx.runQuery(internalApi.queries.getMarketSentimentSnapshotBefore, {
      polymarketMarketId: bestMarket.polymarketMarketId,
      before: now - 60 * 60 * 1000,
    });
    const snap24h = await ctx.runQuery(internalApi.queries.getMarketSentimentSnapshotBefore, {
      polymarketMarketId: bestMarket.polymarketMarketId,
      before: now - 24 * 60 * 60 * 1000,
    });

    const delta1h =
      priceYesNow !== null && snap1h?.priceYes !== null && typeof snap1h?.priceYes === "number"
        ? priceYesNow - snap1h.priceYes
        : null;
    const delta24h =
      priceYesNow !== null && snap24h?.priceYes !== null && typeof snap24h?.priceYes === "number"
        ? priceYesNow - snap24h.priceYes
        : null;

    const momentumScore = delta1h !== null ? clamp01(0.5 + delta1h * 2) : 0.5;
    const sentimentConfidence = clamp01(0.55 * volumeScore + 0.25 * spreadScore + 0.20 * momentumScore);
    const sentimentLabel: "bullish" | "bearish" | "neutral" | "unknown" =
      priceYesNow === null
        ? "unknown"
        : priceYesNow > 0.55
        ? "bullish"
        : priceYesNow < 0.45
        ? "bearish"
        : "neutral";

    // Write a snapshot for future momentum calculations (only when we have a price)
    if (priceYesNow !== null) {
      try {
        await ctx.runMutation(internalApi.mutations.insertMarketSentimentSnapshot, {
          polymarketMarketId: bestMarket.polymarketMarketId,
          priceYes: priceYesNow,
          spread: bestMarket.evidence.spread,
          volume: bestMarket.evidence.volume,
          liquidity: bestMarket.evidence.liquidity,
        });
      } catch (e) {
        // Don't fail factCheck if snapshot insert fails
        console.warn("[factCheck] Failed to store market sentiment snapshot:", e);
      }
    }

    // More lenient confidence calculation - give more weight to match score
    // but accept lower scores as valid matches
    const confidence = clamp01(
      0.45 * matchScore +
        0.25 * volumeScore +
        0.15 * spreadScore +
        0.10 * momentumScore +
        0.05 * recencyScore
    );

    // Step 6: Generate comprehensive answer based on market data
    // Always try to provide an answer, even if match isn't perfect
    let answerSummary: string;
    let probYes: number | null = bestMarket.evidence.priceYes;

    // Always generate an answer, but adjust the approach based on match quality
    const hasGoodMatch = matchScore >= 0.35 && confidence >= 0.25;
    
    if (!hasGoodMatch) {
      // Even with poor matches, provide an answer using available data
      try {
        const topMarketsForAnalysis = marketsWithEvidence
          .filter(m => m.evidence.priceYes !== null)
          .slice(0, 3)
          .map(m => ({
            title: m.title,
            probability: m.evidence.priceYes !== null ? (m.evidence.priceYes * 100).toFixed(1) + "%" : "N/A",
            matchScore: (m.matchScore * 100).toFixed(0) + "%",
          }));

        const summaryResponse = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            },
            body: JSON.stringify({
              model: OPENROUTER_CHAT_MODEL,
              messages: [
                {
                  role: "system",
                  content: `You are an expert fact-checker that provides helpful answers even when markets don't perfectly match the question.

Your job is to:
1. Answer the question to the best of your ability using available market data
2. Explain what related markets indicate, even if they're not perfect matches
3. Be transparent about limitations but still provide useful insights
4. If markets are related but not exact, explain how they might be relevant

Output ONLY valid JSON:
{ 
  "summary": string,  // A helpful answer (2-4 sentences) that addresses the question using available data
  "interpretation": string  // What the available markets might indicate, even if imperfect
}

Rules:
- Always provide an answer, even if markets don't perfectly match
- Use the available market data to provide insights
- Be clear about limitations but don't just say "no match found"
- Explain how related markets might be relevant to the question
- Write in a helpful, conversational tone`,
                },
                {
                  role: "user",
                  content: `Question: ${args.question}

Parsed Claim: ${parsedClaim.claim}

Note: The available markets don't perfectly match this question, but here's what we found:

Best Available Market:
- Title: ${bestMarket.title}
- Description: ${bestMarket.description || "N/A"}
- Market Probability (YES): ${probYes !== null ? (probYes * 100).toFixed(1) + "%" : "not available"}
- Volume: ${bestMarket.evidence.volume !== null ? `$${bestMarket.evidence.volume.toLocaleString()}` : "not available"}
- Match Quality: ${(matchScore * 100).toFixed(0)}% (this is a ${matchScore < 0.5 ? "weak" : "moderate"} match)

${topMarketsForAnalysis.length > 1 ? `\nOther Related Markets:\n${topMarketsForAnalysis.slice(1).map((m, i) => `${i + 1}. ${m.title} - ${m.probability} probability (${m.matchScore} match)`).join("\n")}` : ""}

${newsArticles.length > 0 ? `\nRelevant News Articles:\n${newsArticles.slice(0, 5).map((article, i) => `${i + 1}. ${article.title} (${article.source}) - ${article.snippet || "No snippet available"}`).join("\n\n")}` : ""}

${tweets.length > 0 ? `\nRelevant Tweets:\n${tweets.slice(0, 5).map((tweet, i) => `${i + 1}. @${tweet.authorUsername}: "${tweet.text.substring(0, 200)}${tweet.text.length > 200 ? "..." : ""}" (${tweet.likeCount || 0} likes)`).join("\n\n")}` : ""}

${redditPosts.length > 0 ? `\nRelevant Reddit Posts:\n${redditPosts.slice(0, 5).map((post, i) => `${i + 1}. r/${post.subreddit} - "${post.title}" (${post.score} upvotes, ${post.numComments} comments)`).join("\n\n")}` : ""}

${tiktokVideos.length > 0 ? `\nRelevant TikTok Videos:\n${tiktokVideos.slice(0, 5).map((video, i) => `${i + 1}. @${video.authorUsername}: "${video.description.substring(0, 150)}${video.description.length > 150 ? "..." : ""}" (${video.likeCount || 0} likes, ${video.viewCount ? (video.viewCount / 1000).toFixed(0) + "K" : "N/A"} views)`).join("\n\n")}` : ""}

${instagramPosts.length > 0 ? `\nRelevant Instagram Posts:\n${instagramPosts.slice(0, 5).map((post, i) => `${i + 1}. @${post.authorUsername}: "${post.caption ? post.caption.substring(0, 150) + (post.caption.length > 150 ? "..." : "") : "No caption"}" (${post.likeCount || 0} likes)`).join("\n\n")}` : ""}

${kalshiMarkets.length > 0 ? `\nRelevant Kalshi Markets:\n${kalshiMarkets.slice(0, 5).map((market, i) => `${i + 1}. ${market.title} - ${market.lastPrice !== null ? (market.lastPrice * 100).toFixed(1) + "%" : "N/A"} probability`).join("\n\n")}` : ""}

Provide a helpful answer to the question using this market data, news context, social media sentiment from multiple platforms (Twitter, Reddit, TikTok, Instagram), and alternative prediction markets. Explain what these sources might indicate about the question, even though they're not perfect matches. Incorporate relevant information from all sources when available. Be transparent about the limitations but still provide useful insights.`,
                },
              ],
              response_format: { type: "json_object" },
              temperature: 0.6,
            }),
            signal: AbortSignal.timeout(45000),
          }
        );

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          const summaryContent = summaryData.choices[0].message.content;
          const summaryParsed = JSON.parse(summaryContent);
          
          const interpretation = summaryParsed.interpretation || "";
          answerSummary = summaryParsed.summary || "Unable to generate answer from available market data.";
          
          if (interpretation && interpretation !== answerSummary) {
            answerSummary = `${answerSummary}\n\n${interpretation}`;
          }
        } else {
          // Fallback: Provide answer using available data
          const probText = probYes !== null 
            ? `While there isn't a perfect market match for this specific question, the closest related market (${bestMarket.title}) indicates a ${(probYes * 100).toFixed(1)}% probability.`
            : `While there isn't a perfect market match for this specific question, we found a related market: ${bestMarket.title}.`;
          
          const matchNote = matchScore < 0.5 
            ? " Note: This market is only loosely related to your question, so the probability should be interpreted with significant caution."
            : " Note: This market is somewhat related but not a perfect match for your specific question.";
          
          answerSummary = `${probText}${matchNote}`;
        }
      } catch (error) {
        console.error("Error generating answer for weak match:", error);
        // Fallback answer
        const probText = probYes !== null 
          ? `While there isn't a perfect market match, the closest related market suggests a ${(probYes * 100).toFixed(1)}% probability. However, this market may not directly address your specific question.`
          : `We found a related market (${bestMarket.title}), but it doesn't directly address your question.`;
        
        answerSummary = probText;
      }
    } else {
      // Good match - provide comprehensive answer
      try {
        // Prepare market data for analysis
        const topMarketsForAnalysis = marketsWithEvidence
          .filter(m => m.evidence.priceYes !== null && m.matchScore >= 0.4)
          .slice(0, 5)
          .map(m => ({
            title: m.title,
            description: m.description,
            probability: m.evidence.priceYes !== null ? (m.evidence.priceYes * 100).toFixed(1) + "%" : "N/A",
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
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            },
            body: JSON.stringify({
              model: OPENROUTER_CHAT_MODEL,
              messages: [
                {
                  role: "system",
                  content: `You are an expert fact-checker that answers questions using prediction market data from Polymarket and relevant news articles.

**IMPORTANT: CURRENT DATE CONTEXT**
- Today's date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} (Year: ${new Date().getFullYear()})
- When referencing timelines or dates in your analysis, use the CURRENT year (${new Date().getFullYear()})
- Do NOT reference outdated dates like "2024" or "2025" unless specifically mentioned in the question or market data
- If a market or claim references a past date (e.g., "by end of 2024"), acknowledge it as a past/passed deadline, not a future one

Your job is to:
1. Answer the user's question directly based on the market data and news context
2. Explain what the markets indicate about the claim
3. Incorporate relevant news information when it adds context or credibility
4. Provide context about market confidence and volume
5. Note any limitations or uncertainties
6. Use current dates and timelines - it is ${new Date().getFullYear()}, not 2024 or earlier

Output ONLY valid JSON:
{ 
  "summary": string,  // A comprehensive answer (2-4 sentences) that directly addresses the question
  "interpretation": string  // What the market probability means in plain language
}

Rules:
- Answer the question directly, don't just describe the market
- Use ONLY the provided market data - do NOT invent numbers
- Use CURRENT dates (${new Date().getFullYear()}) when discussing timelines - never reference outdated years like 2024 unless explicitly in the source data
- If market data mentions past dates, acknowledge them as such (e.g., "This market referenced events in 2024, which has passed")
- Incorporate news articles when they provide relevant context or support the market data
- If multiple markets are provided, consider them all but prioritize the best match
- Explain what the probability means (e.g., "markets suggest X% chance" or "traders are Y% confident")
- Mention volume/liquidity to indicate market confidence
- Be clear about limitations (e.g., if match is not perfect, if data is limited)
- Write in a clear, conversational tone that directly answers the question`,
                },
                {
                  role: "user",
                  content: `**Current Date Context:** Today is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} (Year ${new Date().getFullYear()}). When referencing dates or timelines, use the current year (${new Date().getFullYear()}), not outdated years like 2024 or 2025 unless explicitly mentioned in the question or market data.

Question: ${args.question}

Parsed Claim: ${parsedClaim.claim}

Best Matching Market:
- Title: ${bestMarket.title}
- Description: ${bestMarket.description || "N/A"}
- Market Probability (YES): ${probYes !== null ? (probYes * 100).toFixed(1) + "%" : "not available"}
- Spread: ${bestMarket.evidence.spread !== null ? bestMarket.evidence.spread.toFixed(4) : "not available"}
- Volume: ${bestMarket.evidence.volume !== null ? `$${bestMarket.evidence.volume.toLocaleString()}` : "not available"}
- Liquidity: ${bestMarket.evidence.liquidity !== null ? `$${bestMarket.evidence.liquidity.toLocaleString()}` : "not available"}
- Match Quality: ${(matchScore * 100).toFixed(0)}% match
- Match Reasons: ${bestMarket.reasons?.join(", ") || "N/A"}

${topMarketsForAnalysis.length > 1 ? `\nOther Relevant Markets:\n${topMarketsForAnalysis.slice(1).map((m, i) => `${i + 1}. ${m.title} - ${m.probability} probability (${m.matchScore} match)`).join("\n")}` : ""}

${newsArticles.length > 0 ? `\nRelevant News Articles:\n${newsArticles.slice(0, 5).map((article, i) => `${i + 1}. ${article.title} (${article.source}) - ${article.snippet || "No snippet available"}`).join("\n\n")}` : ""}

${tweets.length > 0 ? `\nRelevant Tweets:\n${tweets.slice(0, 5).map((tweet, i) => `${i + 1}. @${tweet.authorUsername}: "${tweet.text.substring(0, 200)}${tweet.text.length > 200 ? "..." : ""}" (${tweet.likeCount || 0} likes)`).join("\n\n")}` : ""}

${redditPosts.length > 0 ? `\nRelevant Reddit Posts:\n${redditPosts.slice(0, 5).map((post, i) => `${i + 1}. r/${post.subreddit} - "${post.title}" (${post.score} upvotes, ${post.numComments} comments)`).join("\n\n")}` : ""}

${tiktokVideos.length > 0 ? `\nRelevant TikTok Videos:\n${tiktokVideos.slice(0, 5).map((video, i) => `${i + 1}. @${video.authorUsername}: "${video.description.substring(0, 150)}${video.description.length > 150 ? "..." : ""}" (${video.likeCount || 0} likes, ${video.viewCount ? (video.viewCount / 1000).toFixed(0) + "K" : "N/A"} views)`).join("\n\n")}` : ""}

${instagramPosts.length > 0 ? `\nRelevant Instagram Posts:\n${instagramPosts.slice(0, 5).map((post, i) => `${i + 1}. @${post.authorUsername}: "${post.caption ? post.caption.substring(0, 150) + (post.caption.length > 150 ? "..." : "") : "No caption"}" (${post.likeCount || 0} likes)`).join("\n\n")}` : ""}

${kalshiMarkets.length > 0 ? `\nRelevant Kalshi Markets:\n${kalshiMarkets.slice(0, 5).map((market, i) => `${i + 1}. ${market.title} - ${market.lastPrice !== null ? (market.lastPrice * 100).toFixed(1) + "%" : "N/A"} probability`).join("\n\n")}` : ""}

${googleTrends.length > 0 ? `\nGoogle Trends Data:\n${googleTrends.slice(0, 5).map((trend, i) => `${i + 1}. "${trend.keyword}" - Search Interest: ${trend.searchInterest}/100${trend.relatedQueries.length > 0 ? `, Related: ${trend.relatedQueries.slice(0, 3).join(", ")}` : ""}`).join("\n\n")}` : ""}

Based on this market data, news context, social media sentiment from multiple platforms (Twitter, Reddit, TikTok, Instagram), Google Trends search interest data, and alternative prediction markets, provide a direct answer to the question and explain what the markets indicate. Incorporate relevant information from all sources when it adds context.`,
                },
              ],
              response_format: { type: "json_object" },
              temperature: 0.5, // Slightly higher for more natural answers
            }),
            signal: AbortSignal.timeout(45000),
          }
        );

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          const summaryContent = summaryData.choices[0].message.content;
          const summaryParsed = JSON.parse(summaryContent);
          
          // Combine summary and interpretation into a comprehensive answer
          const interpretation = summaryParsed.interpretation || "";
          answerSummary = summaryParsed.summary || "Evidence available but answer generation failed.";
          
          // If we have an interpretation, append it for more context
          if (interpretation && interpretation !== answerSummary) {
            answerSummary = `${answerSummary}\n\n${interpretation}`;
          }
        } else {
          // Fallback: Generate a basic answer from the data
          const probText = probYes !== null 
            ? `Polymarket markets indicate a ${(probYes * 100).toFixed(1)}% probability that this claim is true.`
            : "Market probability data is not available.";
          
          const volumeText = bestMarket.evidence.volume 
            ? ` This market has $${bestMarket.evidence.volume.toLocaleString()} in trading volume, indicating ${bestMarket.evidence.volume > 1000000 ? "high" : bestMarket.evidence.volume > 100000 ? "moderate" : "limited"} market confidence.`
            : "";
          
          const matchText = matchScore < 0.7 
            ? " Note: The available market is not a perfect match for this specific claim, so the probability should be interpreted with caution."
            : "";
          
          answerSummary = `${probText}${volumeText}${matchText}`;
        }
      } catch (error) {
        console.error("Error generating answer:", error);
        // Fallback answer
        const probText = probYes !== null 
          ? `Based on Polymarket data, there is a ${(probYes * 100).toFixed(1)}% probability that this claim is true.`
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
            const price = await ctx
              .runAction(internalApi.actions.polymarket.fetchClobLastPrice, {
                marketId: market.polymarketMarketId,
                tokenId: null,
              })
              .catch(() => null);

            let priceYes: number | null = null;
            let spread: number | null = null;

            if (price && typeof price === "object") {
              if ("price" in price && typeof price.price === "number") {
                priceYes = price.price;
              } else if ("bid" in price && typeof price.bid === "number") {
                priceYes = price.bid;
              }
              
              if ("spread" in price && typeof price.spread === "number") {
                spread = price.spread;
              } else if ("ask" in price && "bid" in price && 
                         typeof price.ask === "number" && typeof price.bid === "number") {
                spread = price.ask - price.bid;
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
                priceYes,
                spread,
                volume: market.volume,
                liquidity: market.liquidity,
                updatedAt: Date.now(),
              },
            });
          } catch (error) {
            console.error(`Error fetching evidence for expiring market ${market.polymarketMarketId}:`, error);
            // Still add market without price data
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
                priceYes: null,
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

    // Append market sentiment context (purely market-derived)
    if (priceYesNow !== null) {
      const d1hText =
        delta1h !== null ? `${delta1h >= 0 ? "+" : ""}${(delta1h * 100).toFixed(1)}pp (1h)` : "N/A (1h)";
      const d24hText =
        delta24h !== null ? `${delta24h >= 0 ? "+" : ""}${(delta24h * 100).toFixed(1)}pp (24h)` : "N/A (24h)";
      answerSummary += `\n\nMarket sentiment: ${sentimentLabel.toUpperCase()} — ${d1hText}, ${d24hText}.`;
    }

    const result: FactCheckResult = {
      parsedClaim,
      answer: {
        summary: answerSummary,
        probYes,
        confidence,
        ambiguity: reranked.overallAmbiguity,
      },
      marketSentiment: {
        label: sentimentLabel,
        priceYes: priceYesNow,
        delta1h,
        delta24h,
        confidence: sentimentConfidence,
        drivers: { volumeScore, spreadScore, momentumScore },
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
      ...(googleTrends.length > 0 && { googleTrends }),
      ...(kalshiMarkets.length > 0 && { kalshiMarkets }),
      ...(targetDate && { targetDate }),
      ...(expiringMarkets.length > 0 && { expiringMarkets }),
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

    return result;
  },
});
