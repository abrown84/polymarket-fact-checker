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

/**
 * Parse a question into a structured claim using OpenAI
 * Falls back to simple heuristics if OpenAI fails
 */
export const aiParseClaim = action({
  args: { question: v.string() },
  handler: async (ctx, args) => {
    const question = args.question.trim();
    if (!question) {
      throw new Error("Question cannot be empty");
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
              content: `You are a claim parser that converts questions into structured, checkable claims for prediction markets.

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
            },
            {
              role: "user",
              content: question,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content);

      // Validate with zod
      const validated = ParsedClaimSchema.parse(parsed);
      return validated;
    } catch (error) {
      console.error("OpenRouter parseClaim failed, using fallback:", error);
      // Fallback parser
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
