"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { clamp01, ParsedClaim } from "../utils";

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
  };
  mutations: {
    setCache: any;
    upsertMarket: any;
    upsertEmbedding: any;
    logQuery: any;
  };
  actions: {
    aiEmbed: { embedText: any };
    aiParseClaim: { aiParseClaim: any };
    aiRerank: { aiRerank: any };
    polymarket: { fetchGammaMarkets: any; fetchClobBook: any; fetchClobLastPrice: any };
    retrieveCandidates: { retrieveCandidates: any };
    ingestMarkets: { ingestMarkets: any };
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

    // Step 4: Fetch evidence for top 15 (more markets for better coverage)
    const topMarkets: RankedMarket[] = reranked.ranked.slice(0, 15);
    const marketsWithEvidence: MarketWithEvidence[] = [];

    for (const rankedMarket of topMarkets) {
      const market = candidates.find(
        (c: MarketCandidate) => c.polymarketMarketId === rankedMarket.polymarketMarketId
      );
      if (!market) continue;

      try {
        // Fetch book and price
        const [book, price]: [any, any] = await Promise.all([
          ctx
            .runAction(internalApi.actions.polymarket.fetchClobBook, {
              marketId: market.polymarketMarketId,
              tokenId: null,
            })
            .catch(() => null),
          ctx
            .runAction(internalApi.actions.polymarket.fetchClobLastPrice, {
              marketId: market.polymarketMarketId,
              tokenId: null,
            })
            .catch(() => null),
        ]);

        // Extract YES price (simplified - assumes binary market)
        let priceYes: number | null = null;
        let spread: number | null = null;

        if (price && typeof price === "object" && "price" in price) {
          priceYes = typeof price.price === "number" ? price.price : null;
        } else if (book && typeof book === "object") {
          // Try to extract from order book
          if ("bids" in book && Array.isArray(book.bids) && book.bids.length > 0) {
            const bestBid = book.bids[0];
            if (bestBid && typeof bestBid === "object" && "price" in bestBid) {
              priceYes = typeof bestBid.price === "number" ? bestBid.price : null;
            }
          }
          if ("asks" in book && Array.isArray(book.asks) && book.asks.length > 0) {
            const bestAsk = book.asks[0];
            if (bestAsk && typeof bestAsk === "object" && "price" in bestAsk) {
              const askPrice =
                typeof bestAsk.price === "number" ? bestAsk.price : null;
              if (priceYes !== null && askPrice !== null) {
                spread = askPrice - priceYes;
              }
            }
          }
        }

        marketsWithEvidence.push({
          ...market,
          ...rankedMarket,
          evidence: {
            priceYes,
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
      throw new Error("No markets found after reranking");
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
              "HTTP-Referer": "https://polymarket-fact-checker.vercel.app",
              "X-Title": "Polymarket Fact Checker",
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

Provide a helpful answer to the question using this market data. Explain what these markets might indicate about the question, even though they're not perfect matches. Be transparent about the limitations but still provide useful insights.`,
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
              "HTTP-Referer": "https://polymarket-fact-checker.vercel.app",
              "X-Title": "Polymarket Fact Checker",
            },
            body: JSON.stringify({
              model: OPENROUTER_CHAT_MODEL,
              messages: [
                {
                  role: "system",
                  content: `You are an expert fact-checker that answers questions using prediction market data from Polymarket.

Your job is to:
1. Answer the user's question directly based on the market data
2. Explain what the markets indicate about the claim
3. Provide context about market confidence and volume
4. Note any limitations or uncertainties

Output ONLY valid JSON:
{ 
  "summary": string,  // A comprehensive answer (2-4 sentences) that directly addresses the question
  "interpretation": string  // What the market probability means in plain language
}

Rules:
- Answer the question directly, don't just describe the market
- Use ONLY the provided market data - do NOT invent numbers
- If multiple markets are provided, consider them all but prioritize the best match
- Explain what the probability means (e.g., "markets suggest X% chance" or "traders are Y% confident")
- Mention volume/liquidity to indicate market confidence
- Be clear about limitations (e.g., if match is not perfect, if data is limited)
- Write in a clear, conversational tone that directly answers the question`,
                },
                {
                  role: "user",
                  content: `Question: ${args.question}

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

Based on this market data, provide a direct answer to the question and explain what the markets indicate.`,
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

    const result: FactCheckResult = {
      parsedClaim,
      answer: {
        summary: answerSummary,
        probYes,
        confidence,
        ambiguity: reranked.overallAmbiguity,
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
