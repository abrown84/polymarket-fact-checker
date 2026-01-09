import asyncio
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from mcp.server import NotificationOptions, Server
from mcp.server.models import InitializationOptions
import mcp.server.stdio
import mcp.types as types
from py_clob_client.client import ClobClient
from py_clob_client.constants import POLYGON

# Load environment variables (KEY, FUNDER, etc.)
# Prefer local file in this folder: env.local (kept out of git).
_env_path = Path(__file__).with_name("env.local")
if _env_path.exists():
    # IMPORTANT: Cursor MCP config may pass KEY/FUNDER as empty strings.
    # dotenv won't override existing env vars by default, so force override here.
    load_dotenv(dotenv_path=_env_path, override=True)
else:
    # Fallback to default .env lookup behavior
    load_dotenv(override=True)

server = Server("polymarket_predictions")


def get_clob_client() -> ClobClient:
    host = os.getenv("CLOB_HOST", "https://clob.polymarket.com")
    key = os.getenv("KEY")  # Private key exported from polymarket UI
    funder = os.getenv("FUNDER")  # Funder address from polymarket UI

    if not key or not funder:
        raise RuntimeError(
            "Missing KEY or FUNDER. Set them in your environment (see mcp-server-python/env.local)."
        )

    client = ClobClient(
        host,
        key=key,
        chain_id=POLYGON,
        funder=funder,
        signature_type=1,
    )
    client.set_api_creds(client.create_or_derive_api_creds())
    return client


@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="get-market-info",
            description="Get detailed information about a specific prediction market",
            inputSchema={
                "type": "object",
                "properties": {
                    "market_id": {"type": "string", "description": "Market ID or slug"},
                },
                "required": ["market_id"],
            },
        ),
        types.Tool(
            name="list-markets",
            description="Get a list of prediction markets with optional filters",
            inputSchema={
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "description": "Filter by market status (e.g., active, resolved)",
                        "enum": ["active", "resolved"],
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Number of markets to return (default: 10)",
                        "default": 10,
                        "minimum": 1,
                        "maximum": 100,
                    },
                    "offset": {
                        "type": "integer",
                        "description": "Number of markets to skip (for pagination)",
                        "default": 0,
                        "minimum": 0,
                    },
                },
            },
        ),
        types.Tool(
            name="get-market-prices",
            description="Get current prices and trading information for a market",
            inputSchema={
                "type": "object",
                "properties": {
                    "market_id": {"type": "string", "description": "Market ID or slug"},
                },
                "required": ["market_id"],
            },
        ),
        types.Tool(
            name="get-market-history",
            description="Get historical price and volume data for a market",
            inputSchema={
                "type": "object",
                "properties": {
                    "market_id": {"type": "string", "description": "Market ID or slug"},
                    "timeframe": {
                        "type": "string",
                        "description": "Time period for historical data",
                        "enum": ["1d", "7d", "30d", "all"],
                        "default": "7d",
                    },
                },
                "required": ["market_id"],
            },
        ),
    ]


def format_market_info(market_data: dict) -> str:
    if not market_data or not isinstance(market_data, dict):
        return "No market information available"

    condition_id = market_data.get("condition_id", "N/A")
    title = market_data.get("title", "N/A")
    status = market_data.get("status", "N/A")
    resolution_date = market_data.get("resolution_date", "N/A")

    return (
        f"Condition ID: {condition_id}\n"
        f"Title: {title}\n"
        f"Status: {status}\n"
        f"Resolution Date: {resolution_date}\n"
        "---"
    )


