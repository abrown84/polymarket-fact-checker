import { useAction } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Flame, ExternalLink, Lock, RefreshCw } from "lucide-react";
import { api } from "../convex/_generated/api";
import { DATA_CONSTANTS } from "../constants";
import { formatVolume } from "../utils/formatting";

type HotEventRow = {
  id: string;
  title: string;
  slug: string;
  url: string | null;
  restricted: boolean;
  volume24hr: number;
  volume: number;
  topMarketYesProb: number | null;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function HotEventsPanel() {
  const fetchActiveEvents = useAction(api.actions.polymarket.fetchActiveEvents);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setError(null);
        setLoading(true);
        const result = await fetchActiveEvents({
          // We sort client-side by volume24hr to avoid relying on Gamma order support.
          limit: DATA_CONSTANTS.HOT_EVENTS_FETCH_LIMIT,
        });
        if (cancelled) return;
        setEvents(result?.events || []);
        setFetchedAt(typeof result?.fetchedAt === "number" ? result.fetchedAt : Date.now());
      } catch (e: any) {
        if (cancelled) return;
        setEvents([]);
        setError(e?.message || "Failed to load hot events");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, DATA_CONSTANTS.DASHBOARD_POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchActiveEvents]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const result = await fetchActiveEvents({
        limit: DATA_CONSTANTS.HOT_EVENTS_FETCH_LIMIT,
        bypassCache: true,
      });
      setEvents(result?.events || []);
      setFetchedAt(typeof result?.fetchedAt === "number" ? result.fetchedAt : Date.now());
    } catch (e: any) {
      setError(e?.message || "Failed to refresh hot events");
    } finally {
      setRefreshing(false);
    }
  };

  const rows: HotEventRow[] = useMemo(() => {
    const mapped = (events || []).map((e: any): HotEventRow => {
      const markets = Array.isArray(e?.markets) ? e.markets : [];
      const firstMarket = markets[0] || null;

      const outcomePrices = parseJsonArray(firstMarket?.outcomePrices);
      const topMarketYesProb =
        typeof outcomePrices?.[0] !== "undefined" ? toNumber(outcomePrices[0]) : null;

      const slug = String(e?.slug || "");
      const url = slug ? `https://polymarket.com/event/${slug}` : null;

      return {
        id: String(e?.id || slug || ""),
        title: String(e?.title || "Untitled Event"),
        slug,
        url,
        restricted: Boolean(e?.restricted),
        volume24hr: toNumber(e?.volume24hr),
        volume: toNumber(e?.volume),
        topMarketYesProb:
          topMarketYesProb !== null && Number.isFinite(topMarketYesProb) ? topMarketYesProb : null,
      };
    });

    return mapped
      .filter((r) => r.id && r.title)
      .sort((a, b) => (b.volume24hr || 0) - (a.volume24hr || 0))
      .slice(0, DATA_CONSTANTS.HOT_EVENTS_LIMIT);
  }, [events]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden"
    >
      <div className="p-4 border-b border-[#1a1a1a] bg-[#111]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-emerald-500" />
            <div>
              <h3 className="text-lg font-semibold text-white">Hot right now</h3>
              <p className="text-xs text-[#888] mt-0.5">Sorted by 24h volume</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-[#666] tabular-nums">
              {loading
                ? "Updating…"
                : fetchedAt
                  ? `Updated ${Math.max(0, Math.round((Date.now() - fetchedAt) / 1000))}s ago`
                  : rows.length
                    ? `${rows.length} events`
                    : "—"}
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-2 text-xs px-2.5 py-1.5 rounded border border-[#2a2a2a] text-[#aaa] bg-black/20 hover:bg-black/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Refresh (bypass cache)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-md bg-[#0f0f0f] border border-[#1a1a1a] animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-[#888] mb-2">Couldn’t load hot events</p>
            <p className="text-xs text-[#666]">{error}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-[#888] mb-2">No events available</p>
            <p className="text-xs text-[#666]">Try again in a moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {rows.map((r) => (
              <a
                key={r.id}
                href={r.url || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-md border border-[#1a1a1a] bg-[#0f0f0f] hover:bg-[#111] transition-colors p-3 flex items-start gap-3"
                title={r.title}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-white truncate">
                      {r.title}
                    </div>
                    {r.restricted && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-[#2a2a2a] text-[#aaa] bg-black/20 flex-shrink-0">
                        <Lock className="w-3 h-3" />
                        Restricted
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-[#888]">
                    <span className="tabular-nums">
                      24h: <span className="text-white">{formatVolume(r.volume24hr)}</span>
                    </span>
                    <span className="text-[#444]">•</span>
                    <span className="tabular-nums">
                      total: <span className="text-[#bbb]">{formatVolume(r.volume)}</span>
                    </span>
                    {r.topMarketYesProb !== null && (
                      <>
                        <span className="text-[#444]">•</span>
                        <span className="tabular-nums">
                          yes:{" "}
                          <span className="text-emerald-400">
                            {(r.topMarketYesProb * 100).toFixed(0)}%
                          </span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-[#666] group-hover:text-emerald-400 transition-colors flex-shrink-0 mt-0.5" />
              </a>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

