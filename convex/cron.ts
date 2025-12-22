import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

// Type-safe internal API references
const internalApi = internal as {
  actions: {
    ingestMarkets: { ingestMarkets: any; refreshHotMarkets: any };
  };
};

const crons = cronJobs();

// Ingest markets every 6 hours
// Process 1000 markets per run (will continue with cursor if more available)
crons.interval(
  "ingest-markets",
  { hours: 6 },
  internalApi.actions.ingestMarkets.ingestMarkets,
  { cursor: null, limit: 1000 }
);

// Additional frequent ingestion for new markets (every 2 hours)
crons.interval(
  "ingest-markets-frequent",
  { hours: 2 },
  internalApi.actions.ingestMarkets.ingestMarkets,
  { cursor: null, limit: 1000 }
);

// Refresh hot markets every 2 minutes (markets that appeared in last 50 queries)
// Note: This requires the refreshHotMarkets action to be implemented
// crons.interval(
//   "refresh-hot-markets",
//   { minutes: 2 },
//   internalApi.actions.ingestMarkets.refreshHotMarkets,
//   {}
// );

export default crons;
