import { motion } from "framer-motion";
import { ExternalLink, TrendingUp } from "lucide-react";
import ConfidenceBadge from "./ConfidenceBadge";
import MetricRow from "./MetricRow";
import MiniMarketChart from "./MiniMarketChart";

interface MarketCardProps {
  market: any;
  isBest: boolean;
  showDebug?: boolean;
  debug?: any;
}

export default function MarketCard({
  market,
  isBest,
}: MarketCardProps) {
  const probYes = market.evidence?.priceYes;
  const spread = market.evidence?.spread;
  const volume = market.evidence?.volume;
  const liquidity = market.evidence?.liquidity;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
      whileHover={{ 
        y: -4, 
        boxShadow: isBest 
          ? "0 12px 40px rgba(16, 185, 129, 0.15)" 
          : "0 8px 30px rgba(255, 255, 255, 0.05)",
        borderColor: isBest ? "rgba(16, 185, 129, 0.7)" : "rgba(42, 42, 42, 1)"
      }}
      className={`bg-[#0a0a0a] border rounded-lg p-6 cursor-pointer transition-colors ${
        isBest
          ? "border-emerald-500/50"
          : "border-[#1a1a1a]"
      }`}
    >
      {isBest && (
        <motion.div 
          className="flex items-center gap-2 mb-4 text-emerald-500"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <TrendingUp className="w-5 h-5" />
          </motion.div>
          <span className="font-semibold text-sm uppercase tracking-wide">Best Match</span>
        </motion.div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-white mb-2">
            {market.title}
          </h3>
          {market.url && (
            <motion.a
              href={market.url}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ x: 3 }}
              className="inline-flex items-center gap-1 text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              View on Polymarket <ExternalLink className="w-4 h-4" />
            </motion.a>
          )}
        </div>
        {market.matchScore !== undefined && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 25 }}
          >
            <ConfidenceBadge confidence={market.matchScore} label="Match" />
          </motion.div>
        )}
      </div>

      {market.description && (
        <motion.p 
          className="text-[#888] mb-4 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          {market.description}
        </motion.p>
      )}

      {/* Market Probability with Chart */}
      {probYes !== null && probYes !== undefined && (
        <motion.div 
          className="mb-4 p-4 bg-[#111] border border-[#1a1a1a] rounded-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ borderColor: probYes > 0.5 ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)" }}
        >
          <div className="text-sm text-[#888] mb-2 uppercase tracking-wide">
            Market-Implied Probability
          </div>
          <motion.div 
            className={`text-3xl font-bold mb-3 ${
              probYes > 0.5 ? 'text-emerald-500' : 'text-red-500'
            }`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 20 }}
          >
            {(probYes * 100).toFixed(1)}%
          </motion.div>
          <MiniMarketChart priceYes={probYes} volume={volume} liquidity={liquidity} />
        </motion.div>
      )}

      {/* Metrics */}
      <motion.div 
        className="space-y-2 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        {spread !== null && spread !== undefined && (
          <MetricRow label="Spread" value={spread.toFixed(4)} />
        )}
        {volume !== null && volume !== undefined && (
          <MetricRow
            label="Volume"
            value={`$${volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          />
        )}
        {liquidity !== null && liquidity !== undefined && (
          <MetricRow
            label="Liquidity"
            value={`$${liquidity.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          />
        )}
        {market.endDate && (
          <MetricRow
            label="End Date"
            value={new Date(market.endDate).toLocaleDateString()}
          />
        )}
      </motion.div>

      {/* Reasons */}
      {market.reasons && market.reasons.length > 0 && (
        <motion.div 
          className="mt-4 p-3 bg-[#111] border border-[#1a1a1a] rounded-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-sm font-semibold text-white mb-2">
            Why this match:
          </div>
          <ul className="list-disc list-inside text-sm text-[#888] space-y-1">
            {market.reasons.map((reason: string, i: number) => (
              <motion.li 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.05 }}
              >
                {reason}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Mismatch Flags */}
      {market.mismatchFlags && market.mismatchFlags.length > 0 && (
        <motion.div 
          className="mt-2 p-3 bg-[#1a0a0a] border border-yellow-900/30 rounded-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="text-sm font-semibold text-yellow-500 mb-2">
            Mismatches:
          </div>
          <ul className="list-disc list-inside text-sm text-yellow-600 space-y-1">
            {market.mismatchFlags.map((flag: string, i: number) => (
              <motion.li 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
              >
                {flag}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
}
