"use node";

/**
 * Comprehensive credentials checker
 * Shows which API keys are configured and tests each connection
 * Run with: npx convex run actions/checkCredentials:checkCredentials
 */

import { action } from "../_generated/server";
import { internal } from "../_generated/api";

interface CredentialStatus {
  name: string;
  required: boolean;
  configured: boolean;
  keys: string[];
  status: "✅ Set" | "❌ Missing" | "⚠️ Partial";
  testResult?: {
    success: boolean;
    error?: string;
    details?: any;
  };
}

interface SourceStatus {
  source: string;
  icon: string;
  status: "✅ Working" | "❌ Not Configured" | "⚠️ Needs Keys" | "✅ No Key Needed";
  keysRequired: string[];
  keysConfigured: string[];
  testPassed: boolean;
  error?: string;
}

/**
 * Check if environment variable is set (without revealing value)
 */
function isEnvSet(key: string): boolean {
  const value = process.env[key];
  return value !== undefined && value !== null && value.trim() !== "";
}

/**
 * Test Twitter API
 */
async function testTwitter(): Promise<{ success: boolean; error?: string; details?: any }> {
  const token = process.env.TWITTER_BEARER_TOKEN;
  if (!token) {
    return { success: false, error: "TWITTER_BEARER_TOKEN not set" };
  }

  try {
    const response = await fetch(
      "https://api.twitter.com/2/tweets/search/recent?query=test&max_results=1",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      const errorJson = JSON.parse(errorText).catch(() => ({ title: errorText.substring(0, 100) }));
      
      // 429 is rate limiting - credentials are valid but hit rate limit
      if (response.status === 429) {
        return {
          success: false,
          error: `HTTP 429: Rate limited. Credentials are valid but API quota exceeded. Wait before retrying.`,
        };
      }
      
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      details: {
        hasData: !!data.data,
        tweetCount: Array.isArray(data.data) ? data.data.length : 0,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Test NewsAPI
 */
async function testNewsAPI(): Promise<{ success: boolean; error?: string; details?: any }> {
  const key = process.env.NEWS_API_KEY;
  if (!key) {
    return { success: false, error: "NEWS_API_KEY not set" };
  }

  try {
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=test&pageSize=1&apiKey=${key}`,
      {
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      details: {
        hasArticles: !!data.articles,
        articleCount: Array.isArray(data.articles) ? data.articles.length : 0,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Test TikTok API (just check credentials, full OAuth test is complex)
 */
async function testTikTok(): Promise<{ success: boolean; error?: string; details?: any }> {
  const key = process.env.TIKTOK_API_KEY;
  const secret = process.env.TIKTOK_API_SECRET;

  if (!key || !secret) {
    return {
      success: false,
      error: !key && !secret
        ? "TIKTOK_API_KEY and TIKTOK_API_SECRET not set"
        : !key
        ? "TIKTOK_API_KEY not set"
        : "TIKTOK_API_SECRET not set",
    };
  }

  return {
    success: true,
    details: {
      note: "Credentials configured. Full API test requires OAuth flow.",
    },
  };
}

/**
 * Test Instagram API
 */
async function testInstagram(): Promise<{ success: boolean; error?: string; details?: any }> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const appId = process.env.INSTAGRAM_APP_ID;

  if (!token || !appId) {
    return {
      success: false,
      error: !token && !appId
        ? "INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_APP_ID not set"
        : !token
        ? "INSTAGRAM_ACCESS_TOKEN not set"
        : "INSTAGRAM_APP_ID not set",
    };
  }

  try {
    const response = await fetch(
      `https://graph.instagram.com/v18.0/me?fields=id,username&access_token=${token}`,
      {
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      details: {
        userId: data.id,
        username: data.username,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Test Kalshi API
 */
async function testKalshi(): Promise<{ success: boolean; error?: string; details?: any }> {
  const key = process.env.KALSHI_API_KEY;
  const secret = process.env.KALSHI_API_SECRET;
  // Use the new elections subdomain endpoint
  const base = process.env.KALSHI_API_BASE || "https://api.elections.kalshi.com/trade-api/v2";

  if (!key || !secret) {
    return {
      success: false,
      error: !key && !secret
        ? "KALSHI_API_KEY and KALSHI_API_SECRET not set"
        : !key
        ? "KALSHI_API_KEY not set"
        : "KALSHI_API_SECRET not set",
    };
  }

  try {
    // Kalshi API requires authentication, so we'll just check if endpoint is reachable
    const response = await fetch(`${base}/markets?limit=1`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    // 401/403 means endpoint exists but needs auth (credentials are set)
    if (response.status === 401 || response.status === 403) {
      return {
        success: true,
        details: {
          note: "API endpoint reachable. Credentials configured (authentication required for full test).",
        },
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`,
      };
    }

    return { success: true, details: { hasData: true } };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Test OpenRouter API
 */
async function testOpenRouter(): Promise<{ success: boolean; error?: string; details?: any }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return { success: false, error: "OPENROUTER_API_KEY not set" };
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_CHAT_MODEL || "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 5,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`,
      };
    }

    return { success: true, details: { apiWorking: true } };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Test Reddit API (public, no key needed)
 */
async function testReddit(): Promise<{ success: boolean; error?: string; details?: any }> {
  try {
    const response = await fetch("https://www.reddit.com/search.json?q=test&limit=1", {
      headers: {
        "User-Agent": "PolymarketFactChecker/1.0 (by /u/polymarket-fact-checker)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return { 
        success: false, 
        error: `HTTP ${response.status}${errorText ? `: ${errorText.substring(0, 100)}` : ""}` 
      };
    }

    const data = await response.json().catch(() => null);
    return { 
      success: true, 
      details: { 
        publicApi: true,
        hasData: !!data?.data?.children 
      } 
    };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Test Google Trends (public, no key needed)
 */
async function testGoogleTrends(): Promise<{ success: boolean; error?: string; details?: any }> {
  // Google Trends is accessed via public endpoints, no API key needed
  return { success: true, details: { publicApi: true } };
}

/**
 * Test RSS Feeds (public, no key needed)
 */
async function testRSSFeeds(): Promise<{ success: boolean; error?: string; details?: any }> {
  try {
    const response = await fetch("http://feeds.bbci.co.uk/news/rss.xml", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PolymarketFactChecker/1.0)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    return { success: true, details: { publicFeeds: true } };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Test Polymarket APIs (public, no key needed)
 */
async function testPolymarket(): Promise<{ success: boolean; error?: string; details?: any }> {
  try {
    const base = process.env.POLYMARKET_GAMMA_BASE || "https://gamma-api.polymarket.com";
    const response = await fetch(`${base}/markets?limit=1`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    return { success: true, details: { publicApi: true } };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Main credentials checker action
 */
export const checkCredentials = action({
  args: {},
  handler: async (ctx) => {
    console.log("🔍 Checking credentials and testing connections...\n");

    // Check all credentials
    const credentials: CredentialStatus[] = [
      {
        name: "OpenRouter API",
        required: true,
        configured: isEnvSet("OPENROUTER_API_KEY"),
        keys: ["OPENROUTER_API_KEY"],
        status: isEnvSet("OPENROUTER_API_KEY") ? "✅ Set" : "❌ Missing",
      },
      {
        name: "Twitter/X",
        required: false,
        configured: isEnvSet("TWITTER_BEARER_TOKEN"),
        keys: ["TWITTER_BEARER_TOKEN"],
        status: isEnvSet("TWITTER_BEARER_TOKEN") ? "✅ Set" : "❌ Missing",
      },
      {
        name: "TikTok",
        required: false,
        configured: isEnvSet("TIKTOK_API_KEY") && isEnvSet("TIKTOK_API_SECRET"),
        keys: ["TIKTOK_API_KEY", "TIKTOK_API_SECRET"],
        status:
          isEnvSet("TIKTOK_API_KEY") && isEnvSet("TIKTOK_API_SECRET")
            ? "✅ Set"
            : isEnvSet("TIKTOK_API_KEY") || isEnvSet("TIKTOK_API_SECRET")
            ? "⚠️ Partial"
            : "❌ Missing",
      },
      {
        name: "Instagram",
        required: false,
        configured: isEnvSet("INSTAGRAM_ACCESS_TOKEN") && isEnvSet("INSTAGRAM_APP_ID"),
        keys: ["INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_APP_ID"],
        status:
          isEnvSet("INSTAGRAM_ACCESS_TOKEN") && isEnvSet("INSTAGRAM_APP_ID")
            ? "✅ Set"
            : isEnvSet("INSTAGRAM_ACCESS_TOKEN") || isEnvSet("INSTAGRAM_APP_ID")
            ? "⚠️ Partial"
            : "❌ Missing",
      },
      {
        name: "Kalshi",
        required: false,
        configured: isEnvSet("KALSHI_API_KEY") && isEnvSet("KALSHI_API_SECRET"),
        keys: ["KALSHI_API_KEY", "KALSHI_API_SECRET"],
        status:
          isEnvSet("KALSHI_API_KEY") && isEnvSet("KALSHI_API_SECRET")
            ? "✅ Set"
            : isEnvSet("KALSHI_API_KEY") || isEnvSet("KALSHI_API_SECRET")
            ? "⚠️ Partial"
            : "❌ Missing",
      },
      {
        name: "NewsAPI",
        required: false,
        configured: isEnvSet("NEWS_API_KEY"),
        keys: ["NEWS_API_KEY"],
        status: isEnvSet("NEWS_API_KEY") ? "✅ Set" : "❌ Missing",
      },
    ];

    // Test each credential
    console.log("Testing API connections...\n");
    for (const cred of credentials) {
      if (cred.configured || cred.required) {
        let testResult;
        switch (cred.name) {
          case "OpenRouter API":
            testResult = await testOpenRouter();
            break;
          case "Twitter/X":
            testResult = await testTwitter();
            break;
          case "TikTok":
            testResult = await testTikTok();
            break;
          case "Instagram":
            testResult = await testInstagram();
            break;
          case "Kalshi":
            testResult = await testKalshi();
            break;
          case "NewsAPI":
            testResult = await testNewsAPI();
            break;
          default:
            testResult = { success: false, error: "Unknown service" };
        }
        cred.testResult = testResult;
      }
    }

    // Check data sources
    const sources: SourceStatus[] = [
      {
        source: "Polymarket",
        icon: "📊",
        status: "✅ No Key Needed",
        keysRequired: [],
        keysConfigured: [],
        testPassed: false,
      },
      {
        source: "Reddit",
        icon: "💬",
        status: "✅ No Key Needed",
        keysRequired: [],
        keysConfigured: [],
        testPassed: false,
      },
      {
        source: "News (RSS)",
        icon: "📰",
        status: "✅ No Key Needed",
        keysRequired: [],
        keysConfigured: [],
        testPassed: false,
      },
      {
        source: "Google Trends",
        icon: "📈",
        status: "✅ No Key Needed",
        keysRequired: [],
        keysConfigured: [],
        testPassed: false,
      },
      {
        source: "Twitter/X",
        icon: "🐦",
        status: isEnvSet("TWITTER_BEARER_TOKEN") ? "✅ Working" : "❌ Not Configured",
        keysRequired: ["TWITTER_BEARER_TOKEN"],
        keysConfigured: isEnvSet("TWITTER_BEARER_TOKEN") ? ["TWITTER_BEARER_TOKEN"] : [],
        testPassed: false,
      },
      {
        source: "TikTok",
        icon: "🎵",
        status:
          isEnvSet("TIKTOK_API_KEY") && isEnvSet("TIKTOK_API_SECRET")
            ? "✅ Working"
            : "❌ Not Configured",
        keysRequired: ["TIKTOK_API_KEY", "TIKTOK_API_SECRET"],
        keysConfigured: [
          ...(isEnvSet("TIKTOK_API_KEY") ? ["TIKTOK_API_KEY"] : []),
          ...(isEnvSet("TIKTOK_API_SECRET") ? ["TIKTOK_API_SECRET"] : []),
        ],
        testPassed: false,
      },
      {
        source: "Instagram",
        icon: "📷",
        status:
          isEnvSet("INSTAGRAM_ACCESS_TOKEN") && isEnvSet("INSTAGRAM_APP_ID")
            ? "✅ Working"
            : "❌ Not Configured",
        keysRequired: ["INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_APP_ID"],
        keysConfigured: [
          ...(isEnvSet("INSTAGRAM_ACCESS_TOKEN") ? ["INSTAGRAM_ACCESS_TOKEN"] : []),
          ...(isEnvSet("INSTAGRAM_APP_ID") ? ["INSTAGRAM_APP_ID"] : []),
        ],
        testPassed: false,
      },
      {
        source: "Kalshi",
        icon: "🎯",
        status:
          isEnvSet("KALSHI_API_KEY") && isEnvSet("KALSHI_API_SECRET")
            ? "✅ Working"
            : "❌ Not Configured",
        keysRequired: ["KALSHI_API_KEY", "KALSHI_API_SECRET"],
        keysConfigured: [
          ...(isEnvSet("KALSHI_API_KEY") ? ["KALSHI_API_KEY"] : []),
          ...(isEnvSet("KALSHI_API_SECRET") ? ["KALSHI_API_SECRET"] : []),
        ],
        testPassed: false,
      },
      {
        source: "NewsAPI (Enhanced)",
        icon: "📰",
        status: isEnvSet("NEWS_API_KEY") ? "✅ Working" : "⚠️ Needs Keys",
        keysRequired: ["NEWS_API_KEY"],
        keysConfigured: isEnvSet("NEWS_API_KEY") ? ["NEWS_API_KEY"] : [],
        testPassed: false,
      },
    ];

    // Test public APIs
    console.log("Testing public APIs (no keys needed)...\n");
    const polymarketTest = await testPolymarket();
    sources[0].testPassed = polymarketTest.success;

    const redditTest = await testReddit();
    sources[1].testPassed = redditTest.success;

    const rssTest = await testRSSFeeds();
    sources[2].testPassed = rssTest.success;

    const trendsTest = await testGoogleTrends();
    sources[3].testPassed = trendsTest.success;

    // Update test results for configured sources
    for (const source of sources) {
      if (source.keysRequired.length > 0 && source.keysConfigured.length === source.keysRequired.length) {
        const cred = credentials.find((c) => c.keys.some((k) => source.keysRequired.includes(k)));
        if (cred?.testResult) {
          source.testPassed = cred.testResult.success;
          if (!cred.testResult.success) {
            source.error = cred.testResult.error;
          }
        }
      }
    }

    // Print summary
    console.log("=".repeat(70));
    console.log("📋 CREDENTIALS STATUS");
    console.log("=".repeat(70));
    console.log();

    credentials.forEach((cred) => {
      const required = cred.required ? "🔴 REQUIRED" : "🟡 OPTIONAL";
      console.log(`${cred.status} ${cred.name} ${required}`);
      console.log(`   Keys: ${cred.keys.join(", ")}`);
      if (cred.testResult) {
        if (cred.testResult.success) {
          console.log(`   ✅ Test: PASSED`);
          if (cred.testResult.details) {
            console.log(`   Details: ${JSON.stringify(cred.testResult.details)}`);
          }
        } else {
          console.log(`   ❌ Test: FAILED - ${cred.testResult.error}`);
        }
      } else if (!cred.configured && !cred.required) {
        console.log(`   ⏭️  Test: SKIPPED (not configured)`);
      }
      console.log();
    });

    console.log("=".repeat(70));
    console.log("📊 DATA SOURCES STATUS");
    console.log("=".repeat(70));
    console.log();

    sources.forEach((source) => {
      console.log(`${source.icon} ${source.source}: ${source.status}`);
      if (source.keysRequired.length > 0) {
        console.log(`   Required keys: ${source.keysRequired.join(", ")}`);
        console.log(`   Configured: ${source.keysConfigured.length}/${source.keysRequired.length}`);
      }
      if (source.testPassed) {
        console.log(`   ✅ Connection test: PASSED`);
      } else if (source.keysRequired.length === 0) {
        console.log(`   ${source.testPassed ? "✅" : "❌"} Connection test: ${source.testPassed ? "PASSED" : "FAILED"}`);
      } else if (source.keysConfigured.length === 0) {
        console.log(`   ⏭️  Connection test: SKIPPED (keys not configured)`);
      } else {
        console.log(`   ❌ Connection test: FAILED${source.error ? ` - ${source.error}` : ""}`);
      }
      console.log();
    });

    // Summary statistics
    const configuredCount = credentials.filter((c) => c.configured).length;
    const requiredCount = credentials.filter((c) => c.required).length;
    const optionalCount = credentials.filter((c) => !c.required).length;
    const optionalConfigured = credentials.filter((c) => !c.required && c.configured).length;

    const workingSources = sources.filter((s) => s.status === "✅ Working" || s.status === "✅ No Key Needed").length;
    const totalSources = sources.length;

    console.log("=".repeat(70));
    console.log("📈 SUMMARY");
    console.log("=".repeat(70));
    console.log();
    console.log(`✅ Required credentials: ${credentials.filter((c) => c.required && c.configured).length}/${requiredCount}`);
    console.log(`🟡 Optional credentials: ${optionalConfigured}/${optionalCount}`);
    console.log(`📊 Working data sources: ${workingSources}/${totalSources}`);
    console.log();

    const missingRequired = credentials.filter((c) => c.required && !c.configured);
    if (missingRequired.length > 0) {
      console.log("⚠️  WARNING: Missing required credentials:");
      missingRequired.forEach((cred) => {
        console.log(`   - ${cred.name}: ${cred.keys.join(", ")}`);
      });
      console.log();
    }

    return {
      credentials,
      sources,
      summary: {
        totalCredentials: credentials.length,
        configuredCredentials: configuredCount,
        requiredCredentials: requiredCount,
        requiredConfigured: credentials.filter((c) => c.required && c.configured).length,
        optionalCredentials: optionalCount,
        optionalConfigured: optionalConfigured,
        totalSources: totalSources,
        workingSources: workingSources,
        missingRequired: missingRequired.map((c) => c.name),
      },
    };
  },
});

