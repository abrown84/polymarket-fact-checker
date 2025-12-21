"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const internalApi = internal as {
  queries: {
    getAllMarkets: any;
  };
  mutations: {
    deleteMarket: any;
    deleteEmbedding: any;
  };
};

/**
 * Clean up old/expired markets from the database
 */
export const cleanupOldMarkets = action({
  args: {
    deleteExpired: v.optional(v.boolean()), // Delete markets with endDate in the past
    deleteOlderThanDays: v.optional(v.number()), // Delete markets not updated in X days
    dryRun: v.optional(v.boolean()), // If true, just report what would be deleted
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const deleteExpired = args.deleteExpired !== false; // Default to true
    const deleteOlderThanDays = args.deleteOlderThanDays || 90; // Default to 90 days
    const dryRun = args.dryRun === true;

    console.log(`[cleanupOldMarkets] Starting cleanup (dryRun: ${dryRun})`);
    
    // Get all markets
    const allMarkets = await ctx.runQuery(internalApi.queries.getAllMarkets);
    console.log(`[cleanupOldMarkets] Found ${allMarkets.length} total markets`);

    const marketsToDelete: Array<{ id: string; reason: string; title: string }> = [];
    const embeddingsToDelete: string[] = [];

    for (const market of allMarkets) {
      let shouldDelete = false;
      let reason = "";

      // Check if expired
      if (deleteExpired && market.endDate && market.endDate < now) {
        shouldDelete = true;
        reason = `expired (ended ${new Date(market.endDate).toISOString()})`;
      }
      
      // Check if not updated in a long time
      const daysSinceUpdate = (now - market.lastIngestedAt) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate > deleteOlderThanDays) {
        shouldDelete = true;
        reason = reason 
          ? `${reason}, not updated in ${daysSinceUpdate.toFixed(0)} days`
          : `not updated in ${daysSinceUpdate.toFixed(0)} days`;
      }

      if (shouldDelete) {
        marketsToDelete.push({
          id: market._id,
          reason,
          title: market.title,
        });
        
        // Also mark embedding for deletion
        embeddingsToDelete.push(market.polymarketMarketId);
      }
    }

    console.log(`[cleanupOldMarkets] Found ${marketsToDelete.length} markets to delete`);
    console.log(`[cleanupOldMarkets] Found ${embeddingsToDelete.length} embeddings to delete`);

    if (dryRun) {
      return {
        dryRun: true,
        marketsToDelete: marketsToDelete.length,
        embeddingsToDelete: embeddingsToDelete.length,
        details: marketsToDelete.slice(0, 10).map(m => ({
          title: m.title,
          reason: m.reason,
        })),
        message: `Would delete ${marketsToDelete.length} markets and ${embeddingsToDelete.length} embeddings`,
      };
    }

    // Actually delete markets and embeddings
    let deletedMarkets = 0;
    let deletedEmbeddings = 0;
    let errors = 0;

    for (const market of marketsToDelete) {
      try {
        await ctx.runMutation(internalApi.mutations.deleteMarket, {
          marketId: market.id,
        });
        deletedMarkets++;
      } catch (error: any) {
        console.error(`[cleanupOldMarkets] Error deleting market ${market.id}:`, error);
        errors++;
      }
    }

    for (const marketId of embeddingsToDelete) {
      try {
        await ctx.runMutation(internalApi.mutations.deleteEmbedding, {
          polymarketMarketId: marketId,
        });
        deletedEmbeddings++;
      } catch (error: any) {
        console.error(`[cleanupOldMarkets] Error deleting embedding for ${marketId}:`, error);
        errors++;
      }
    }

    return {
      dryRun: false,
      deletedMarkets,
      deletedEmbeddings,
      errors,
      message: `Deleted ${deletedMarkets} markets and ${deletedEmbeddings} embeddings${errors > 0 ? ` (${errors} errors)` : ""}`,
    };
  },
});

