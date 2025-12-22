#!/usr/bin/env node

/**
 * Simple test script for MCP server functionality
 * Tests the core Polymarket API integration without MCP protocol
 */

import axios from "axios";
import { ClobClient } from "@polymarket/clob-client";

const POLYMARKET_GAMMA_BASE = "https://gamma-api.polymarket.com";
const POLYMARKET_CLOB_BASE = "https://clob.polymarket.com";

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  data?: any;
}

async function testGammaAPI(): Promise<TestResult> {
  try {
    const response = await axios.get(`${POLYMARKET_GAMMA_BASE}/markets?limit=5&closed=false&active=true`);
    const markets = Array.isArray(response.data) ? response.data : response.data.data || [];
    
    return {
      name: "Gamma API - Fetch Markets",
      success: markets.length > 0,
      data: { count: markets.length, sample: markets[0]?.question || markets[0]?.title },
    };
  } catch (error: any) {
    return {
      name: "Gamma API - Fetch Markets",
      success: false,
      error: error.message,
    };
  }
}

async function testGammaMarketDetails(): Promise<TestResult> {
  try {
    // First get a market ID
    const listResponse = await axios.get(`${POLYMARKET_GAMMA_BASE}/markets?limit=1&closed=false&active=true`);
    const markets = Array.isArray(listResponse.data) ? listResponse.data : listResponse.data.data || [];
    
    if (markets.length === 0) {
      return {
        name: "Gamma API - Market Details",
        success: false,
        error: "No markets available to test",
      };
    }

    const marketId = markets[0].id || markets[0].marketId;
    if (!marketId) {
      return {
        name: "Gamma API - Market Details",
        success: false,
        error: "Market ID not found",
      };
    }

    const detailResponse = await axios.get(`${POLYMARKET_GAMMA_BASE}/markets/${marketId}`);
    
    return {
      name: "Gamma API - Market Details",
      success: !!detailResponse.data,
      data: { id: marketId, question: detailResponse.data.question || detailResponse.data.title },
    };
  } catch (error: any) {
    return {
      name: "Gamma API - Market Details",
      success: false,
      error: error.message,
    };
  }
}

async function testClobClient(): Promise<TestResult> {
  try {
    const clobClient = new ClobClient(POLYMARKET_CLOB_BASE, 137);
    
    // Get a token ID from a market
    const listResponse = await axios.get(`${POLYMARKET_GAMMA_BASE}/markets?limit=1&closed=false&active=true`);
    const markets = Array.isArray(listResponse.data) ? listResponse.data : listResponse.data.data || [];
    
    if (markets.length === 0) {
      return {
        name: "CLOB Client - Price",
        success: false,
        error: "No markets available to test",
      };
    }

    // Try to get token ID from various possible fields
    const market = markets[0];
    const tokenId = 
      (Array.isArray(market.clobTokenIds) && market.clobTokenIds.length > 0) 
        ? market.clobTokenIds[0] 
        : market.clobTokenIds 
        ? String(market.clobTokenIds).split(',')[0].replace(/[\[\]"]/g, '')
        : market.tokenId || market.id;

    if (!tokenId || tokenId === '[' || tokenId.length < 10) {
      return {
        name: "CLOB Client - Price",
        success: false,
        error: `Invalid token ID: ${tokenId}. Market structure: ${JSON.stringify(Object.keys(market))}`,
      };
    }
    const priceData = await clobClient.getPrice(tokenId, "YES");
    
    return {
      name: "CLOB Client - Price",
      success: priceData !== null && priceData !== undefined,
      data: { tokenId, price: priceData?.price, bid: priceData?.bid, ask: priceData?.ask },
    };
  } catch (error: any) {
    return {
      name: "CLOB Client - Price",
      success: false,
      error: error.message,
    };
  }
}

async function testClobOrderBook(): Promise<TestResult> {
  try {
    const clobClient = new ClobClient(POLYMARKET_CLOB_BASE, 137);
    
    // Get a token ID from a market
    const listResponse = await axios.get(`${POLYMARKET_GAMMA_BASE}/markets?limit=1&closed=false&active=true`);
    const markets = Array.isArray(listResponse.data) ? listResponse.data : listResponse.data.data || [];
    
    if (markets.length === 0) {
      return {
        name: "CLOB Client - Order Book",
        success: false,
        error: "No markets available to test",
      };
    }

    // Try to get token ID from various possible fields
    const market = markets[0];
    const tokenId = 
      (Array.isArray(market.clobTokenIds) && market.clobTokenIds.length > 0) 
        ? market.clobTokenIds[0] 
        : market.clobTokenIds 
        ? String(market.clobTokenIds).split(',')[0].replace(/[\[\]"]/g, '')
        : market.tokenId || market.id;

    if (!tokenId || tokenId === '[' || tokenId.length < 10) {
      return {
        name: "CLOB Client - Order Book",
        success: false,
        error: `Invalid token ID: ${tokenId}`,
      };
    }
    const orderBook = await clobClient.getOrderBook(tokenId);
    
    const hasBids = orderBook?.bids && orderBook.bids.length > 0;
    const hasAsks = orderBook?.asks && orderBook.asks.length > 0;
    
    return {
      name: "CLOB Client - Order Book",
      success: hasBids || hasAsks,
      data: { 
        tokenId, 
        bids: orderBook?.bids?.length || 0, 
        asks: orderBook?.asks?.length || 0 
      },
    };
  } catch (error: any) {
    return {
      name: "CLOB Client - Order Book",
      success: false,
      error: error.message,
    };
  }
}

async function runAllTests() {
  console.log("🧪 Testing Polymarket MCP Server Components\n");
  console.log("=".repeat(60));

  const tests = [
    testGammaAPI,
    testGammaMarketDetails,
    testClobClient,
    testClobOrderBook,
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    try {
      const result = await test();
      results.push(result);
      const icon = result.success ? "✅" : "❌";
      console.log(`${icon} ${result.name}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.data) {
        console.log(`   Data: ${JSON.stringify(result.data)}`);
      }
      console.log();
    } catch (error: any) {
      const result: TestResult = {
        name: test.name,
        success: false,
        error: error.message,
      };
      results.push(result);
      console.log(`❌ ${result.name}`);
      console.log(`   Error: ${result.error}\n`);
    }
  }

  // Summary
  const successCount = results.filter((r) => r.success).length;
  const totalCount = results.length;
  const allPassed = successCount === totalCount;

  console.log("=".repeat(60));
  console.log(`SUMMARY: ${successCount}/${totalCount} tests passed`);
  console.log("=".repeat(60));

  if (allPassed) {
    console.log("🎉 All tests passed!");
    process.exit(0);
  } else {
    console.log("⚠️  Some tests failed");
    process.exit(1);
  }
}

runAllTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

