"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { ParsedClaimSchema } from "../utils";
import { gatewayChatJson } from "./oneGateway";

/**
 * Parse a question into a structured claim using One Gateway
 * Falls back to simple heuristics if the gateway call fails
 */
export const aiParseClaim = action({
  args: { question: v.string() },
  handler: async (_ctx, args) => {
    const question = args.question.trim();
    if (!question) {
      throw new Error("Question cannot be empty");
    }

    try {
      const parsed = await gatewayChatJson({
        temperature: 0.3,
        system: `You are a claim parser that converts questions into structured, checkable claims for prediction markets.

Output ONLY valid JSON matching this schema:
{
  "claim": string,  // normalized yes/no claim (e.g., "The Fed will cut rates by March 2026")
  "type": "past_event" | "future_event" | "ongoing" | "numeric",
  "time_window": { "start": string|null (ISO date), "end": string|null (ISO date) },
  "entities": [{ "name": string, "type": string }],
  "must_include": string[],  // keywords that must appear in matching markets
  "must_exclude": string[],  // keywords that should not appear
  "ambiguities": string[]    // list any ambiguities in the question
}

Rules:
- Convert questions to clear yes/no claims
- Extract time windows if present
- Identify key entities (people, organizations, events)
- If ambiguous, still produce best-effort claim but list ambiguities
- must_include should contain essential terms
- must_exclude should contain clearly wrong terms`,
        user: question,
      });

      const validated = ParsedClaimSchema.parse(parsed);
      return validated;
    } catch (error) {
      console.error("One Gateway parseClaim failed, using fallback:", error);
      return fallbackParseClaim(question);
    }
  },
});

/**
 * Simple fallback parser using heuristics
 */
function fallbackParseClaim(question: string): z.infer<typeof ParsedClaimSchema> {
  const lower = question.toLowerCase();
  const hasFuture = /will|going to|by \d{4}|in \d{4}/.test(lower);
  const hasPast = /did|was|were|happened/.test(lower);
  const hasNumeric = /\d+/.test(question);

  // Extract year if present
  const yearMatch = question.match(/\b(20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : null;

  // Simple entity extraction (capitalized words)
  const entityMatches = question.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
  const entities = (entityMatches || [])
    .filter((e) => !["Will", "The", "This", "That"].includes(e))
    .slice(0, 5)
    .map((name) => ({ name, type: "unknown" }));

  // Extract keywords
  const words = question
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3 && !["will", "this", "that", "what", "when", "where"].includes(w));

  return {
    claim: question,
    type: hasFuture ? "future_event" : hasPast ? "past_event" : hasNumeric ? "numeric" : "ongoing",
    time_window: {
      start: null,
      end: year ? `${year}-12-31T23:59:59Z` : null,
    },
    entities,
    must_include: words.slice(0, 5),
    must_exclude: [],
    ambiguities: ["Used fallback parser - may be less accurate"],
  };
}
