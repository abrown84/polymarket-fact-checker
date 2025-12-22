"use node";

import { action } from "../_generated/server";

const POLYMARKET_GAMMA_BASE =
  process.env.POLYMARKET_GAMMA_BASE || "https://gamma-api.polymarket.com";

interface EndpointTest {
  endpoint: string;
  url: string;
  success: boolean;
  status?: number;
  error?: string;
  marketCount?: number;
  activeCount?: number;
  closedCount?: number;
  sampleMarket?: any;
}

/**
 * Test various Polymarket API endpoints to find ones that return active markets
 */
export const testApiEndpoints = action({
  args: {},
  handler: async (ctx) => {
    const endpointsToTest = [
      // Basic endpoints
      { path: "/markets", params: "?limit=10" },
      { path: "/markets", params: "?limit=10&active=true" },
      { path: "/markets", params: "?limit=10&closed=false" },
      { path: "/markets", params: "?limit=10&active=true&closed=false" },
      
      // Different sorting/filtering
      { path: "/markets", params: "?limit=10&sort=volume" },
      { path: "/markets", params: "?limit=10&sort=created_at&order=desc" },
      { path: "/markets", params: "?limit=10&sort=updated_at&order=desc" },
      
      // Alternative endpoints
      { path: "/events", params: "?limit=10" },
      { path: "/events", params: "?limit=10&active=true" },
      { path: "/trending", params: "?limit=10" },
      { path: "/active", params: "?limit=10" },
      { path: "/markets/active", params: "?limit=10" },
      { path: "/markets/trending", params: "?limit=10" },
      { path: "/markets/recent", params: "?limit=10" },
      
      // With date filters
      { path: "/markets", params: "?limit=10&endDate_gt=" + new Date().toISOString() },
    ];

    const results: EndpointTest[] = [];

    for (const endpoint of endpointsToTest) {
      const url = `${POLYMARKET_GAMMA_BASE}${endpoint.path}${endpoint.params}`;
      console.log(`[testApiEndpoints] Testing: ${url}`);
      
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(10000),
        });

        const result: EndpointTest = {
          endpoint: `${endpoint.path}${endpoint.params}`,
          url,
          success: response.ok,
          status: response.status,
        };

        if (!response.ok) {
          const errorText = await response.text();
          result.error = errorText.substring(0, 200);
          results.push(result);
          continue;
        }

        const data = await response.json();
        
        // Handle different response formats
        let markets: any[] = [];
        if (Array.isArray(data)) {
          markets = data;
        } else if (Array.isArray(data.data)) {
          markets = data.data;
        } else if (Array.isArray(data.markets)) {
          markets = data.markets;
        } else if (Array.isArray(data.results)) {
          markets = data.results;
        } else if (data.events && Array.isArray(data.events)) {
          markets = data.events;
        }

        result.marketCount = markets.length;
        
        if (markets.length > 0) {
          // Analyze market status
          const now = Date.now();
          let activeCount = 0;
          let closedCount = 0;
          
          for (const market of markets) {
            const isActive = market.active !== false;
            const isClosed = market.closed === true;
            const endDate = market.endDate 
              ? new Date(market.endDate).getTime()
              : market.endDateISO
              ? new Date(market.endDateISO).getTime()
              : null;
            const hasEnded = endDate && endDate < now;
            
            if (isActive && !isClosed && !hasEnded) {
              activeCount++;
            } else {
              closedCount++;
            }
          }
          
          result.activeCount = activeCount;
          result.closedCount = closedCount;
          result.sampleMarket = {
            id: markets[0].id,
            question: markets[0].question || markets[0].title,
            active: markets[0].active,
            closed: markets[0].closed,
            endDate: markets[0].endDate,
            volume: markets[0].volume || markets[0].volumeNum,
          };
        }

        results.push(result);
      } catch (error: any) {
        results.push({
          endpoint: `${endpoint.path}${endpoint.params}`,
          url,
          success: false,
          error: error.message || String(error),
        });
      }
    }

    // Sort results by active count (descending)
    results.sort((a, b) => (b.activeCount || 0) - (a.activeCount || 0));

    console.log(`[testApiEndpoints] Tested ${results.length} endpoints`);
    console.log(`[testApiEndpoints] Best endpoints (by active markets):`);
    results.slice(0, 5).forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.endpoint}: ${r.activeCount || 0} active, ${r.closedCount || 0} closed`);
    });

    return {
      totalTested: results.length,
      results,
      bestEndpoints: results
        .filter(r => (r.activeCount || 0) > 0)
        .slice(0, 5)
        .map(r => ({
          endpoint: r.endpoint,
          url: r.url,
          activeMarkets: r.activeCount,
          totalMarkets: r.marketCount,
        })),
    };
  },
});



