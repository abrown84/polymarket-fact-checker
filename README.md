# Polymarket Fact Checker

An AI-first MVP that converts questions into checkable claims and retrieves evidence from Polymarket prediction markets.

## Features

- **Question Parsing**: Converts natural language questions into structured, checkable claims via One Gateway
- **Market Retrieval**: Uses One Gateway Gemini embeddings to find relevant Polymarket markets
- **AI Reranking**: Reranks candidates for exact match via One Gateway
- **Evidence Grounding**: Fetches real-time market data (prices, spreads, volume) from Polymarket
- **Confidence Scoring**: Computes confidence based on match quality, volume, spread, and recency
- **Beautiful UI**: Modern React UI with TailwindCSS, Radix UI, and Framer Motion

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: TailwindCSS + Radix UI + Framer Motion
- **Backend**: Convex (queries/mutations/actions + scheduler)
- **AI**: [One Gateway](https://github.com/abrown84/one-gateway) — OpenAI-compatible (`ONE_GATEWAY_URL` → `/v1/...`)
  - Chat: `POST /v1/chat/completions` — default model `gemini-3.8-flash`
  - Embeddings: `POST /v1/embeddings` — Gemini embeddings (`gemini-embedding-2`, **3072** dims)
- **Data Source**: Polymarket (Gamma API for metadata + CLOB API for prices/order book)
- **Hosting**: Vercel + Convex

## Setup

### Prerequisites

- Node.js 18+ and npm
- Convex account (sign up at [convex.dev](https://convex.dev))
- Reachable [One Gateway](https://github.com/abrown84/one-gateway) (default public URL below works; token optional)
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

#### Convex (Settings → Environment Variables)

```env
# All AI via One Gateway (OpenAI-compatible; /v1 appended by client)
ONE_GATEWAY_URL=https://brwnindustries.com/labs/one-gateway
# Optional — Authorization is sent only when set
# ONE_GATEWAY_TOKEN=...
ONE_GATEWAY_MODEL=gemini-3.8-flash
ONE_GATEWAY_EMBED_MODEL=gemini-embedding-2

POLYMARKET_GAMMA_BASE=https://gamma-api.polymarket.com
POLYMARKET_CLOB_BASE=https://clob.polymarket.com
APP_PUBLIC_BASE_URL=https://your-app.vercel.app
```

Optional: `ONE_GATEWAY_AGENT`, `ONE_GATEWAY_FALLBACKS`, `ONE_GATEWAY_TEMPERATURE`, `ONE_GATEWAY_MAX_TOKENS`, `ONE_GATEWAY_TIMEOUT_MS`, `ONE_GATEWAY_EMBED_DIMENSIONS` (default `3072`).

Legacy aliases still work: `OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_BASE_URL`, `OPENCLAW_CHAT_MODEL`, `GEMINI_CHAT_MODEL`, `GEMINI_EMBED_MODEL`, `GEMINI_EMBED_DIMENSIONS`.

**IMPORTANT**: Never commit secrets. If you set `ONE_GATEWAY_TOKEN`, keep it in Convex (and optionally the Node `server/`), never in client code.

#### Gateway host

1. Default URL `https://brwnindustries.com/labs/one-gateway` is public HTTPS and works from Convex without a token.
2. If you self-host, ensure HTTPS reachability from Convex and set `ONE_GATEWAY_URL` (no trailing `/v1`).
3. Set `ONE_GATEWAY_TOKEN` only when the gateway requires `Authorization: Bearer …`.
4. Do **not** point Convex at `one-gateway/serve`’s `/api/chat` — use `/v1/chat/completions` and `/v1/embeddings`.

#### Embeddings (automatic — no manual re-index)

One Gateway Gemini embeddings are **3072** dimensions. Scheduled jobs handle everything:

| Cron | Interval | What it does |
|---|---|---|
| `incremental-market-ingest` | 15 min | Fetches new/updated Polymarket markets (offset crawl + recent `updatedAt` page) |
| `heal-embeddings` | 1 min | Batch-embeds missing/mismatched vectors via One Gateway (~8 texts/call, ≤8 calls/min, ≤450/day) |

Search uses **keyword fallback** for markets not yet re-embedded, so retrieval does not silently drop them. Status: `getIngestStatus` (UI Market Ingestion panel).

Optional manual kick (not required):

```bash
npx convex run actions/marketMaintenance:incrementalIngest
npx convex run actions/marketMaintenance:healEmbeddings
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

### 6. Market ingestion

No manual step. After deploy, crons crawl Polymarket and heal embeddings automatically. Watch progress via the Market Ingestion panel or:

```bash
npx convex run queries:getIngestStatus
```

## Project Structure

```
polymarket-fact-checker/
├── client/                 # React frontend
├── convex/                 # Convex backend
│   ├── actions/
│   │   ├── oneGateway.ts        # Chat + embeddings via One Gateway
│   │   ├── marketMaintenance.ts # Scheduled ingest + healEmbeddings
│   │   ├── aiEmbed.ts
│   │   ├── factCheck.ts
│   │   └── ...
│   ├── mutations.ts
│   ├── queries.ts               # includes getIngestStatus
│   ├── schema.ts                # ingestJobs table
│   └── cron.ts                  # 15m ingest + 1m heal
├── .env.example
├── package.json
└── README.md
```

## How It Works

1. **Claim parsing** — One Gateway chat (`gemini-3.8-flash` by default)
2. **Market retrieval** — One Gateway embeddings (3072-d) + cosine similarity
3. **Reranking / answer generation** — One Gateway chat
4. **Evidence** — Polymarket CLOB prices, news/social when configured

## Build

```bash
npm run build
```

Installs `client/` dependencies if needed, then runs the Vite production build.

## Deployment

1. Deploy Convex: `npx convex deploy`
2. Set Convex env vars (`ONE_GATEWAY_URL` recommended; `ONE_GATEWAY_TOKEN` if required)
3. Set Vercel env: `VITE_CONVEX_URL`
4. Deploy frontend (GitHub → Vercel or `cd client && vercel deploy`)
5. Wait for `heal-embeddings` cron (or kick `healEmbeddings` once) if pending count is high

`vercel.json` already installs root + client deps and builds the client.

## Testing

```bash
npx convex run actions/testConnections:testConnections
```

## Known Limitations

1. Brute-force similarity over all embeddings (consider ANN for >20k markets).
2. Binary markets optimized; multi-outcome needs more work.
3. Embedding heal is rate-limited (~450 gateway embed calls/day); large backlogs drain gradually with keyword fallback in the meantime.
4. Self-hosted gateways must be **public HTTPS** — local `127.0.0.1` only works for local Convex/dev.

## License

MIT

---

Built by [Brown Industries](https://brwnindustries.com) · [Book an AI Ops Audit](https://brwnindustries.com/ai-ops)
