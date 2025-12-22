"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const internalApi = internal as {
  actions: {
    ingestMarkets: { ingestMarkets: any };
  };
};

interface IngestResult {
  processed: number;
  nextCursor: string | null;
  done: boolean;
  error?: string;
  skipped?: number;
  skipReasons?: Record<string, number>;
}

interface BulkIngestResult {
  totalProcessed: number;
  totalSkipped: number;
  batches: number;
  errors: string[];
  duration: number;
}

/**
 * Bulk ingestion that processes all available markets
 * Continues until no more markets are available
 */
export const bulkIngest = action({
  args: {
    maxBatches: v.optional(v.number()), // Maximum number of batches to process (default: unlimited)
    batchSize: v.optional(v.number()), // Markets per batch (default: 1000)
  },
  handler: async (ctx, args): Promise<BulkIngestResult> => {
    const startTime = Date.now();
    const maxBatches = args.maxBatches || 1000; // Process up to 1000 batches (1M markets)
    const batchSize = args.batchSize || 1000;
    
    let totalProcessed = 0;
    let totalSkipped = 0;
    let batches = 0;
    const errors: string[] = [];
    let cursor: string | null = null;
    let done = false;

    console.log(`[bulkIngest] Starting bulk ingestion: maxBatches=${maxBatches}, batchSize=${batchSize}`);

    while (!done && batches < maxBatches) {
      try {
        console.log(`[bulkIngest] Processing batch ${batches + 1}/${maxBatches}...`);
        
        const result: IngestResult = await ctx.runAction(internalApi.actions.ingestMarkets.ingestMarkets, {
          cursor,
          limit: batchSize,
        });

        totalProcessed += result.processed || 0;
        totalSkipped += result.skipped || 0;
        batches++;
        cursor = result.nextCursor || null;
        done = result.done || false;

        console.log(`[bulkIngest] Batch ${batches} complete: processed=${result.processed}, skipped=${result.skipped}, nextCursor=${cursor ? 'yes' : 'no'}`);

        // If we processed fewer markets than requested, we're likely done
        if (result.processed < batchSize) {
          console.log(`[bulkIngest] Processed fewer markets than batch size, likely done`);
          done = true;
        }

        // Small delay between batches to avoid rate limiting
        if (!done && cursor) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        console.error(`[bulkIngest] Error in batch ${batches + 1}:`, errorMsg);
        errors.push(`Batch ${batches + 1}: ${errorMsg}`);
        
        // Continue with next batch even if one fails
        if (cursor) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          done = true;
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[bulkIngest] Bulk ingestion complete: processed=${totalProcessed}, skipped=${totalSkipped}, batches=${batches}, duration=${duration}ms`);

    return {
      totalProcessed,
      totalSkipped,
      batches,
      errors,
      duration,
    };
  },
});

/**
 * Continuous ingestion that runs until stopped
 * Useful for initial data population
 */
export const continuousIngest = action({
  args: {
    batchSize: v.optional(v.number()),
    maxDuration: v.optional(v.number()), // Maximum duration in milliseconds (default: 1 hour)
  },
  handler: async (ctx, args): Promise<BulkIngestResult> => {
    const startTime = Date.now();
    const batchSize = args.batchSize || 1000;
    const maxDuration = args.maxDuration || 60 * 60 * 1000; // 1 hour default
    
    let totalProcessed = 0;
    let totalSkipped = 0;
    let batches = 0;
    const errors: string[] = [];
    let cursor: string | null = null;
    let done = false;

    console.log(`[continuousIngest] Starting continuous ingestion: batchSize=${batchSize}, maxDuration=${maxDuration}ms`);

    while (!done && (Date.now() - startTime) < maxDuration) {
      try {
        const result: IngestResult = await ctx.runAction(internalApi.actions.ingestMarkets.ingestMarkets, {
          cursor,
          limit: batchSize,
        });

        totalProcessed += result.processed || 0;
        totalSkipped += result.skipped || 0;
        batches++;
        cursor = result.nextCursor || null;
        done = result.done || false;

        console.log(`[continuousIngest] Batch ${batches}: processed=${result.processed}, total=${totalProcessed}`);

        if (result.processed < batchSize) {
          done = true;
        }

        // Small delay between batches
        if (!done && cursor) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        console.error(`[continuousIngest] Error:`, errorMsg);
        errors.push(`Batch ${batches + 1}: ${errorMsg}`);
        
        // Wait longer on error before retrying
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        if (!cursor) {
          done = true;
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[continuousIngest] Complete: processed=${totalProcessed}, skipped=${totalSkipped}, batches=${batches}, duration=${duration}ms`);

    return {
      totalProcessed,
      totalSkipped,
      batches,
      errors,
      duration,
    };
  },
});

