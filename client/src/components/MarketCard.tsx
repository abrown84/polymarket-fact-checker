import { motion } from "framer-motion";
import { ExternalLink, TrendingUp } from "lucide-react";
import ConfidenceBadge from "./ConfidenceBadge";
import MetricRow from "./MetricRow";

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
      transition={{ duration: 0.3 }}
      className={`bg-[#0a0a0a] border rounded-lg p-6 ${
        isBest
          ? "border-emerald-500/50"
          : "border-[#1a1a1a]"
      }`}
    >
      {isBest && (
        <div className="flex items-center gap-2 mb-4 text-emerald-500">
          <TrendingUp className="w-5 h-5" />
          <span className="font-semibold text-sm uppercase tracking-wide">Best Match</span>
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-white mb-2">
            {market.title}
          </h3>
          {market.url && (
            <a
              href={market.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              View on Polymarket <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
        {market.matchScore !== undefined && (
          <ConfidenceBadge confidence={market.matchScore} label="Match" />
        )}
      </div>

      {market.description && (
        <p className="text-[#888] mb-4 text-sm">
          {market.description}
        </p>
      )}

      {/* Market Probability */}
      {probYes !== null && probYes !== undefined && (
        <div className="mb-4 p-4 bg-[#111] border border-[#1a1a1a] rounded-lg">
          <div className="text-sm text-[#888] mb-1 uppercase tracking-wide">
            Market-Implied Probability
          </div>
          <div className={`text-3xl font-bold ${
            probYes > 0.5 ? 'text-emerald-500' : 'text-red-500'
          }`}>
            {(probYes * 100).toFixed(1)}%
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="space-y-2 mb-4">
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
      </div>

      {/* Reasons */}
      {market.reasons && market.reasons.length > 0 && (
        <div className="mt-4 p-3 bg-[#111] border border-[#1a1a1a] rounded-lg">
          <div className="text-sm font-semibold text-white mb-2">
            Why this match:
          </div>
          <ul className="list-disc list-inside text-sm text-[#888] space-y-1">
            {market.reasons.map((reason: string, i: number) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Mismatch Flags */}
      {market.mismatchFlags && market.mismatchFlags.length > 0 && (
        <div className="mt-2 p-3 bg-[#1a0a0a] border border-yellow-900/30 rounded-lg">
          <div className="text-sm font-semibold text-yellow-500 mb-2">
            Mismatches:
          </div>
          <ul className="list-disc list-inside text-sm text-yellow-600 space-y-1">
            {market.mismatchFlags.map((flag: string, i: number) => (
              <li key={i}>{flag}</li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
