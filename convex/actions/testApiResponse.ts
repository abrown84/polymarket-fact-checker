"use node";

import { action } from "../_generated/server";

const POLYMARKET_GAMMA_BASE =
  process.env.POLYMARKET_GAMMA_BASE || "https://gamma-api.polymarket.com";

/**
 * Test action to see the raw API response from Polymarket Gamma API
 * This will help us understand what data structure is actually returned
 */
export const testApiResponse = action({
  args: {},
  handler: async (ctx) => {
    try {
      const url = `${POLYMARKET_GAMMA_BASE}/markets?limit=5`;
      console.log(`[testApiResponse] Fetching from: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15000),
      });

      console.log(`[testApiResponse] Response status: ${response.status} ${response.statusText}`);
      console.log(`[testApiResponse] Response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url,
        };
      }

      const data = await response.json();
      const responseStr = JSON.stringify(data, null, 2);
      
      console.log(`[testApiResponse] Response type: ${typeof data}`);
      console.log(`[testApiResponse] Response keys:`, Object.keys(data));
      console.log(`[testApiResponse] Full response (first 5000 chars):`, responseStr.substring(0, 5000));
      
      // Analyze the structure
      const analysis: any = {
        hasData: !!data.data,
        dataType: typeof data.data,
        dataIsArray: Array.isArray(data.data),
        dataLength: Array.isArray(data.data) ? data.data.length : (data.data ? "object" : "null/undefined"),
        hasCursor: !!data.cursor,
        hasResults: !!data.results,
        hasMarkets: !!data.markets,
        topLevelKeys: Object.keys(data),
      };

      if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
        analysis.dataKeys = Object.keys(data.data);
      }

      if (Array.isArray(data.data) && data.data.length > 0) {
        analysis.firstMarketKeys = Object.keys(data.data[0]);
        analysis.firstMarketSample = JSON.stringify(data.data[0], null, 2).substring(0, 1000);
      }

      return {
        success: true,
        url,
        status: response.status,
        analysis,
        fullResponse: responseStr, // Return full response so we can see it
        responsePreview: responseStr.substring(0, 2000), // First 2000 chars for quick view
      };
    } catch (error: any) {
      console.error(`[testApiResponse] Error:`, error);
      return {
        success: false,
        error: error.message || String(error),
        stack: error.stack,
      };
    }
  },
});

