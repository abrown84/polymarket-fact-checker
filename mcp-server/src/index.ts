#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { ClobClient } from "@polymarket/clob-client";
import axios from "axios";

const POLYMARKET_GAMMA_BASE = "https://gamma-api.polymarket.com";
const POLYMARKET_CLOB_BASE = "https://clob.polymarket.com";

// Initialize CLOB client (read-only, no auth needed)
const clobClient = new ClobClient(POLYMARKET_CLOB_BASE, 137);

class PolymarketMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "polymarket-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "search_markets",
            description: "Search for Polymarket markets by query string",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search query (e.g., 'Will Trump win 2024?')",
                },
                limit: {
                  type: "number",
                  description: "Maximum number of results (default: 10)",
                  default: 10,
                },
              },
              required: ["query"],
            },
          },
          {
            name: "get_market",
            description: "Get detailed information about a specific market by ID",
            inputSchema: {
              type: "object",
              properties: {
                marketId: {
                  type: "string",
                  description: "The Polymarket market ID",
                },
              },
              required: ["marketId"],
            },
          },
          {
            name: "get_price",
            description: "Get current price for a market token",
            inputSchema: {
              type: "object",
              properties: {
                tokenId: {
                  type: "string",
                  description: "The token ID (YES or NO token for a market)",
                },
                side: {
                  type: "string",
                  description: "Side: 'YES' or 'NO' (default: 'YES')",
                  enum: ["YES", "NO"],
                  default: "YES",
                },
              },
              required: ["tokenId"],
            },
          },
          {
            name: "get_order_book",
            description: "Get order book (bids and asks) for a market token",
            inputSchema: {
              type: "object",
              properties: {
                tokenId: {
                  type: "string",
                  description: "The token ID",
                },
              },
              required: ["tokenId"],
            },
          },
          {
            name: "get_popular_markets",
            description: "Get popular/trending markets from Polymarket",
            inputSchema: {
              type: "object",
              properties: {
                limit: {
                  type: "number",
                  description: "Maximum number of markets (default: 20)",
                  default: 20,
                },
              },
            },
          },
          {
            name: "fact_check",
            description: "Fact-check a claim by finding relevant Polymarket markets and analyzing their prices",
            inputSchema: {
              type: "object",
              properties: {
                claim: {
                  type: "string",
                  description: "The claim to fact-check (e.g., 'Will the Fed cut rates by March 2026?')",
                },
              },
              required: ["claim"],
            },
          },
          {
            name: "get_active_events",
            description:
              "Fetch active, tradable events from Gamma (/events?active=true&closed=false).",
            inputSchema: {
              type: "object",
              properties: {
                limit: { type: "number", description: "Max events (default: 20)", default: 20 },
                tag_id: { type: "number", description: "Filter by tag_id (optional)" },
                series_id: { type: "number", description: "Filter by series_id (sports) (optional)" },
                order: {
                  type: "string",
                  description:
                    "Order field (e.g. startTime, volume24hr). Passed through to Gamma if supported.",
                },
                ascending: {
                  type: "boolean",
                  description: "Ascending order (default: false)",
                  default: false,
                },
              },
            },
          },
          {
            name: "get_tags",
            description: "Fetch tags from Gamma (/tags).",
            inputSchema: {
              type: "object",
              properties: {
                limit: { type: "number", description: "Max tags (default: 100)", default: 100 },
              },
            },
          },
          {
            name: "get_sports",
            description: "Fetch sports leagues from Gamma (/sports).",
            inputSchema: { type: "object", properties: {} },
          },
          {
            name: "get_market_by_slug",
            description: "Fetch market details by slug via Gamma (/markets?slug=...).",
            inputSchema: {
              type: "object",
              properties: {
                slug: { type: "string", description: "Market slug (from event/market)" },
              },
              required: ["slug"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "search_markets":
            return await this.searchMarkets(args as { query: string; limit?: number });

          case "get_market":
            return await this.getMarket(args as { marketId: string });

          case "get_price":
            return await this.getPrice(args as { tokenId: string; side?: string });

          case "get_order_book":
            return await this.getOrderBook(args as { tokenId: string });

          case "get_popular_markets":
            return await this.getPopularMarkets(args as { limit?: number });

          case "fact_check":
            return await this.factCheck(args as { claim: string });

          case "get_active_events":
            return await this.getActiveEvents(
              args as {
                limit?: number;
                tag_id?: number;
                series_id?: number;
                order?: string;
                ascending?: boolean;
              }
            );

          case "get_tags":
            return await this.getTags(args as { limit?: number });

          case "get_sports":
            return await this.getSports();

          case "get_market_by_slug":
            return await this.getMarketBySlug(args as { slug: string });

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message || "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async searchMarkets(args: { query: string; limit?: number }) {
    const limit = args.limit || 10;
    const url = `${POLYMARKET_GAMMA_BASE}/markets?limit=${limit}&closed=false&active=true`;

    try {
      const response = await axios.get(url);
      const markets = Array.isArray(response.data) ? response.data : response.data.data || [];

      // Simple text search (in production, use embeddings like in the main app)
      const queryLower = args.query.toLowerCase();
      const filtered = markets.filter((market: any) => {
        const title = (market.question || market.title || "").toLowerCase();
        const description = (market.description || "").toLowerCase();
        return title.includes(queryLower) || description.includes(queryLower);
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                query: args.query,
                results: filtered.slice(0, limit).map((m: any) => ({
                  id: m.id || m.marketId,
                  question: m.question || m.title,
                  description: m.description,
                  slug: m.slug,
                  url: m.url || (m.slug ? `https://polymarket.com/event/${m.slug}` : null),
                  active: m.active,
                  closed: m.closed,
                })),
                count: filtered.length,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to search markets: ${error.message}`);
    }
  }

  private async getMarket(args: { marketId: string }) {
    try {
      const url = `${POLYMARKET_GAMMA_BASE}/markets/${args.marketId}`;
      const response = await axios.get(url);
      const market = response.data;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                id: market.id || market.marketId,
                question: market.question || market.title,
                description: market.description,
                slug: market.slug,
                url: market.url || (market.slug ? `https://polymarket.com/event/${market.slug}` : null),
                active: market.active,
                closed: market.closed,
                endDate: market.endDate || market.endDateISO,
                outcomes: market.outcomes || market.tokens,
                volume: market.volume,
                liquidity: market.liquidity,
                clobTokenIds: market.clobTokenIds,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to get market: ${error.message}`);
    }
  }

  private async getPrice(args: { tokenId: string; side?: string }) {
    try {
      const side = args.side || "YES";
      const priceData = await clobClient.getPrice(args.tokenId, side);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                tokenId: args.tokenId,
                side,
                price: priceData?.price || null,
                bid: priceData?.bid || null,
                ask: priceData?.ask || null,
                spread: priceData?.spread || null,
                timestamp: Date.now(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to get price: ${error.message}`);
    }
  }

  private async getOrderBook(args: { tokenId: string }) {
    try {
      const orderBook = await clobClient.getOrderBook(args.tokenId);

      // Calculate spread from best bid and ask
      const bestBid = orderBook?.bids?.[0]?.price;
      const bestAsk = orderBook?.asks?.[0]?.price;
      const spread =
        typeof bestBid === "number" && typeof bestAsk === "number"
          ? bestAsk - bestBid
          : null;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                tokenId: args.tokenId,
                bids: orderBook?.bids || [],
                asks: orderBook?.asks || [],
                spread,
                timestamp: Date.now(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to get order book: ${error.message}`);
    }
  }

  private async getPopularMarkets(args: { limit?: number }) {
    const limit = args.limit || 20;
    const now = Date.now();
    const url = `${POLYMARKET_GAMMA_BASE}/markets?limit=${limit * 4}&closed=false&active=true`;

    try {
      const response = await axios.get(url);
      const markets = Array.isArray(response.data) ? response.data : response.data.data || [];

      // Sort by volume/liquidity
      const sorted = markets
        // Never include ended markets
        .filter((m: any) => {
          const endDateRaw = m.endDate || m.endDateISO || m.endDateIso || m.endDate_iso;
          if (!endDateRaw) return true;
          const endDateMs = new Date(endDateRaw).getTime();
          return Number.isFinite(endDateMs) ? endDateMs > now : true;
        })
        .map((m: any) => ({
          id: m.id || m.marketId,
          question: m.question || m.title,
          description: m.description,
          slug: m.slug,
          url: m.url || (m.slug ? `https://polymarket.com/event/${m.slug}` : null),
          volume: m.volumeNum || m.volume || m.volumeUSD || 0,
          liquidity: m.liquidityNum || m.liquidity || m.totalLiquidity || 0,
          active: m.active,
          closed: m.closed,
          endDate: m.endDate || m.endDateISO || m.endDate_iso || null,
        }))
        .sort((a: any, b: any) => {
          const volA = typeof a.volume === "string" ? Number.parseFloat(a.volume) : Number(a.volume) || 0;
          const volB = typeof b.volume === "string" ? Number.parseFloat(b.volume) : Number(b.volume) || 0;
          if (volB !== volA) return volB - volA;

          const liqA = typeof a.liquidity === "string" ? Number.parseFloat(a.liquidity) : Number(a.liquidity) || 0;
          const liqB = typeof b.liquidity === "string" ? Number.parseFloat(b.liquidity) : Number(b.liquidity) || 0;
          return liqB - liqA;
        })
        .slice(0, limit);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                markets: sorted,
                count: sorted.length,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to get popular markets: ${error.message}`);
    }
  }

  private async factCheck(args: { claim: string }) {
    try {
      // Search for relevant markets
      const searchResult = await this.searchMarkets({ query: args.claim, limit: 5 });
      const searchData = JSON.parse(searchResult.content[0].text);
      const markets = searchData.results || [];

      if (markets.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  claim: args.claim,
                  result: "No relevant markets found",
                  confidence: 0,
                  markets: [],
                },
                null,
                2
              ),
            },
          ],
          isError: false,
        };
      }

      // Get prices for the best matching market
      const bestMarket = markets[0];
      let priceData = null;

      if (bestMarket.id) {
        try {
          // Try to get market details to find token IDs
          const marketDetails = await this.getMarket({ marketId: bestMarket.id });
          const market = JSON.parse(marketDetails.content[0].text);
          
          if (market.clobTokenIds && market.clobTokenIds.length > 0) {
            const yesTokenId = market.clobTokenIds[0]; // First token is usually YES
            priceData = await this.getPrice({ tokenId: yesTokenId, side: "YES" });
            const price = JSON.parse(priceData.content[0].text);
            priceData = price;
          }
        } catch (error) {
          console.log("Could not get price for market:", error);
        }
      }

      const probYes = priceData?.price || null;
      const confidence = markets.length > 0 ? Math.min(0.9, 0.5 + markets.length * 0.1) : 0;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                claim: args.claim,
                result: probYes !== null
                  ? `Market indicates ${(probYes * 100).toFixed(1)}% probability this is true`
                  : "Found relevant markets but could not get price data",
                confidence,
                probability: probYes,
                bestMarket: {
                  ...bestMarket,
                  price: priceData,
                },
                alternativeMarkets: markets.slice(1, 3),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to fact-check: ${error.message}`);
    }
  }

  private async getActiveEvents(args: {
    limit?: number;
    tag_id?: number;
    series_id?: number;
    order?: string;
    ascending?: boolean;
  }) {
    const limit = args.limit || 20;
    const params = new URLSearchParams();
    params.set("active", "true");
    params.set("closed", "false");
    params.set("limit", String(limit));
    if (typeof args.tag_id === "number") params.set("tag_id", String(args.tag_id));
    if (typeof args.series_id === "number") params.set("series_id", String(args.series_id));
    if (args.order) params.set("order", args.order);
    if (typeof args.ascending === "boolean") params.set("ascending", args.ascending ? "true" : "false");

    const url = `${POLYMARKET_GAMMA_BASE}/events?${params.toString()}`;
    const response = await axios.get(url);
    const events = Array.isArray(response.data) ? response.data : response.data?.data || [];

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              url,
              count: events.length,
              events: events.map((e: any) => ({
                id: e.id,
                title: e.title,
                slug: e.slug,
                active: e.active,
                closed: e.closed,
                volume: e.volume,
                volume24hr: e.volume24hr,
                volume1wk: e.volume1wk,
                marketsCount: Array.isArray(e.markets) ? e.markets.length : 0,
                markets: Array.isArray(e.markets)
                  ? e.markets.slice(0, 2).map((m: any) => ({
                      id: m.id,
                      question: m.question,
                      slug: m.slug,
                      clobTokenIds: m.clobTokenIds,
                      outcomes: m.outcomes,
                      outcomePrices: m.outcomePrices,
                    }))
                  : [],
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getTags(args: { limit?: number }) {
    const limit = args.limit || 100;
    const url = `${POLYMARKET_GAMMA_BASE}/tags?limit=${limit}`;
    const response = await axios.get(url);
    const tags = Array.isArray(response.data) ? response.data : response.data?.data || [];

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              url,
              count: tags.length,
              tags: tags.map((t: any) => ({
                id: t.id,
                label: t.label,
                slug: t.slug,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getSports() {
    const url = `${POLYMARKET_GAMMA_BASE}/sports`;
    const response = await axios.get(url);
    const leagues = Array.isArray(response.data) ? response.data : response.data?.data || [];

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              url,
              count: leagues.length,
              leagues,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getMarketBySlug(args: { slug: string }) {
    const url = `${POLYMARKET_GAMMA_BASE}/markets?slug=${encodeURIComponent(args.slug)}`;
    const response = await axios.get(url);
    const markets = Array.isArray(response.data) ? response.data : response.data?.data || [];
    const market = markets[0] || null;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              url,
              found: !!market,
              market,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Polymarket MCP server running on stdio");
  }
}

const server = new PolymarketMCPServer();
server.run().catch(console.error);