def format_market_list(markets_data: list) -> str:
    if not markets_data:
        return "No markets available"

    formatted_markets = ["Available Markets:\n"]
    for market in markets_data:
        try:
            volume = float(market.get("volume", 0))
            volume_str = f"${volume:,.2f}"
        except (ValueError, TypeError):
            volume_str = f"${market.get('volume', 0)}"

        formatted_markets.append(
            f"Condition ID: {market.get('condition_id', 'N/A')}\n"
            f"Description: {market.get('description', 'N/A')}\n"
            f"Category: {market.get('category', 'N/A')}\n"
            f"Tokens: {market.get('question', 'N/A')}\n"
            f"Question: {market.get('active', 'N/A')}\n"
            f"Rewards: {market.get('rewards', 'N/A')}\n"
            f"Active: {market.get('active', 'N/A')}\n"
            f"Closed: {market.get('closed', 'N/A')}\n"
            f"Slug: {market.get('market_slug', 'N/A')}\n"
            f"Min Incentive size: {market.get('min_incentive_size', 'N/A')}\n"
            f"Max Incentive size: {market.get('max_incentive_spread', 'N/A')}\n"
            f"End date: {market.get('end_date_iso', 'N/A')}\n"
            f"Start time: {market.get('game_start_time', 'N/A')}\n"
            f"Min order size: {market.get('minimum_order_size', 'N/A')}\n"
            f"Max tick size: {market.get('minimum_tick_size', 'N/A')}\n"
            f"Volume: {volume_str}\n"
            "---\n"
        )

    return "\n".join(formatted_markets)


def format_market_prices(market_data: dict) -> str:
    if not market_data or not isinstance(market_data, dict):
        return str(market_data)

    formatted_prices = [f"Current Market Prices for {market_data.get('title', 'Unknown Market')}\n"]
    current_price = market_data.get("current_price", "N/A")
    formatted_prices.append(f"Current Price: {current_price}\n---\n")
    return "\n".join(formatted_prices)


def format_market_history(history_data: dict) -> str:
    if not history_data or not isinstance(history_data, dict):
        return "No historical data available"

    formatted_history = [f"Historical Data for {history_data.get('title', 'Unknown Market')}\n"]
    for point in history_data.get("history", [])[-5:]:
        formatted_history.append(
            f"Time: {point.get('timestamp', 'N/A')}\n"
            f"Price: {point.get('price', 'N/A')}\n"
            "---\n"
        )
    return "\n".join(formatted_history)


@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict | None
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    if not arguments:
        return [types.TextContent(type="text", text="Missing arguments for the request")]

    try:
        client = get_clob_client()

        if name == "get-market-info":
            market_id = arguments.get("market_id")
            if not market_id:
                return [types.TextContent(type="text", text="Missing market_id parameter")]

            market_data = client.get_market(market_id)
            return [types.TextContent(type="text", text=format_market_info(market_data))]

        if name == "list-markets":
            status = arguments.get("status")
            markets_data = client.get_markets()

            if isinstance(markets_data, str):
                try:
                    markets_data = json.loads(markets_data)
                except json.JSONDecodeError:
                    return [types.TextContent(type="text", text="Error: Invalid response format from API")]

            if not isinstance(markets_data, list):
                if isinstance(markets_data, dict) and "data" in markets_data:
                    markets_data = markets_data["data"]
                else:
                    return [types.TextContent(type="text", text="Error: Unexpected response format from API")]

            if status:
                markets_data = [
                    market
                    for market in markets_data
                    if isinstance(market, dict)
                    and market.get("status", "").lower() == status.lower()
                ]

            offset = arguments.get("offset", 0)
            limit = arguments.get("limit", 10)
            markets_data = markets_data[offset : offset + limit]
            return [types.TextContent(type="text", text=format_market_list(markets_data))]

        if name == "get-market-prices":
            market_id = arguments.get("market_id")
            if not market_id:
                return [types.TextContent(type="text", text="Missing market_id parameter")]

            market_data = client.get_market(market_id)
            return [types.TextContent(type="text", text=format_market_prices(market_data))]

        if name == "get-market-history":
            market_id = arguments.get("market_id")
            if not market_id:
                return [types.TextContent(type="text", text="Missing market_id parameter")]

            # Placeholder: py_clob_client may not expose historical data directly here.
            market_data = client.get_market(market_id)
            return [types.TextContent(type="text", text=format_market_history(market_data))]

        return [types.TextContent(type="text", text=f"Unknown tool: {name}")]
    except Exception as e:
        return [types.TextContent(type="text", text=f"Error executing tool: {str(e)}")]


async def main() -> None:
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="polymarket_predictions",
                server_version="0.1.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )


if __name__ == "__main__":
    asyncio.run(main())

