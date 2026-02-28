"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";

const CRYPTO_NEWS_BASE = process.env.CRYPTO_NEWS_BASE || "https://cryptocurrency.cv";

interface FearGreed {
  value: number | null;
  label: string | null;
}

interface TrendingTopic {
  topic: string;
  count: number | null;
  sentiment: string | null;
}

interface CryptoNewsContext {
  fearGreed: FearGreed | null;
  trending: TrendingTopic[];
}

async function getJson(path: string) {
  const res = await fetch(`${CRYPTO_NEWS_BASE}${path}`, {
    headers: { "User-Agent": "PolymarketFactChecker/2.0" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return null;
  return await res.json();
}

export const retrieveCryptoNewsContext = action({
  args: {
    hours: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (_ctx, args): Promise<CryptoNewsContext> => {
    const hours = Math.max(1, Math.min(168, args.hours ?? 24));
    const limit = Math.max(1, Math.min(25, args.limit ?? 10));

    const [fearGreedRaw, trendingRaw] = await Promise.all([
      getJson("/api/fear-greed"),
      getJson(`/api/trending?hours=${hours}&limit=${limit}`),
    ]);

    let fearGreed: FearGreed | null = null;
    if (fearGreedRaw) {
      const current = fearGreedRaw.current ?? (Array.isArray(fearGreedRaw) ? fearGreedRaw[0] : fearGreedRaw);
      fearGreed = {
        value: current?.value != null ? Number(current.value) : null,
        label: current?.valueClassification ?? current?.value_classification ?? null,
      };
    }

    const trendingRows =
      (trendingRaw?.trending as any[]) ??
      (trendingRaw?.topics as any[]) ??
      (trendingRaw?.articles as any[]) ??
      (Array.isArray(trendingRaw) ? trendingRaw : []);

    const trending: TrendingTopic[] = trendingRows.slice(0, limit).map((t: any) => ({
      topic: t.topic ?? t.title ?? t.keyword ?? "unknown",
      count: t.count != null ? Number(t.count) : null,
      sentiment: t.sentiment ?? null,
    }));

    return { fearGreed, trending };
  },
});
