import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

// Public actions scheduled via `api` (same cast pattern as the rest of the repo).
const apiRef = api as {
  actions: {
    marketMaintenance: {
      incrementalIngest: any;
      healEmbeddings: any;
    };
  };
};

const crons = cronJobs();

/**
 * Crawl Polymarket Gamma in small offset pages (metadata only).
 * Recent updates are also pulled each tick. Embeddings are healed separately.
 */
crons.interval(
  "incremental-market-ingest",
  { minutes: 15 },
  apiRef.actions.marketMaintenance.incrementalIngest,
  {}
);

/**
 * Re-embed missing / mismatched markets in tiny batches through One Gateway.
 * ~1 batch API call per tick (up to 8 texts). Budgets default to 4/min and
 * 150/day (HEAL_MINUTE_CALL_BUDGET / HEAL_DAILY_CALL_BUDGET) so we don't
 * starve other apps sharing the gateway's global ~500/day cap.
 */
crons.interval(
  "heal-embeddings",
  { minutes: 1 },
  apiRef.actions.marketMaintenance.healEmbeddings,
  {}
);

export default crons;
