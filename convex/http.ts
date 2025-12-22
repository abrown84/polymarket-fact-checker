import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Type-safe internal API references
const internalApi = internal as {
  actions: {
    ingestMarkets: { ingestMarkets: any };
    bulkIngest: { bulkIngest: any; continuousIngest: any };
  };
};

const http = httpRouter();

// Health check endpoint
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }),
});

// Trigger market ingestion endpoint
http.route({
  path: "/ingest",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : undefined;
      const cursor = url.searchParams.get("cursor") || null;

      const result = await ctx.runAction(internalApi.actions.ingestMarkets.ingestMarkets, {
        cursor,
        limit,
      });

      return new Response(
        JSON.stringify({
          success: true,
          ...result,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Unknown error",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  }),
});

// Bulk ingestion endpoint - processes all available markets
http.route({
  path: "/ingest/bulk",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json().catch(() => ({}));
      const maxBatches = body.maxBatches || 1000;
      const batchSize = body.batchSize || 1000;

      const result = await ctx.runAction(internalApi.actions.bulkIngest.bulkIngest, {
        maxBatches,
        batchSize,
      });

      return new Response(
        JSON.stringify({
          success: true,
          ...result,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Unknown error",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  }),
});

// Continuous ingestion endpoint - runs until max duration
http.route({
  path: "/ingest/continuous",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json().catch(() => ({}));
      const batchSize = body.batchSize || 1000;
      const maxDuration = body.maxDuration || 60 * 60 * 1000; // 1 hour default

      const result = await ctx.runAction(internalApi.actions.bulkIngest.continuousIngest, {
        batchSize,
        maxDuration,
      });

      return new Response(
        JSON.stringify({
          success: true,
          ...result,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Unknown error",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  }),
});

export default http;
