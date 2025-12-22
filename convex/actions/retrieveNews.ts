"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { hashString, ParsedClaim } from "../utils";

// Type-safe internal API references
const internalApi = internal as {
  queries: {
    getCache: any;
    getNewsByQueryHash: any;
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

// Major news sources with RSS feeds
const NEWS_SOURCES = [
  {
    name: "Reuters",
    rssFeeds: [
      "https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best",
      "https://www.reuters.com/tools/rss",
    ],
    apiUrl: null,
  },
  {
    name: "AP News",
    rssFeeds: [
      "https://apnews.com/apf-topnews",
      "https://apnews.com/apf-usnews",
    ],
    apiUrl: null,
  },
  {
    name: "BBC News",
    rssFeeds: [
      "http://feeds.bbci.co.uk/news/rss.xml",
      "http://feeds.bbci.co.uk/news/world/rss.xml",
    ],
    apiUrl: null,
  },
  {
    name: "The Guardian",
    rssFeeds: [
      "https://www.theguardian.com/world/rss",
      "https://www.theguardian.com/us-news/rss",
    ],
    apiUrl: null,
  },
  {
    name: "CNN",
    rssFeeds: [
      "http://rss.cnn.com/rss/edition.rss",
      "http://rss.cnn.com/rss/edition_us.rss",
    ],
    apiUrl: null,
  },
  {
    name: "NPR",
    rssFeeds: [
      "https://feeds.npr.org/1001/rss.xml",
      "https://feeds.npr.org/1004/rss.xml",
    ],
    apiUrl: null,
  },
  {
    name: "Politico",
    rssFeeds: [
      "https://www.politico.com/rss/politicopicks.xml",
    ],
    apiUrl: null,
  },
  {
    name: "Axios",
    rssFeeds: [
      "https://api.axios.com/feed/",
    ],
    apiUrl: null,
  },
];

/**
 * Parse RSS feed XML
 */
async function parseRSSFeed(feedUrl: string): Promise<NewsArticle[]> {
  try {
    const response = await fetch(feedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PolymarketFactChecker/1.0)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`[retrieveNews] Failed to fetch RSS feed ${feedUrl}: ${response.status}`);
      return [];
    }

    const xmlText = await response.text();
    const articles: NewsArticle[] = [];

    // Simple RSS parsing (for production, consider using a proper RSS parser library)
    // Extract items from RSS XML
    const itemMatches = xmlText.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi);
    
    for (const match of itemMatches) {
      const itemContent = match[1];
      
      // Extract title
      const titleMatch = itemContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : null;
      
      // Extract link
      const linkMatch = itemContent.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
      const url = linkMatch ? linkMatch[1].replace(/<[^>]+>/g, "").trim() : null;
      
      // Extract description/snippet
      const descMatch = itemContent.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
      const snippet = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim().substring(0, 300) : null;
      
      // Extract pubDate
      const pubDateMatch = itemContent.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
      let publishedAt = Date.now();
      if (pubDateMatch) {
        const dateStr = pubDateMatch[1].replace(/<[^>]+>/g, "").trim();
        const parsed = Date.parse(dateStr);
        if (!isNaN(parsed)) {
          publishedAt = parsed;
        }
      }

      if (title && url) {
        articles.push({
          title,
          url,
          source: feedUrl,
          publishedAt,
          snippet,
          relevanceScore: null,
        });
      }
    }

    return articles;
  } catch (error) {
    console.error(`[retrieveNews] Error parsing RSS feed ${feedUrl}:`, error);
    return [];
  }
}

/**
 * Search news using NewsAPI (if API key is available)
 */
async function searchNewsAPI(query: string, limit: number = 20): Promise<NewsArticle[]> {
  const NEWS_API_KEY = process.env.NEWS_API_KEY;
  if (!NEWS_API_KEY) {
    console.log("[retrieveNews] NEWS_API_KEY not set, skipping NewsAPI");
    return [];
  }

  try {
    // Build search query from claim keywords
    const searchQuery = query.split(" ").slice(0, 5).join(" ");
    
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(searchQuery)}&sortBy=relevancy&pageSize=${limit}&language=en`,
      {
        headers: {
          "X-API-Key": NEWS_API_KEY,
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      console.warn(`[retrieveNews] NewsAPI error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (!data.articles || !Array.isArray(data.articles)) {
      return [];
    }

    return data.articles
      .filter((article: any) => article.title && article.url)
      .map((article: any) => ({
        title: article.title,
        url: article.url,
        source: article.source?.name || "NewsAPI",
        publishedAt: article.publishedAt ? Date.parse(article.publishedAt) : Date.now(),
        snippet: article.description || article.content?.substring(0, 300) || null,
        relevanceScore: null,
      }));
  } catch (error) {
    console.error("[retrieveNews] NewsAPI error:", error);
    return [];
  }
}

