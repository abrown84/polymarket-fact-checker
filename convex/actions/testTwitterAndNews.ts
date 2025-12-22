"use node";

/**
 * Test Twitter and NewsAPI connections specifically
 * Run with: npx convex run actions/testTwitterAndNews:testTwitterAndNews
 */

import { action } from "../_generated/server";

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const NEWS_API_KEY = process.env.NEWS_API_KEY;

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  details?: any;
  duration?: number;
  configured: boolean;
}

/**
 * Test Twitter API
 */
async function testTwitterAPI(): Promise<TestResult> {
  const startTime = Date.now();
  const configured = !!TWITTER_BEARER_TOKEN;

  if (!TWITTER_BEARER_TOKEN) {
    return {
      name: "Twitter API",
      success: false,
      error: "TWITTER_BEARER_TOKEN not configured",
      duration: Date.now() - startTime,
      configured: false,
      details: { configured: false },
    };
  }

  try {
    // Test with a simple search query
    const url = "https://api.twitter.com/2/tweets/search/recent?query=test&max_results=5&tweet.fields=created_at,public_metrics,author_id&expansions=author_id&user.fields=username,name";
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${TWITTER_BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage += `: ${errorData.detail || errorData.title || errorText.substring(0, 200)}`;
      } catch {
        errorMessage += `: ${errorText.substring(0, 200)}`;
      }
      
      return {
        name: "Twitter API",
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
        configured: true,
        details: {
          status: response.status,
          statusText: response.statusText,
        },
      };
    }

    const data = await response.json();
    const hasData = !!data.data && Array.isArray(data.data);
    const tweetCount = hasData ? data.data.length : 0;
    
    return {
      name: "Twitter API",
      success: true,
      configured: true,
      details: {
        hasData,
        tweetCount,
        hasUsers: !!data.includes?.users,
        sampleTweet: hasData && data.data.length > 0 ? {
          id: data.data[0].id,
          text: data.data[0].text?.substring(0, 100),
        } : null,
      },
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      name: "Twitter API",
      success: false,
      error: error.message || String(error),
      duration: Date.now() - startTime,
      configured: true,
    };
  }
}

/**
 * Test NewsAPI
 */
async function testNewsAPI(): Promise<TestResult> {
  const startTime = Date.now();
  const configured = !!NEWS_API_KEY;

  if (!NEWS_API_KEY) {
    return {
      name: "NewsAPI",
      success: false,
      error: "NEWS_API_KEY not configured",
      duration: Date.now() - startTime,
      configured: false,
      details: { configured: false },
    };
  }

  try {
    // Test with a simple search query
    const url = `https://newsapi.org/v2/everything?q=test&pageSize=5&language=en&apiKey=${NEWS_API_KEY}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage += `: ${errorData.message || errorData.code || errorText.substring(0, 200)}`;
      } catch {
        errorMessage += `: ${errorText.substring(0, 200)}`;
      }
      
      return {
        name: "NewsAPI",
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
        configured: true,
        details: {
          status: response.status,
          statusText: response.statusText,
        },
      };
    }

    const data = await response.json();
    const hasArticles = !!data.articles && Array.isArray(data.articles);
    const articleCount = hasArticles ? data.articles.length : 0;
    
    return {
      name: "NewsAPI",
      success: true,
      configured: true,
      details: {
        hasArticles,
        articleCount,
        totalResults: data.totalResults || 0,
        status: data.status,
        sampleArticle: hasArticles && data.articles.length > 0 ? {
          title: data.articles[0].title?.substring(0, 100),
          source: data.articles[0].source?.name,
          url: data.articles[0].url,
        } : null,
      },
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      name: "NewsAPI",
      success: false,
      error: error.message || String(error),
      duration: Date.now() - startTime,
      configured: true,
    };
  }
}

/**
 * Main test action
 */
export const testTwitterAndNews = action({
  args: {},
  handler: async (ctx) => {
    console.log("Testing Twitter and NewsAPI connections...\n");

    const results: TestResult[] = [];

    // Test Twitter API
    console.log("Testing Twitter API...");
    const twitterResult = await testTwitterAPI();
    results.push(twitterResult);
    console.log(`${twitterResult.success ? "✓" : "✗"} ${twitterResult.name}: ${twitterResult.configured ? (twitterResult.success ? "SUCCESS" : twitterResult.error) : "NOT CONFIGURED"}`);

    // Test NewsAPI
    console.log("\nTesting NewsAPI...");
    const newsResult = await testNewsAPI();
    results.push(newsResult);
    console.log(`${newsResult.success ? "✓" : "✗"} ${newsResult.name}: ${newsResult.configured ? (newsResult.success ? "SUCCESS" : newsResult.error) : "NOT CONFIGURED"}`);

    // Summary
    const successCount = results.filter((r) => r.success).length;
    const configuredCount = results.filter((r) => r.configured).length;
    const totalCount = results.length;

    console.log("\n" + "=".repeat(60));
    console.log(`SUMMARY: ${successCount}/${totalCount} tests passed`);
    console.log(`CONFIGURED: ${configuredCount}/${totalCount} APIs have credentials`);
    console.log("=".repeat(60));

    results.forEach((result) => {
      const status = result.success ? "✓ PASS" : result.configured ? "✗ FAIL" : "⚠ NOT CONFIGURED";
      const duration = result.duration ? ` (${result.duration}ms)` : "";
      console.log(`${status} - ${result.name}${duration}`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      if (result.details) {
        console.log(`  Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    });

    return {
      success: results.every((r) => r.success || !r.configured),
      results,
      summary: {
        total: totalCount,
        passed: successCount,
        failed: totalCount - successCount,
        configured: configuredCount,
        notConfigured: totalCount - configuredCount,
      },
    };
  },
});



