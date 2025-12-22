# Polymarket MCP Server

A Model Context Protocol (MCP) server that provides access to Polymarket prediction market data.

## Features

- **Search Markets**: Search for markets by query
- **Get Market**: Get detailed information about a specific market
- **Get Price**: Get current prices for market tokens
- **Get Order Book**: Get order book data (bids/asks)
- **Get Popular Markets**: Get trending/popular markets
- **Fact Check**: Fact-check claims using Polymarket data

## Installation

```bash
cd mcp-server
npm install
npm run build
```

## Usage

### As MCP Server

Add to your MCP configuration (e.g., in Cursor settings):

```json
{
  "mcpServers": {
    "polymarket": {
      "command": "node",
      "args": ["path/to/mcp-server/dist/index.js"]
    }
  }
}
```

### Standalone

```bash
npm start
```

## Tools

### search_markets
Search for markets by query string.

**Parameters:**
- `query` (string, required): Search query
- `limit` (number, optional): Max results (default: 10)

### get_market
Get detailed market information.

**Parameters:**
- `marketId` (string, required): Market ID

### get_price
Get current price for a token.

**Parameters:**
- `tokenId` (string, required): Token ID
- `side` (string, optional): "YES" or "NO" (default: "YES")

### get_order_book
Get order book data.

**Parameters:**
- `tokenId` (string, required): Token ID

### get_popular_markets
Get popular/trending markets.

**Parameters:**
- `limit` (number, optional): Max results (default: 20)

### fact_check
Fact-check a claim using Polymarket data.

**Parameters:**
- `claim` (string, required): The claim to fact-check

## Example

```typescript
// Search for markets
{
  "tool": "search_markets",
  "arguments": {
    "query": "Will Trump win 2024?",
    "limit": 5
  }
}

// Fact-check a claim
{
  "tool": "fact_check",
  "arguments": {
    "claim": "The Fed will cut rates by March 2026"
  }
}
```


