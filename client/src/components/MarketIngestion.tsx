import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { motion } from "framer-motion";
import { Database, Zap, Play, Pause, Loader2 } from "lucide-react";

export default function MarketIngestion() {
  const bulkIngest = useAction(api.actions.bulkIngest.bulkIngest);
  const continuousIngest = useAction(api.actions.bulkIngest.continuousIngest);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleBulkIngest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await bulkIngest({
        maxBatches: 1000,
        batchSize: 1000,
      });
      setResult(res);
    } catch (error: any) {
      setResult({ error: error.message || "Unknown error" });
    } finally {
      setLoading(false);
    }
  };

  const handleContinuousIngest = async () => {
    if (isRunning) {
      setIsRunning(false);
      return;
    }

    setIsRunning(true);
    setLoading(true);
    setResult(null);
    
    try {
      const res = await continuousIngest({
        batchSize: 1000,
        maxDuration: 60 * 60 * 1000, // 1 hour
      });
      setResult(res);
      setIsRunning(false);
    } catch (error: any) {
      setResult({ error: error.message || "Unknown error" });
      setIsRunning(false);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-6 h-6 text-emerald-500" />
        <h2 className="text-xl font-semibold text-white">Market Ingestion</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <motion.button
          onClick={handleBulkIngest}
          disabled={loading || isRunning}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Ingesting...</span>
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              <span>Bulk Ingest (1000 batches)</span>
            </>
          )}
        </motion.button>

        <motion.button
          onClick={handleContinuousIngest}
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isRunning
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-5 h-5" />
              <span>Stop Continuous</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              <span>Continuous Ingest (1 hour)</span>
            </>
          )}
        </motion.button>
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111] border border-[#1a1a1a] rounded-lg p-4 space-y-2"
        >
          {result.error ? (
            <div className="text-red-400">
              <strong>Error:</strong> {result.error}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-[#888] uppercase tracking-wide mb-1">Processed</div>
                  <div className="text-2xl font-bold text-emerald-500">
                    {result.totalProcessed?.toLocaleString() || 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#888] uppercase tracking-wide mb-1">Skipped</div>
                  <div className="text-2xl font-bold text-[#888]">
                    {result.totalSkipped?.toLocaleString() || 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#888] uppercase tracking-wide mb-1">Batches</div>
                  <div className="text-2xl font-bold text-white">
                    {result.batches || 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#888] uppercase tracking-wide mb-1">Duration</div>
                  <div className="text-lg font-semibold text-white">
                    {result.duration ? formatDuration(result.duration) : "N/A"}
                  </div>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#1a1a1a]">
                  <div className="text-xs text-[#888] uppercase tracking-wide mb-2">Errors</div>
                  <div className="text-sm text-red-400 space-y-1">
                    {result.errors.slice(0, 5).map((error: string, i: number) => (
                      <div key={i}>{error}</div>
                    ))}
                    {result.errors.length > 5 && (
                      <div className="text-[#666]">... and {result.errors.length - 5} more</div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      )}

      <div className="mt-6 p-4 bg-[#111] border border-[#1a1a1a] rounded-lg">
        <div className="text-sm text-[#888] space-y-2">
          <p>
            <strong className="text-white">Bulk Ingest:</strong> Processes up to 1000 batches (1M markets) in a single run.
          </p>
          <p>
            <strong className="text-white">Continuous Ingest:</strong> Runs for up to 1 hour, processing all available markets.
          </p>
          <p className="text-xs text-[#666] mt-3">
            Note: Embeddings are generated asynchronously to maximize ingestion speed. Markets are saved immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
