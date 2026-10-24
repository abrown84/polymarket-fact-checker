"use node";

/**
 * Scheduled market maintenance:
 *  - incrementalIngest: crawl Polymarket Gamma in small offset pages (metadata only)
 *  - healEmbeddings: re-embed missing/mismatched markets in tiny batches via One Gateway
 *
 * Rate limits (gateway, approx): ~10 embed API calls / min / IP, ~500 / day global
 * shared with other apps — keep this app's budget modest and configurable.
 * We batch texts into one call (input: string[]).
 *
 * Env:
 *   HEAL_DAILY_CALL_BUDGET   default 150  (API calls/day for this app)
 *   HEAL_MINUTE_CALL_BUDGET  default 4    (API calls/minute for this app)
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  DEFAULT_EMBED_DIMENSIONS,
  DEFAULT_EMBED_MODEL,
  GatewayRateLimitError,
  gatewayEmbedBatch,
  getEmbedDimensions,
  getEmbedModel,
} from "./oneGateway";

const JOB_INGEST = "market_ingest";
const JOB_REEMBED = "reembed";

/** Texts per embeddings HTTP call (gateway accepts string[]). */
const EMBED_BATCH_SIZE = 8;
/** Markets scanned per heal tick while collecting a batch. */
const HEAL_SCAN_PAGE = 40;

const DEFAULT_HEAL_MINUTE_CALL_BUDGET = 4;
const DEFAULT_HEAL_DAILY_CALL_BUDGET = 150;

function parsePositiveInt(
  raw: string | undefined,
  fallback: number
): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Per-minute embed API call budget for this app (default 4). */
export function getHealMinuteCallBudget(
  env: Record<string, string | undefined> = process.env
): number {
  return parsePositiveInt(
    env.HEAL_MINUTE_CALL_BUDGET,
    DEFAULT_HEAL_MINUTE_CALL_BUDGET
  );
}

/**
 * Daily embed API call budget for this app (default 150).
 * Gateway ~500/day is global/shared — do not set this near 500.
 */
export function getHealDailyCallBudget(
  env: Record<string, string | undefined> = process.env
): number {
  return parsePositiveInt(
    env.HEAL_DAILY_CALL_BUDGET,
    DEFAULT_HEAL_DAILY_CALL_BUDGET
  );
}
/** Gamma page size for incremental crawl. */
const INGEST_PAGE_SIZE = 50;
/** Extra "recently updated" page each ingest tick. */
const INGEST_RECENT_SIZE = 25;

const internalApi = internal as {
  queries: {
    getIngestJob: any;
    listMarketsPage: any;
    getEmbedding: any;
    getMarket: any;
  };
  mutations: {
    upsertIngestJob: any;
    upsertMarket: any;
    upsertEmbedding: any;
  };
  actions: {
    polymarket: { fetchGammaMarkets: any };
  };
};

type IngestJobRow = {
  job: string;
  gammaOffset?: number;
  reembedCursor?: string | null;
  embedsThisMinute?: number;
  embedsMinuteStartedAt?: number;
  embedsToday?: number;
  embedsDayStartedAt?: number;
  backoffUntil?: number;
  consecutiveErrors?: number;
  lastRunAt?: number;
  lastSuccessAt?: number;
  lastError?: string | null;
  lastErrorAt?: number;
  lastResult?: unknown;
};

