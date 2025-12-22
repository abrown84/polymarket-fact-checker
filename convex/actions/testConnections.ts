"use node";

/**
 * Test script to verify all external API connections
 * Run with: npx convex run actions/testConnections:testConnections
 */

import { action } from "../_generated/server";
import { internal } from "../_generated/api";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_CHAT_MODEL = process.env.OPENROUTER_CHAT_MODEL || "openai/gpt-4o-mini";
const OPENROUTER_EMBED_MODEL = process.env.OPENROUTER_EMBED_MODEL || "openai/text-embedding-3-small";
const POLYMARKET_GAMMA_BASE = process.env.POLYMARKET_GAMMA_BASE || "https://gamma-api.polymarket.com";
const POLYMARKET_CLOB_BASE = process.env.POLYMARKET_CLOB_BASE || "https://clob.polymarket.com";

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  details?: any;
  duration?: number;
}

/**
 * Test Polymarket Gamma API connection
 */
async function testGammaAPI(): Promise<TestResult> {
  const startTime = Date.now();
  try {
    const url = `${POLYMARKET_GAMMA_BASE}/markets?limit=1`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        name: "Polymarket Gamma API",
        success: false,
        error: `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
        duration: Date.now() - startTime,
      };
    }

    const data = await response.json();
    return {
      name: "Polymarket Gamma API",
      success: true,
      details: {
        hasData: !!data.data,
        dataLength: Array.isArray(data.data) ? data.data.length : 0,
        hasCursor: !!data.cursor,
      },
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      name: "Polymarket Gamma API",
      success: false,
      error: error.message || String(error),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test Polymarket CLOB API connection (price endpoint)
 */
async function testClobAPI(): Promise<TestResult> {
  const startTime = Date.now();
  try {
    // Try to get a market ID from Gamma first
    let marketId: string | null = null;
    
    try {
      const gammaUrl = `${POLYMARKET_GAMMA_BASE}/markets?limit=10`;
      const gammaResponse = await fetch(gammaUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
      });

      if (gammaResponse.ok) {
        const gammaData = await gammaResponse.json();
        const markets = gammaData.data;
        if (markets && markets.length > 0) {
          // Try to get market ID from first market
          marketId = markets[0].id || markets[0].marketId || markets[0].slug || null;
        }
      }
    } catch (e) {
      // If Gamma fails, we'll test CLOB with a known endpoint structure instead
      console.log("Could not get market ID from Gamma, testing CLOB endpoint structure");
    }

    // If we couldn't get a market ID, test the endpoint structure with a test request
    // This validates the API is reachable even if we don't have a valid market ID
    const testMarketId = marketId || "test-market-id-connection-check";
    const clobUrl = `${POLYMARKET_CLOB_BASE}/price?market=${testMarketId}`;
    const clobResponse = await fetch(clobUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    // CLOB API should respond even with invalid market ID (404 is acceptable - means API is reachable)
    // Any response (200, 400, 404) means the connection works
    if (clobResponse.status === 404 || clobResponse.status === 400) {
      return {
        name: "Polymarket CLOB API",
        success: true,
        details: {
          status: clobResponse.status,
          message: marketId 
            ? "API reachable (invalid market ID tested)" 
            : "API reachable (no market ID available from Gamma, but endpoint responds)",
        },
        duration: Date.now() - startTime,
      };
    }

    if (!clobResponse.ok) {
      const errorText = await clobResponse.text();
      return {
        name: "Polymarket CLOB API",
        success: false,
        error: `HTTP ${clobResponse.status}: ${errorText.substring(0, 200)}`,
        duration: Date.now() - startTime,
      };
    }

    // Success case - got valid price data
    const clobData = await clobResponse.json();
    return {
      name: "Polymarket CLOB API",
      success: true,
      details: {
        marketId: marketId || "unknown",
        hasPrice: "price" in clobData,
        price: clobData.price,
      },
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      name: "Polymarket CLOB API",
      success: false,
      error: error.message || String(error),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test OpenRouter Embeddings API
 */
async function testOpenRouterEmbeddings(): Promise<TestResult> {
  const startTime = Date.now();
  if (!OPENROUTER_API_KEY) {
    return {
      name: "OpenRouter Embeddings API",
      success: false,
      error: "OPENROUTER_API_KEY environment variable not set",
      duration: Date.now() - startTime,
    };
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://polymarket-fact-checker.vercel.app",
        "X-Title": "Polymarket Fact Checker",
      },
      body: JSON.stringify({
        model: OPENROUTER_EMBED_MODEL,
        input: "test connection",
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        name: "OpenRouter Embeddings API",
        success: false,
        error: `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
        duration: Date.now() - startTime,
      };
    }

    const data = await response.json();
    const embedding = data.data?.[0]?.embedding;
    return {
      name: "OpenRouter Embeddings API",
      success: true,
      details: {
        model: OPENROUTER_EMBED_MODEL,
        embeddingLength: Array.isArray(embedding) ? embedding.length : 0,
        hasEmbedding: !!embedding,
      },
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      name: "OpenRouter Embeddings API",
      success: false,
      error: error.message || String(error),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test OpenRouter Chat Completions API
 */
async function testOpenRouterChat(): Promise<TestResult> {
  const startTime = Date.now();
  if (!OPENROUTER_API_KEY) {
    return {
      name: "OpenRouter Chat API",
      success: false,
      error: "OPENROUTER_API_KEY environment variable not set",
      duration: Date.now() - startTime,
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
          { role: "user", content: "Say 'test successful' and nothing else." },
        ],
        max_tokens: 10,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        name: "OpenRouter Chat API",
        success: false,
        error: `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
        duration: Date.now() - startTime,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    return {
      name: "OpenRouter Chat API",
      success: true,
      details: {
        model: OPENROUTER_CHAT_MODEL,
        response: content,
        hasResponse: !!content,
      },
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      name: "OpenRouter Chat API",
      success: false,
      error: error.message || String(error),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test Convex database connection
 */
async function testConvexConnection(ctx: any): Promise<TestResult> {
  const startTime = Date.now();
  try {
    // Test internal API access
    const internalApi = internal as {
      queries: { getCache: any };
    };

    // Try a simple query to test database connection
    const result = await ctx.runQuery(internalApi.queries.getCache, {
      key: "__connection_test__",
    });

    return {
      name: "Convex Database",
      success: true,
      details: {
        connection: "established",
        testQueryResult: result === null ? "null (expected)" : "unexpected value",
      },
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      name: "Convex Database",
      success: false,
      error: error.message || String(error),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Main test action
 */
export const testConnections = action({
  args: {},
  handler: async (ctx) => {
    console.log("Starting connection tests...\n");

    const results: TestResult[] = [];

    // Test 1: Polymarket Gamma API
    console.log("Testing Polymarket Gamma API...");
    const gammaResult = await testGammaAPI();
    results.push(gammaResult);
    console.log(`${gammaResult.success ? "✓" : "✗"} ${gammaResult.name}: ${gammaResult.success ? "SUCCESS" : gammaResult.error}`);

    // Test 2: Polymarket CLOB API
    console.log("\nTesting Polymarket CLOB API...");
    const clobResult = await testClobAPI();
    results.push(clobResult);
    console.log(`${clobResult.success ? "✓" : "✗"} ${clobResult.name}: ${clobResult.success ? "SUCCESS" : clobResult.error}`);

    // Test 3: OpenRouter Embeddings
    console.log("\nTesting OpenRouter Embeddings API...");
    const embedResult = await testOpenRouterEmbeddings();
    results.push(embedResult);
    console.log(`${embedResult.success ? "✓" : "✗"} ${embedResult.name}: ${embedResult.success ? "SUCCESS" : embedResult.error}`);

    // Test 4: OpenRouter Chat
    console.log("\nTesting OpenRouter Chat API...");
    const chatResult = await testOpenRouterChat();
    results.push(chatResult);
    console.log(`${chatResult.success ? "✓" : "✗"} ${chatResult.name}: ${chatResult.success ? "SUCCESS" : chatResult.error}`);

    // Test 5: Convex Database
    console.log("\nTesting Convex Database connection...");
    const convexResult = await testConvexConnection(ctx);
    results.push(convexResult);
    console.log(`${convexResult.success ? "✓" : "✗"} ${convexResult.name}: ${convexResult.success ? "SUCCESS" : convexResult.error}`);

    // Summary
    const successCount = results.filter((r) => r.success).length;
    const totalCount = results.length;
    const allPassed = successCount === totalCount;

    console.log("\n" + "=".repeat(60));
    console.log(`SUMMARY: ${successCount}/${totalCount} tests passed`);
    console.log("=".repeat(60));

    results.forEach((result) => {
      const status = result.success ? "✓ PASS" : "✗ FAIL";
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
      success: allPassed,
      results,
      summary: {
        total: totalCount,
        passed: successCount,
        failed: totalCount - successCount,
      },
    };
  },
});



