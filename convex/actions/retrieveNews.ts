"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { hashString, ParsedClaim } from "../utils";

const CRYPTO_NEWS_BASE = process.env.CRYPTO_NEWS_BASE || "https://cryptocurrency.cv";

// Type-safe internal API references
const internalApi = internal as {
  queries: {
    getCache: any;
  };
  mutations: {
    setCache: any;
    upsertNewsArticle: any;
  };
  actions: {
    aiEmbed: { embedText: any };
  };
};

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: number;
  snippet: string | null;
  relevanceScore: number | null;
}

interface CryptoNewsApiArticle {
  title?: string;
  link?: string;
  source?: string;
  timeAgo?: string;
  pubDate?: string;
  description?: string;
  summary?: string;
}

function stripCdata(s: string) {
  return s.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
}

function parsePublishedAt(article: CryptoNewsApiArticle): number {
  if (article.pubDate) {
    const t = Date.parse(article.pubDate);
    if (!Number.isNaN(t)) return t;
  }
  return Date.now();
}

function normalizeArticle(a: CryptoNewsApiArticle): NewsArticle | null {
  const title = (a.title || "").trim();
  const rawLink = (a.link || "").trim();
  if (!title || !rawLink) return null;

  return {
    title,
    url: stripCdata(rawLink),
    source: (a.source || "crypto-news").trim(),
    publishedAt: parsePublishedAt(a),
    snippet: (a.summary || a.description || null),
    relevanceScore: null,
  };
}

async function fetchCryptoNewsEndpoint(path: string): Promise<NewsArticle[]> {
  try {
    const url = `${CRYPTO_NEWS_BASE}${path}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "PolymarketFactChecker/2.0" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const rawArticles = (data?.articles || []) as CryptoNewsApiArticle[];
    return rawArticles.map(normalizeArticle).filter((x): x is NewsArticle => x !== null);
  } catch (err) {
    console.error("[retrieveNews] crypto-news endpoint error:", path, err);
    return [];
  }
}

function dedupeByUrl(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  const out: NewsArticle[] = [];
  for (const a of articles) {
    if (seen.has(a.url)) continue;
    seen.add(a.url);
    out.push(a);
  }
  return out;
}

async function scoreRelevance(
  articles: NewsArticle[],
  queryEmbedding: number[],
  embedAction: (args: { text: string }) => Promise<number[]>
): Promise<NewsArticle[]> {
  const scoredArticles: NewsArticle[] = [];

  for (const article of articles) {
    try {
      const articleText = [article.title, article.snippet].filter(Boolean).join(" ");
      const articleEmbedding = await embedAction({ text: articleText });

      let similarity = 0;
      if (
        articleEmbedding &&
        Array.isArray(articleEmbedding) &&
        articleEmbedding.length === queryEmbedding.length
      ) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < queryEmbedding.length; i++) {
          dotProduct += queryEmbedding[i] * articleEmbedding[i];
          normA += queryEmbedding[i] * queryEmbedding[i];
          normB += articleEmbedding[i] * articleEmbedding[i];
        }
        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        similarity = denominator > 0 ? dotProduct / denominator : 0;
      }

      scoredArticles.push({ ...article, relevanceScore: similarity });
    } catch (error) {
      console.error(`[retrieveNews] Error scoring article ${article.title}:`, error);
      scoredArticles.push(article);
    }
  }

  return scoredArticles;
}

/**
 * Retrieve crypto-first news relevant to a parsed claim.
 * Primary source: cryptocurrency.cv skill-compatible endpoints.
 */
export const retrieveNews = action({
  args: {
    parsedClaim: v.any(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<NewsArticle[]> => {
    const parsedClaim = args.parsedClaim as ParsedClaim;
    const limit = args.limit || 15;

    const queryText = [
      parsedClaim.claim,
      ...parsedClaim.must_include,
      ...parsedClaim.entities.map((e) => e.name),
    ]
      .filter(Boolean)
      .join(" ");

    const queryHash = hashString(queryText);
    const cached = await ctx.runQuery(internalApi.queries.getCache, {
      key: `news:${queryHash}`,
    });

    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[retrieveNews] Returning cached crypto news for query hash ${queryHash}`);
      return cached.value as NewsArticle[];
    }

    const queryEmbedding: number[] = await ctx.runAction(
      internalApi.actions.aiEmbed.embedText,
      { text: queryText }
    );

    // Crypto-first endpoints
    const endpointCalls: Promise<NewsArticle[]>[] = [
      fetchCryptoNewsEndpoint(`/api/news?limit=${Math.max(limit, 20)}`),
      fetchCryptoNewsEndpoint(`/api/breaking?limit=${Math.max(limit, 20)}`),
      fetchCryptoNewsEndpoint(`/api/search?q=${encodeURIComponent(queryText)}&limit=${Math.max(limit, 20)}`),
    ];

    const lower = queryText.toLowerCase();
    if (lower.includes("bitcoin") || lower.includes("btc")) {
      endpointCalls.push(fetchCryptoNewsEndpoint(`/api/bitcoin?limit=${Math.max(limit, 20)}`));
    }
    if (lower.includes("defi") || lower.includes("dex") || lower.includes("yield")) {
      endpointCalls.push(fetchCryptoNewsEndpoint(`/api/defi?limit=${Math.max(limit, 20)}`));
    }

    const batches = await Promise.all(endpointCalls);
    const merged = dedupeByUrl(batches.flat());

    const scored = await scoreRelevance(
      merged,
      queryEmbedding,
      (embedArgs) => ctx.runAction(internalApi.actions.aiEmbed.embedText, embedArgs)
    );

    scored.sort((a, b) => {
      const recencyBoostA = Date.now() - a.publishedAt < 24 * 60 * 60 * 1000 ? 0.2 : 0;
      const recencyBoostB = Date.now() - b.publishedAt < 24 * 60 * 60 * 1000 ? 0.2 : 0;
      const scoreA = (a.relevanceScore || 0) + recencyBoostA;
      const scoreB = (b.relevanceScore || 0) + recencyBoostB;
      return scoreB - scoreA;
    });

    const topArticles = scored.slice(0, limit);

    const now = Date.now();
    await ctx.runMutation(internalApi.mutations.setCache, {
      key: `news:${queryHash}`,
      value: topArticles,
      expiresAt: now + 30 * 60 * 1000, // 30m TTL for fresher crypto news
      updatedAt: now,
    });

    for (const article of topArticles) {
      await ctx.runMutation(internalApi.mutations.upsertNewsArticle, {
        title: article.title,
        url: article.url,
        source: article.source,
        publishedAt: article.publishedAt,
        snippet: article.snippet,
        relevanceScore: article.relevanceScore,
        queryHash,
      });
    }

    console.log(`[retrieveNews] Retrieved ${topArticles.length} crypto-first news articles`);
    return topArticles;
  },
});
