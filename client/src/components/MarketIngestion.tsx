import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { motion } from "framer-motion";
import { Database, CheckCircle2, Clock } from "lucide-react";

export default function MarketIngestion() {
  const stats = useQuery(api.queries.getDashboardStats);

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
          <div className="text-sm font-medium text-white">Automatic Ingestion Active</div>
          <div className="text-xs text-[#888] mt-1">
            Markets are automatically ingested every 2-6 hours
          </div>
        </div>
      </div>

      {stats && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-[#111] border border-[#1a1a1a] rounded-lg">
            <div className="text-xs text-[#888] uppercase tracking-wide mb-1">Total Markets</div>
            <div className="text-xl font-bold text-white">
              {stats.totalMarkets?.toLocaleString() || 0}
            </div>
          </div>
          <div className="p-3 bg-[#111] border border-[#1a1a1a] rounded-lg">
            <div className="text-xs text-[#888] uppercase tracking-wide mb-1">Active Markets</div>
            <div className="text-xl font-bold text-emerald-500">
              {stats.activeMarkets?.toLocaleString() || 0}
            </div>
          </div>
          <div className="p-3 bg-[#111] border border-[#1a1a1a] rounded-lg">
            <div className="text-xs text-[#888] uppercase tracking-wide mb-1">With Prices</div>
            <div className="text-xl font-bold text-blue-500">
              {stats.marketsWithPrices?.toLocaleString() || 0}
            </div>
          </div>
          <div className="p-3 bg-[#111] border border-[#1a1a1a] rounded-lg">
            <div className="text-xs text-[#888] uppercase tracking-wide mb-1">Total Volume</div>
            <div className="text-lg font-semibold text-white">
              ${stats.totalVolume ? (stats.totalVolume / 1e6).toFixed(1) + "M" : "0"}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 p-4 bg-[#111] border border-[#1a1a1a] rounded-lg">
        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 text-[#888] mt-0.5 flex-shrink-0" />
          <div className="text-xs text-[#888] space-y-1">
            <p>
              <strong className="text-white">Schedule:</strong> Markets are automatically ingested every 2 hours (new markets) and every 6 hours (full refresh).
            </p>
            <p>
              <strong className="text-white">Process:</strong> Up to 1,000 markets per batch. Embeddings are generated asynchronously for optimal performance.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
