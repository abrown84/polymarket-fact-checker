# Polymarket MCP Server Setup

## Quick Start

1. **Install dependencies:**
   ```bash
   cd mcp-server
   npm install
   ```

2. **Build the server:**
   ```bash
   npm run build
   ```

3. **Configure MCP in Cursor:**

   Add to your Cursor MCP settings (usually in `.cursor/mcp.json` or Cursor settings):

   ```json
   {
     "mcpServers": {
       "polymarket": {
         "command": "node",
         "args": ["C:\\Users\\alexb\\Desktop\\Programming\\Apps\\polymarket-fact-checker\\mcp-server\\dist\\index.js"]
       }
     }
   }
   ```

   **Note:** Update the path to match your actual project location.

4. **Restart Cursor** to load the MCP server.

## Testing

You can test the server manually:

```bash
# In development mode (auto-reloads on changes)
npm run dev

# Or run the built version
npm start
```

## Available Tools

Once configured, you can use these tools in Cursor:

- **search_markets**: Search for markets by query
- **get_market**: Get detailed market information
- **get_price**: Get current token prices
- **get_order_book**: Get order book data
- **get_popular_markets**: Get trending markets
- **fact_check**: Fact-check claims using Polymarket data

## Example Usage

In Cursor, you can now ask:

- "Search Polymarket for markets about the 2024 election"
- "What's the current price for market [market-id]?"
- "Fact-check: Will the Fed cut rates by March 2026?"

The MCP server will handle these requests and return structured data.