function utcDayStart(ts: number): number {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function refreshRateWindows(job: IngestJobRow | null, now: number) {
  let embedsThisMinute = job?.embedsThisMinute ?? 0;
  let embedsMinuteStartedAt = job?.embedsMinuteStartedAt ?? now;
  let embedsToday = job?.embedsToday ?? 0;
  let embedsDayStartedAt = job?.embedsDayStartedAt ?? utcDayStart(now);

  if (now - embedsMinuteStartedAt >= 60_000) {
    embedsThisMinute = 0;
    embedsMinuteStartedAt = now;
  }
  if (utcDayStart(now) !== utcDayStart(embedsDayStartedAt)) {
    embedsToday = 0;
    embedsDayStartedAt = utcDayStart(now);
  }

  return {
    embedsThisMinute,
    embedsMinuteStartedAt,
    embedsToday,
    embedsDayStartedAt,
  };
}

function needsReembed(
  emb: { model?: string; vector?: number[] } | null | undefined,
  embedModel: string,
  expectedDims: number
): boolean {
  if (!emb || !Array.isArray(emb.vector) || emb.vector.length === 0) return true;
  if (emb.model !== embedModel) return true;
  if (emb.vector.length !== expectedDims) return true;
  return false;
}

function parseMarketRow(market: any, now: number) {
  const endDate = market.endDate
    ? new Date(market.endDate).getTime()
    : market.endDateISO
      ? new Date(market.endDateISO).getTime()
      : market.endDateIso
        ? new Date(market.endDateIso).getTime()
        : null;

  const isClosed = market.closed === true;
  const hasEnded = endDate != null && endDate < now;
  if (isClosed || hasEnded || market.active === false) {
    return null;
  }

  const polymarketMarketId =
    market.id ||
    market.marketId ||
    market.conditionId ||
    market.slug ||
    String(market._id || "");
  const title = market.question || market.title || market.name || "";
  if (!polymarketMarketId || !title) return null;

  let outcomes: string[] = ["Yes", "No"];
  if (market.outcomes) {
    if (typeof market.outcomes === "string") {
      try {
        outcomes = JSON.parse(market.outcomes);
      } catch {
        outcomes = [market.outcomes];
      }
    } else if (Array.isArray(market.outcomes)) {
      outcomes = market.outcomes;
    }
  }

  const volume =
    market.volumeNum ||
    (market.volume ? parseFloat(String(market.volume)) : null);
  const liquidity =
    market.liquidityNum ||
    (market.liquidity ? parseFloat(String(market.liquidity)) : null);
  const slug = market.slug || null;
  const url =
    market.url || (slug ? `https://polymarket.com/event/${slug}` : null);
  const description = market.description || market.resolution || "";

  return {
    polymarketMarketId,
    title,
    description,
    slug,
    url,
    endDate,
    outcomes,
    volume: Number.isFinite(volume) ? volume : null,
    liquidity: Number.isFinite(liquidity) ? liquidity : null,
  };
}

function extractMarkets(gammaData: any): any[] {
  if (!gammaData) return [];
  if (Array.isArray(gammaData)) return gammaData;
  if (Array.isArray(gammaData.data)) return gammaData.data;
  if (Array.isArray(gammaData.results)) return gammaData.results;
  if (Array.isArray(gammaData.markets)) return gammaData.markets;
  return [];
}

async function upsertParsedMarkets(
  ctx: any,
  markets: any[],
  now: number
): Promise<{ upserted: number; skipped: number }> {
  let upserted = 0;
  let skipped = 0;
  for (const market of markets) {
    const parsed = parseMarketRow(market, now);
    if (!parsed) {
      skipped++;
      continue;
    }
    await ctx.runMutation(internalApi.mutations.upsertMarket, {
      ...parsed,
      lastIngestedAt: now,
    });
    upserted++;
  }
  return { upserted, skipped };
}

/**
 * Incremental Polymarket ingest — metadata only.
 * Walks Gamma with offset; also pulls a small "recently updated" page each tick.
 * Embeddings are healed by healEmbeddings (rate-limited).
 */
export const incrementalIngest = action({
  args: {
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const pageSize = Math.min(args.pageSize ?? INGEST_PAGE_SIZE, 100);
    const job: IngestJobRow | null = await ctx.runQuery(
      internalApi.queries.getIngestJob,
      { job: JOB_INGEST }
    );

    await ctx.runMutation(internalApi.mutations.upsertIngestJob, {
      job: JOB_INGEST,
      lastRunAt: now,
    });

    try {
      const offset = job?.gammaOffset ?? 0;

      // 1) Catch recent updates first (order=updatedAt desc, offset 0)
      const recentData = await ctx.runAction(
        internalApi.actions.polymarket.fetchGammaMarkets,
        {
          cursor: null,
          offset: 0,
          limit: INGEST_RECENT_SIZE,
          order: "updatedAt",
          ascending: false,
          bypassCache: true,
        }
      );
      const recent = await upsertParsedMarkets(
        ctx,
        extractMarkets(recentData),
        now
      );

      // 2) Continue full crawl by offset (stable default order)
      const pageData = await ctx.runAction(
        internalApi.actions.polymarket.fetchGammaMarkets,
        {
          cursor: null,
          offset,
          limit: pageSize,
          bypassCache: true,
        }
      );
      const pageMarkets = extractMarkets(pageData);
      const crawled = await upsertParsedMarkets(ctx, pageMarkets, now);

      let nextOffset = offset + pageMarkets.length;
      let wrapped = false;
      if (pageMarkets.length < pageSize) {
        nextOffset = 0;
        wrapped = true;
      }

      const result = {
        recentUpserted: recent.upserted,
        crawlUpserted: crawled.upserted,
        skipped: recent.skipped + crawled.skipped,
        offsetBefore: offset,
        offsetAfter: nextOffset,
        wrapped,
      };

      await ctx.runMutation(internalApi.mutations.upsertIngestJob, {
        job: JOB_INGEST,
        gammaOffset: nextOffset,
        lastSuccessAt: now,
        lastError: null,
        consecutiveErrors: 0,
        lastResult: result,
      });

      console.log(`[incrementalIngest]`, result);
      return { ok: true, ...result };
    } catch (error: any) {
      const message = error?.message || String(error);
      console.error(`[incrementalIngest]`, message);
      await ctx.runMutation(internalApi.mutations.upsertIngestJob, {
        job: JOB_INGEST,
        lastError: message.slice(0, 500),
        lastErrorAt: now,
        consecutiveErrors: (job?.consecutiveErrors ?? 0) + 1,
      });
      return { ok: false, error: message };
    }
  },
});

/**
 * Self-healing re-embed: scan markets, batch-embed those missing or mismatched.
 * Idempotent; respects gateway rate limits and backs off on 429.
 */
export const healEmbeddings = action({
  args: {
    batchSize: v.optional(v.number()),
    scanLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const batchSize = Math.min(
      Math.max(args.batchSize ?? EMBED_BATCH_SIZE, 1),
      16
    );
    const scanLimit = Math.min(
      Math.max(args.scanLimit ?? HEAL_SCAN_PAGE, batchSize),
      200
    );
    const embedModel = getEmbedModel() || DEFAULT_EMBED_MODEL;
    const expectedDims = getEmbedDimensions() || DEFAULT_EMBED_DIMENSIONS;

    const job: IngestJobRow | null = await ctx.runQuery(
      internalApi.queries.getIngestJob,
      { job: JOB_REEMBED }
    );

    await ctx.runMutation(internalApi.mutations.upsertIngestJob, {
      job: JOB_REEMBED,
      lastRunAt: now,
    });

    if (job?.backoffUntil && job.backoffUntil > now) {
      const result = {
        skipped: true,
        reason: "backoff",
        backoffUntil: job.backoffUntil,
      };
      await ctx.runMutation(internalApi.mutations.upsertIngestJob, {
        job: JOB_REEMBED,
        lastResult: result,
      });
      return { ok: true, ...result };
    }

    const rates = refreshRateWindows(job, now);
    const maxPerMinute = getHealMinuteCallBudget();
    const maxPerDay = getHealDailyCallBudget();
    if (rates.embedsThisMinute >= maxPerMinute) {
      const result = {
        skipped: true,
        reason: "per_minute_limit",
        used: rates.embedsThisMinute,
        limit: maxPerMinute,
      };
      await ctx.runMutation(internalApi.mutations.upsertIngestJob, {
        job: JOB_REEMBED,
        ...rates,
        lastResult: result,
      });
      return { ok: true, ...result };
    }
    if (rates.embedsToday >= maxPerDay) {
      const result = {
        skipped: true,
        reason: "per_day_limit",
        used: rates.embedsToday,
        limit: maxPerDay,
      };
      await ctx.runMutation(internalApi.mutations.upsertIngestJob, {
        job: JOB_REEMBED,
        ...rates,
        lastResult: result,
      });
      return { ok: true, ...result };
    }

    // Collect a batch of markets that need re-embedding
    type Pending = {
      polymarketMarketId: string;
      title: string;
      text: string;
    };
    const pending: Pending[] = [];
    let cursor: string | null = job?.reembedCursor ?? null;
    let scanned = 0;
    let pages = 0;
    let wrapped = false;

    while (pending.length < batchSize && scanned < scanLimit && pages < 5) {
      const page: {
        page: any[];
        continueCursor: string;
        isDone: boolean;
      } = await ctx.runQuery(internalApi.queries.listMarketsPage, {
        cursor,
        limit: Math.min(HEAL_SCAN_PAGE, scanLimit - scanned),
      });
      pages++;

      if (!page.page.length) {
        cursor = null;
        wrapped = true;
        break;
      }

      for (const market of page.page) {
        scanned++;
        const emb = await ctx.runQuery(internalApi.queries.getEmbedding, {
          polymarketMarketId: market.polymarketMarketId,
        });
        if (!needsReembed(emb, embedModel, expectedDims)) continue;

        const text = [
          market.title,
          market.description,
          (market.outcomes || []).join(", "),
          market.endDate ? new Date(market.endDate).toISOString() : "",
        ]
          .filter(Boolean)
          .join(" ");

        pending.push({
          polymarketMarketId: market.polymarketMarketId,
          title: market.title,
          text,
        });
        if (pending.length >= batchSize) break;
      }

      if (page.isDone) {
        cursor = null;
        wrapped = true;
        break;
      }
      cursor = page.continueCursor;
    }

    if (pending.length === 0) {
      const result = {
        scanned,
        embedded: 0,
        pendingFound: 0,
        cursor,
        wrapped,
        message: "nothing to heal this tick",
      };
      await ctx.runMutation(internalApi.mutations.upsertIngestJob, {
        job: JOB_REEMBED,
        reembedCursor: cursor,
        ...rates,
        lastSuccessAt: now,
        lastError: null,
        consecutiveErrors: 0,
        lastResult: result,
      });
      return { ok: true, ...result };
    }

    try {
      const vectors = await gatewayEmbedBatch(
        pending.map((p) => ({
          text: p.text,
          role: "document" as const,
          title: p.title,
        }))
      );

      if (vectors.length !== pending.length) {
        throw new Error(
          `Batch embed size mismatch: got ${vectors.length}, expected ${pending.length}`
        );
      }

      let embedded = 0;
      for (let i = 0; i < pending.length; i++) {
        const vec = vectors[i];
        if (!vec || vec.length !== expectedDims) {
          console.warn(
            `[healEmbeddings] Unexpected dims for ${pending[i].polymarketMarketId}: ${vec?.length}`
          );
        }
        await ctx.runMutation(internalApi.mutations.upsertEmbedding, {
          polymarketMarketId: pending[i].polymarketMarketId,
          vector: vec,
          model: embedModel,
          updatedAt: now,
        });
        embedded++;
      }

      const nextRates = {
        embedsThisMinute: rates.embedsThisMinute + 1,
        embedsMinuteStartedAt: rates.embedsMinuteStartedAt,
        embedsToday: rates.embedsToday + 1,
        embedsDayStartedAt: rates.embedsDayStartedAt,
      };

      const result = {
        scanned,
        embedded,
        pendingFound: pending.length,
        apiCalls: 1,
        cursor,
        wrapped,
        batchSize,
      };

      await ctx.runMutation(internalApi.mutations.upsertIngestJob, {
        job: JOB_REEMBED,
        reembedCursor: cursor,
        ...nextRates,
        backoffUntil: 0,
        consecutiveErrors: 0,
        lastSuccessAt: now,
        lastError: null,
        lastResult: result,
      });

      console.log(`[healEmbeddings]`, result);
      return { ok: true, ...result };
    } catch (error: any) {
      const is429 =
        error instanceof GatewayRateLimitError ||
        error?.status === 429 ||
        /429|rate limit/i.test(error?.message || "");
      const consecutive = (job?.consecutiveErrors ?? 0) + 1;
      const retryAfterMs =
        error instanceof GatewayRateLimitError
          ? error.retryAfterMs
          : Math.min(60_000 * Math.pow(2, consecutive - 1), 30 * 60_000);
      const backoffUntil = is429 ? now + retryAfterMs : now + Math.min(30_000 * consecutive, 5 * 60_000);
      const message = error?.message || String(error);

      console.error(`[healEmbeddings]`, message, { is429, backoffUntil });

      await ctx.runMutation(internalApi.mutations.upsertIngestJob, {
        job: JOB_REEMBED,
        reembedCursor: cursor,
        ...rates,
        backoffUntil,
        consecutiveErrors: consecutive,
        lastError: message.slice(0, 500),
        lastErrorAt: now,
        lastResult: { ok: false, error: message, is429, backoffUntil },
      });

      return { ok: false, error: message, is429, backoffUntil };
    }
  },
});
