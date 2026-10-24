import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { motion } from "framer-motion";
import { Database, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

function formatTime(ts: number | null | undefined): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "—";
  }
}

export default function MarketIngestion() {
  const status = useQuery(api.queries.getIngestStatus);
  const stats = useQuery(api.queries.getDashboardStats);

  const pending = status?.totals.pending ?? null;
  const embeddedOk = status?.totals.embeddedOk ?? null;
  const lastIngestError = status?.ingest?.lastError;
  const lastHealError = status?.reembed?.lastError;
  const inBackoff =
    status?.reembed?.backoffUntil != null &&
    status.reembed.backoffUntil > Date.now();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <Database className="w-6 h-6 text-emerald-500" />
        <h2 className="text-xl font-semibold text-white">Market Ingestion</h2>
      </div>

      <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        </motion.div>
        <div className="flex-1">
          <div className="text-sm font-medium text-white">
            Self-healing ingestion active
          </div>
          <div className="text-xs text-[#888] mt-1">
            Markets crawl every 15 minutes; embeddings heal ~8/min through One
            Gateway (no manual re-index)
          </div>
        </div>
      </div>

      {(lastIngestError || lastHealError || inBackoff) && (
        <div className="mt-3 flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-200/90 space-y-1">
            {inBackoff && (
              <p>
                Embedding healer in backoff until{" "}
                {formatTime(status?.reembed?.backoffUntil)}
              </p>
            )}
            {lastHealError && <p>Last heal error: {lastHealError}</p>}
            {lastIngestError && <p>Last ingest error: {lastIngestError}</p>}
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-[#111] border border-[#1a1a1a] rounded-lg">
          <div className="text-xs text-[#888] uppercase tracking-wide mb-1">
            Markets
          </div>
          <div className="text-xl font-bold text-white">
            {(status?.totals.markets ?? stats?.totalMarkets ?? 0).toLocaleString()}
          </div>
        </div>
        <div className="p-3 bg-[#111] border border-[#1a1a1a] rounded-lg">
          <div className="text-xs text-[#888] uppercase tracking-wide mb-1">
            Embedded OK
          </div>
          <div className="text-xl font-bold text-emerald-500">
            {(embeddedOk ?? 0).toLocaleString()}
          </div>
        </div>
        <div className="p-3 bg-[#111] border border-[#1a1a1a] rounded-lg">
          <div className="text-xs text-[#888] uppercase tracking-wide mb-1">
            Pending re-embed
          </div>
          <div className="text-xl font-bold text-amber-400">
            {(pending ?? 0).toLocaleString()}
          </div>
        </div>
        <div className="p-3 bg-[#111] border border-[#1a1a1a] rounded-lg">
          <div className="text-xs text-[#888] uppercase tracking-wide mb-1">
            Embed budget (day)
          </div>
          <div className="text-lg font-semibold text-white">
            {status?.reembed?.rateLimit
              ? `${status.reembed.rateLimit.perDay.used}/${status.reembed.rateLimit.perDay.limit}`
              : "—"}
          </div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-[#111] border border-[#1a1a1a] rounded-lg">
        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 text-[#888] mt-0.5 flex-shrink-0" />
          <div className="text-xs text-[#888] space-y-1">
            <p>
              <strong className="text-white">Ingest last run:</strong>{" "}
              {formatTime(status?.ingest?.lastRunAt)} (offset{" "}
              {status?.ingest?.gammaOffset ?? 0})
            </p>
            <p>
              <strong className="text-white">Heal last run:</strong>{" "}
              {formatTime(status?.reembed?.lastRunAt)}
              {status?.reembed?.lastResult &&
              typeof status.reembed.lastResult === "object" &&
              status.reembed.lastResult !== null &&
              "embedded" in (status.reembed.lastResult as object)
                ? ` — last batch embedded ${
                    (status.reembed.lastResult as { embedded?: number }).embedded ?? 0
                  }`
                : ""}
            </p>
            <p>
              <strong className="text-white">Search:</strong> keyword fallback
              covers markets still pending re-embed so retrieval never silently
              drops them.
            </p>
            <p>
              Model {status?.embedModel ?? "…"} ·{" "}
              {status?.expectedDimensions ?? 3072}-d
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
