# Polymarket Fact Checker

An AI-first MVP that converts questions into checkable claims and retrieves evidence from Polymarket prediction markets.

## Features

- **Question Parsing**: Converts natural language questions into structured, checkable claims using OpenAI
- **Market Retrieval**: Uses embeddings to find relevant Polymarket markets
- **AI Reranking**: Reranks candidates for exact match using GPT-4
- **Evidence Grounding**: Fetches real-time market data (prices, spreads, volume) from Polymarket
- **Confidence Scoring**: Computes confidence based on match quality, volume, spread, and recency
- **Beautiful UI**: Modern React UI with TailwindCSS, Radix UI, and Framer Motion

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: TailwindCSS + Radix UI + Framer Motion
- **Backend**: Convex (queries/mutations/actions + scheduler)
- **AI**: OpenAI (embeddings + chat completions with structured outputs)
- **Data Source**: Polymarket (Gamma API for metadata + CLOB API for prices/order book)
- **Hosting**: Vercel

## Setup

### Prerequisites

- Node.js 18+ and npm
- Convex account (sign up at [convex.dev](https://convex.dev))
- OpenAI API key
- Vercel account (for deployment)

### 1. Install Dependencies

```bash
npm install
cd client && npm install
```

### 2. Set Up Convex

```bash
# Install Convex CLI globally if not already installed
npm install -g convex

# Login to Convex
npx convex login

# Initialize Convex project (if not already initialized)
npx convex dev
```

This will create a `convex.json` file. Note your deployment URL.

### 3. Configure Environment Variables

#### Client (`.env` in `client/` directory)

```env
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

#### Server (Convex Dashboard)

Go to your Convex dashboard → Settings → Environment Variables and add:

```env
OPENAI_API_KEY=sk-...
OPENAI_EMBED_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o-mini
POLYMARKET_GAMMA_BASE=https://gamma-api.polymarket.com
POLYMARKET_CLOB_BASE=https://clob.polymarket.com
APP_PUBLIC_BASE_URL=http://localhost:5173
```

**IMPORTANT**: Never commit API keys. The `OPENAI_API_KEY` must only be set in Convex (server-side), never in client code.

### 4. Generate Convex API Types

After setting up Convex, the API types will be auto-generated. Make sure to run:

```bash
npx convex dev
```

This will generate the `_generated/api` files needed for type-safe Convex calls.

### 5. Run Locally

```bash
# Terminal 1: Run Convex dev server (this also generates API types)
npm run dev:convex

# Terminal 2: Run Vite dev server
npm run dev:client
```

The app will be available at `http://localhost:5173`.

### 6. Initial Market Ingestion

Before using the app, you need to ingest markets from Polymarket:

1. Go to your Convex dashboard
2. Navigate to Functions → Actions → `ingestMarkets`
3. Run it manually with `{ cursor: null }` to start ingestion
4. The scheduler will continue ingesting markets every 6 hours

Alternatively, you can trigger ingestion via the Convex dashboard or by calling the action programmatically.

## Project Structure

```
polymarket-fact-checker/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── App.tsx         # Main app component
│   │   └── main.tsx        # Entry point
│   ├── package.json
│   └── vite.config.ts
├── convex/                 # Convex backend
│   ├── actions/            # Server actions
│   │   ├── aiEmbed.ts      # Embedding generation
│   │   ├── aiParseClaim.ts # Question parsing
│   │   ├── aiRerank.ts     # Market reranking
│   │   ├── factCheck.ts    # Main orchestrator
│   │   ├── ingestMarkets.ts # Market ingestion
│   │   ├── polymarket.ts   # Polymarket API integration
│   │   └── retrieveCandidates.ts # Embedding retrieval
│   ├── mutations.ts        # Database mutations
│   ├── queries.ts          # Database queries
│   ├── schema.ts           # Database schema
│   ├── cron.ts             # Scheduled jobs
│   └── utils.ts             # Utility functions
├── package.json
└── README.md
```

## How It Works

### 1. Question → Claim Parsing

When a user asks a question, the system:
- Uses OpenAI to parse the question into a structured claim
- Extracts entities, time windows, and ambiguities
- Falls back to simple heuristics if OpenAI fails

### 2. Market Retrieval

- Builds a retrieval text from the parsed claim
- Embeds it using OpenAI embeddings
- Computes cosine similarity to all market embeddings
- Returns top 50 candidates

### 3. AI Reranking

- Uses GPT-4 to compare the claim to each candidate market
- Scores exactness (0-1) based on entities, timeframes, and question focus
- Flags mismatches (wrong timeframe, different entity, etc.)

### 4. Evidence Fetching

For top 10 reranked markets:
- Fetches order book and prices from Polymarket CLOB API
- Extracts YES probability, spread, volume, liquidity
- Caches results (30s for prices, 6h for market list)

### 5. Confidence Calculation

```
confidence = 0.55 * matchScore +
             0.20 * volumeScore +
             0.15 * spreadScore +
             0.10 * recencyScore
```

### 6. Answer Generation

- Generates evidence-grounded summary using OpenAI
- Uses ONLY provided evidence fields (no hallucination)
- Returns probability, confidence, and top alternatives

## Caching Strategy

- **Gamma market list**: 6 hours
- **Per-market book/price**: 30 seconds
- **Per-market trades**: 2 minutes
- **Embeddings**: Forever (cached by hash)

## Scheduler

The Convex scheduler runs:
- **Every 6 hours**: Ingest new/updated markets from Polymarket
- **Every 2 minutes**: Refresh "hot markets" (markets from recent queries)

## Deployment

### Deploy to Vercel

1. **Deploy Convex backend**:
   ```bash
   npx convex deploy
   ```

2. **Update client env var**:
   - Set `VITE_CONVEX_URL` in Vercel dashboard (Environment Variables)

3. **Deploy frontend**:
   ```bash
   cd client
   vercel deploy
   ```

   Or connect your GitHub repo to Vercel for automatic deployments.

### Vercel Configuration

Create `vercel.json` in the root:

```json
{
  "buildCommand": "cd client && npm run build",
  "outputDirectory": "client/dist",
  "devCommand": "cd client && npm run dev",
  "installCommand": "npm install && cd client && npm install"
}
```

## Testing

Run unit tests:

```bash
cd convex
npm test
```

Tests cover:
- Cosine similarity calculation
- Confidence calculation
- Zod schema validation

## Known Limitations

1. **Brute-force similarity**: For MVP, we compute cosine similarity against all embeddings. For >20k markets, consider using a proper ANN index (e.g., Pinecone, Weaviate, or Convex vector search when available).

2. **Market mapping**: The Gamma API response structure may vary. Adjust field extraction in `ingestMarkets.ts` based on actual API responses.

3. **Binary markets only**: Currently optimized for Yes/No markets. Multi-outcome markets need additional handling.

4. **Rate limiting**: Basic per-IP throttling via cache keys. For production, implement proper rate limiting.

5. **Error handling**: Some Polymarket API endpoints may not be available. The system gracefully handles failures but may return partial data.

## Next Improvements

- [ ] Proper ANN index for vector search (Pinecone/Weaviate)
- [ ] Better market mapping and field extraction
- [ ] Support for multi-outcome markets
- [ ] User authentication and query history
- [ ] Alerts for market updates
- [ ] Batch processing for large-scale ingestion
- [ ] Analytics dashboard
- [ ] API rate limiting and quotas

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
