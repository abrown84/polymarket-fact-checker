# Polymarket MCP Server (Python)

This is an **optional** Python MCP server that uses `py_clob_client` with your **authenticated** Polymarket CLOB credentials (`KEY`, `FUNDER`).

It lives alongside the existing Node server in `mcp-server/`.

## Setup (Windows)

1. Create a virtualenv and install deps:

```bash
cd mcp-server-python
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
```

2. Set env vars in `mcp-server-python/env.local` (kept out of git):

- `CLOB_HOST` (optional, defaults to `https://clob.polymarket.com`)
- `KEY` (private key from Polymarket UI)
- `FUNDER` (funder address from Polymarket UI)

3. Run:

```bash
python server.py
```

## Cursor MCP config example

Add a server entry (adjust the paths). If you also want the **existing public Node server**, use the combined example in `mcp-server/mcp-config.example.json`.

```json
{
  "mcpServers": {
    "polymarket_python": {
      "command": "C:\\\\Users\\\\alexb\\\\Desktop\\\\Programming\\\\Apps\\\\polymarket-fact-checker\\\\mcp-server-python\\\\.venv\\\\Scripts\\\\python.exe",
      "args": [
        "C:\\\\Users\\\\alexb\\\\Desktop\\\\Programming\\\\Apps\\\\polymarket-fact-checker\\\\mcp-server-python\\\\server.py"
      ]
    }
  }
}
```