/**
 * Score article relevance using embeddings
 */
async function scoreRelevance(
  articles: NewsArticle[],
  queryEmbedding: number[],
  embedAction: any
): Promise<NewsArticle[]> {
  const scoredArticles: NewsArticle[] = [];

  for (const article of articles) {
    try {
      // Create text for embedding (title + snippet)
      const articleText = [article.title, article.snippet].filter(Boolean).join(" ");
      
      // Embed article text
      const articleEmbedding = await embedAction({ text: articleText });
      
      // Compute cosine similarity
      let similarity = 0;
      if (articleEmbedding && Array.isArray(articleEmbedding) && articleEmbedding.length === queryEmbedding.length) {
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

      scoredArticles.push({
        ...article,
        relevanceScore: similarity,
      });
    } catch (error) {
      console.error(`[retrieveNews] Error scoring article ${article.title}:`, error);
      scoredArticles.push(article);
    }
  }

  return scoredArticles;
}

/**
 * Retrieve news articles relevant to a parsed claim
 */
export const retrieveNews = action({
  args: {
    parsedClaim: v.any(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<NewsArticle[]> => {
    const parsedClaim = args.parsedClaim as ParsedClaim;
    const limit = args.limit || 15;

    // Build query text from parsed claim
    const queryText = [
      parsedClaim.claim,
      ...parsedClaim.must_include,
      ...parsedClaim.entities.map((e) => e.name),
    ]
      .filter(Boolean)
      .join(" ");

    // Check cache first
    const queryHash = hashString(queryText);
    const cached = await ctx.runQuery(internalApi.queries.getCache, {
      key: `news:${queryHash}`,
    });

    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[retrieveNews] Returning cached news for query hash ${queryHash}`);
      return cached.value as NewsArticle[];
    }

    // Embed query for relevance scoring
    const queryEmbedding: number[] = await ctx.runAction(internalApi.actions.aiEmbed.embedText, {
      text: queryText,
    });

    const allArticles: NewsArticle[] = [];

    // Fetch from RSS feeds (limited to avoid rate limits)
    const rssSources = NEWS_SOURCES.slice(0, 5); // Limit to 5 sources for performance
    for (const source of rssSources) {
      for (const feedUrl of source.rssFeeds.slice(0, 1)) {
        // Only fetch first feed per source
        try {
          const articles = await parseRSSFeed(feedUrl);
          articles.forEach((article) => {
            allArticles.push({
              ...article,
              source: source.name,
            });
          });
        } catch (error) {
          console.error(`[retrieveNews] Error fetching from ${source.name}:`, error);
        }
      }
    }

    // Fetch from NewsAPI
    const newsApiArticles = await searchNewsAPI(queryText, 10);
    allArticles.push(...newsApiArticles);

    // Score relevance
    const scoredArticles = await scoreRelevance(
      allArticles,
      queryEmbedding,
      (args: { text: string }) => ctx.runAction(internalApi.actions.aiEmbed.embedText, args)
    );

    // Sort by relevance and recency
    scoredArticles.sort((a, b) => {
      const scoreA = (a.relevanceScore || 0) * 0.7 + (Date.now() - a.publishedAt < 7 * 24 * 60 * 60 * 1000 ? 0.3 : 0);
      const scoreB = (b.relevanceScore || 0) * 0.7 + (Date.now() - b.publishedAt < 7 * 24 * 60 * 60 * 1000 ? 0.3 : 0);
      return scoreB - scoreA;
    });

    // Take top N articles
    const topArticles = scoredArticles.slice(0, limit);

    // Store in cache (1 hour TTL)
    const now = Date.now();
    await ctx.runMutation(internalApi.mutations.setCache, {
      key: `news:${queryHash}`,
      value: topArticles,
      expiresAt: now + 60 * 60 * 1000,
      updatedAt: now,
    });

    // Store articles in database for future reference
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

    console.log(`[retrieveNews] Retrieved ${topArticles.length} news articles for query`);
    return topArticles;
  },
});

