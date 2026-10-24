# Polymarket Fact Checker

An AI-first MVP that converts questions into checkable claims and retrieves evidence from Polymarket prediction markets.

## Features

- **Question Parsing**: Converts natural language questions into structured, checkable claims via One Gateway
- **Market Retrieval**: Uses Gemini embeddings to find relevant Polymarket markets
- **AI Reranking**: Reranks candidates for exact match via One Gateway
- **Evidence Grounding**: Fetches real-time market data (prices, spreads, volume) from Polymarket
- **Confidence Scoring**: Computes confidence based on match quality, volume, spread, and recency
- **Beautiful UI**: Modern React UI with TailwindCSS, Radix UI, and Framer Motion

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: TailwindCSS + Radix UI + Framer Motion
- **Backend**: Convex (queries/mutations/actions + scheduler)
- **Chat**: [One Gateway](https://github.com/abrown84/one-gateway) — OpenAI-compatible client against your gateway (`ONE_GATEWAY_URL` → `/v1/chat/completions`). Default model: `gemini-3.8-flash`
- **Embeddings**: Google Gemini via `@google/genai` (`gemini-embedding-2`) — One Gateway has no embeddings API
- **Data Source**: Polymarket (Gamma API for metadata + CLOB API for prices/order book)
- **Hosting**: Vercel + Convex

## Setup

### Prerequisites

- Node.js 18+ and npm
- Convex account (sign up at [convex.dev](https://convex.dev))
- A running [One Gateway](https://github.com/abrown84/one-gateway) / OpenClaw gateway (HTTPS URL reachable from Convex)
- [Gemini API key](https://aistudio.google.com/apikey) for embeddings
- Vercel account (for deployment)

### 1. Install Dependencies

```bash
npm install
# Root `npm run build` also installs and builds the client
```

### 2. Set Up Convex

```bash
npm install -g convex
npx convex login
npx convex dev
```

### 3. Configure Environment Variables

See `.env.example` for the full list.

#### Client (Vercel / `client/.env`)

```env
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

#### Convex (Settings → Environment Variables) — required for AI

```env
# Chat via One Gateway (OpenAI-compatible)
ONE_GATEWAY_TOKEN=...
ONE_GATEWAY_URL=https://your-gateway.example.com
ONE_GATEWAY_MODEL=gemini-3.8-flash

# Embeddings via Gemini (One Gateway does not support embeddings)
GEMINI_API_KEY=...
GEMINI_EMBED_MODEL=gemini-embedding-2

POLYMARKET_GAMMA_BASE=https://gamma-api.polymarket.com
POLYMARKET_CLOB_BASE=https://clob.polymarket.com
APP_PUBLIC_BASE_URL=https://your-app.vercel.app
```

Optional: `ONE_GATEWAY_AGENT`, `ONE_GATEWAY_FALLBACKS`, `ONE_GATEWAY_TEMPERATURE`, `ONE_GATEWAY_MAX_TOKENS`, `ONE_GATEWAY_TIMEOUT_MS`, `GEMINI_EMBED_DIMENSIONS` (`768` / `1536` / `3072`).

Legacy aliases still work: `OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_BASE_URL`, `OPENCLAW_CHAT_MODEL`, `GEMINI_CHAT_MODEL`.

**IMPORTANT**: Never commit API keys. Gateway token and `GEMINI_API_KEY` belong in Convex (and optionally the Node `server/`), never in client code.

#### Gateway host (before deploy)

On the machine running OpenClaw / One Gateway:

1. Ensure the gateway is reachable over **HTTPS** from the public internet (Convex actions cannot call `localhost`).
2. Confirm `gateway.auth.token` matches `ONE_GATEWAY_TOKEN`.
3. Ensure the model id in `ONE_GATEWAY_MODEL` (default `gemini-3.8-flash`) is routed/available on that gateway.
4. Do **not** point Convex at `one-gateway/serve`’s `/api/chat` — that hardened proxy is for browser frontends with fixed `appId` system prompts. This app’s Convex actions use the OpenAI-compatible `/v1/chat/completions` path (same protocol as the `one-gateway` npm client).

#### Embedding re-index

Gemini `gemini-embedding-2` defaults to **3072** dimensions (OpenAI `text-embedding-3-small` was **1536**). Cosine similarity skips mismatched vectors. After changing embed model/dimensions, re-run ingestion:

```bash
npx convex run actions/ingestMarkets:ingestMarkets '{"cursor":null}'
```

### 4. Generate Convex API Types

```bash
npx convex dev
```

### 5. Run Locally

```bash
# Terminal 1
npm run dev:convex

# Terminal 2
npm run dev:client
```

App: `http://localhost:5173`.

### 6. Initial Market Ingestion

Run `ingestMarkets` with `{ cursor: null }` from the Convex dashboard (or CLI). The scheduler continues every 6 hours.

## Project Structure

```
polymarket-fact-checker/
├── client/                 # React frontend
├── convex/                 # Convex backend
│   ├── actions/
│   │   ├── oneGateway.ts   # Chat via One Gateway (OpenAI-compatible)
│   │   ├── gemini.ts       # Embeddings via @google/genai
│   │   ├── aiEmbed.ts
│   │   ├── aiParseClaim.ts
│   │   ├── aiRerank.ts
│   │   ├── factCheck.ts
│   │   └── ...
│   ├── mutations.ts
│   ├── queries.ts
│   ├── schema.ts
│   └── cron.ts
├── .env.example
├── package.json
└── README.md
```

## How It Works

1. **Claim parsing** — One Gateway chat (`gemini-3.8-flash` by default)
2. **Market retrieval** — Gemini embeddings + cosine similarity
3. **Reranking / answer generation** — One Gateway chat
4. **Evidence** — Polymarket CLOB prices, news/social when configured

## Build

```bash
npm run build
```

Installs `client/` dependencies if needed, then runs the Vite production build.

## Deployment

1. Deploy Convex: `npx convex deploy`
2. Set Convex env vars (`ONE_GATEWAY_*`, `GEMINI_API_KEY`, …)
3. Set Vercel env: `VITE_CONVEX_URL`
4. Deploy frontend (GitHub → Vercel or `cd client && vercel deploy`)
5. Re-run market ingestion if embeddings changed

`vercel.json` already installs root + client deps and builds the client.

## Testing

```bash
npx convex run actions/testConnections:testConnections
```

## Known Limitations

1. Brute-force similarity over all embeddings (consider ANN for >20k markets).
2. Binary markets optimized; multi-outcome needs more work.
3. Embedding model/dimension changes require re-ingestion.
4. Convex must reach a **public HTTPS** gateway URL — local `127.0.0.1` only works for local Convex/dev.

## License

MIT

---

Built by [Brown Industries](https://brwnindustries.com) · [Book an AI Ops Audit](https://brwnindustries.com/ai-ops)
