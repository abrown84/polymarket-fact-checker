"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { ParsedClaimSchema } from "../utils";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_CHAT_MODEL =
  process.env.OPENROUTER_CHAT_MODEL || "openai/gpt-4o-mini";

if (!OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY environment variable is required");
}

const RerankResultSchema = z.object({
  ranked: z.array(
    z.object({
      polymarketMarketId: z.string(),
      matchScore: z.number().min(0).max(1),
      reasons: z.array(z.string()),
      mismatchFlags: z.array(z.string()),
    })
  ),
  overallAmbiguity: z.enum(["low", "medium", "high"]),
});

export type RerankResult = z.infer<typeof RerankResultSchema>;

/**
 * Rerank candidates using AI to compare claim to market resolution meaning
 */
export const aiRerank = action({
  args: {
    parsedClaim: v.any(),
    candidates: v.array(
      v.object({
        polymarketMarketId: v.string(),
        title: v.string(),
        description: v.string(),
        endDate: v.union(v.number(), v.null()),
        url: v.union(v.string(), v.null()),
        outcomes: v.array(v.string()),
        volume: v.union(v.number(), v.null()),
        liquidity: v.union(v.number(), v.null()),
        similarity: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const parsedClaim = ParsedClaimSchema.parse(args.parsedClaim);

    if (args.candidates.length === 0) {
      return {
        ranked: [],
        overallAmbiguity: "high" as const,
      };
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
              content: `You are a market matcher that scores how well prediction markets match a claim.

Output ONLY valid JSON matching this schema:
{
  "ranked": [{
    "polymarketMarketId": string,
    "matchScore": number (0-1),  // 0 = no match, 1 = perfect match
    "reasons": string[],  // short bullet points explaining match/mismatch
    "mismatchFlags": string[]  // e.g., ["wrong_timeframe", "different_entity", "different_question"]
  }],
  "overallAmbiguity": "low" | "medium" | "high"
}

Rules:
- Compare the claim to each market's resolution meaning
- Be lenient: accept related markets even if not exact matches
- matchScore should reflect relevance (0.8+ = very relevant, 0.6-0.8 = related topic, 0.4-0.6 = somewhat related, <0.4 = weak match)
- Reward markets that address similar topics, entities, or concepts even if details differ
- Only flag major mismatches (completely different topic/entity)
- Do NOT invent market data; only use provided candidate fields
- If entities are completely different, flag "different_entity"
- If timeframes are very far off, flag "wrong_timeframe"
- If the question focus is completely different, flag "different_question"`,
            },
            {
              role: "user",
              content: `Claim: ${JSON.stringify(parsedClaim, null, 2)}

Candidates:
${JSON.stringify(
  args.candidates.map((c) => ({
    polymarketMarketId: c.polymarketMarketId,
    title: c.title,
    description: c.description,
    endDate: c.endDate ? new Date(c.endDate).toISOString() : null,
  })),
  null,
  2
)}`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.4, // Higher temperature for more flexible matching
        }),
        signal: AbortSignal.timeout(60000), // 60s timeout
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content);

      // Validate and return
      const validated = RerankResultSchema.parse(parsed);
      return validated;
    } catch (error) {
      console.error("OpenRouter rerank failed, using similarity fallback:", error);
      // Fallback: use similarity scores directly
      return {
        ranked: args.candidates.map((c) => ({
          polymarketMarketId: c.polymarketMarketId,
          matchScore: Math.max(0, Math.min(1, c.similarity * 1.2)), // Scale similarity to 0-1
          reasons: ["Based on embedding similarity"],
          mismatchFlags: [],
        })),
        overallAmbiguity: "medium" as const,
      };
    }
  },
});
