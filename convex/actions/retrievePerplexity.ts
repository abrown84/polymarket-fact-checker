"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import type { ParsedClaim } from "../utils";

interface PerplexityCitation {
  url?: string;
  title?: string;
  date?: string;
}

function getOpenRouterApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY environment variable is required");
  return key;
}

export const retrievePerplexity = action({
  args: {
    parsedClaim: v.any(),
    limit: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const enabled = process.env.ENABLE_PERPLEXITY_RETRIEVAL === "true";
    if (!enabled) return [];

    const parsed = args.parsedClaim as ParsedClaim;
    const model = process.env.OPENROUTER_PERPLEXITY_MODEL || "perplexity/sonar-pro";
    const limit = Math.max(3, Math.min(args.limit ?? 8, 12));

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getOpenRouterApiKey()}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "Return current, citable web evidence for the claim. Output STRICT JSON: {\"items\":[{\"title\":string,\"url\":string,\"source\":string,\"snippet\":string,\"publishedAt\":number|null,\"relevanceScore\":number|null}]}",
          },
          {
            role: "user",
            content: `Claim: ${parsed.claim}\nQuestion: ${parsed.claim}\nLimit: ${limit}`,
          },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Perplexity retrieval failed (${res.status}): ${text.slice(0, 300)}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsedOut = typeof content === "string" ? JSON.parse(content) : content;
    const items = Array.isArray(parsedOut?.items) ? parsedOut.items : [];

    return items
      .filter((i: any) => i?.url || i?.title)
      .slice(0, limit)
      .map((i: any, idx: number) => ({
        title: String(i.title ?? `Perplexity result ${idx + 1}`),
        url: String(i.url ?? ""),
        source: String(i.source ?? "Perplexity"),
        publishedAt: typeof i.publishedAt === "number" ? i.publishedAt : null,
        snippet: i.snippet ? String(i.snippet) : null,
        relevanceScore:
          typeof i.relevanceScore === "number"
            ? Math.max(0, Math.min(1, i.relevanceScore))
            : null,
      }));
  },
});
