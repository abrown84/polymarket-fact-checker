import { motion } from "framer-motion";
import { ExternalLink, TrendingUp, TrendingDown, DollarSign, Activity, Clock } from "lucide-react";
import ConfidenceBadge from "./ConfidenceBadge";

interface MarketRowProps {
  market: any;
  isBest?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export default function MarketRow({ market, isBest = false, onClick, compact = false }: MarketRowProps) {
  const probYes = market.evidence?.priceYes ?? market.priceYes;
  const spread = market.evidence?.spread ?? market.spread;
  const volume = market.evidence?.volume ?? market.volume;
  const volume24hr = market.evidence?.volume24hr ?? market.volume24hr;
  const liquidity = market.evidence?.liquidity ?? market.liquidity;
  const matchScore = market.matchScore ?? market.similarity;

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return "N/A";
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ backgroundColor: "var(--bg-elevated)" }}
      className={`border-b border-subtle transition-colors ${
        isBest ? "bg-cyan-dim" : ""
      } ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      {/* Market Title & Match Score */}
      <td className="py-4 px-4">
        <div className="flex items-start gap-3">
          {isBest && (
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mt-1"
            >
              <TrendingUp className="w-4 h-4 text-cyan" />
            </motion.div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-medium text-white truncate font-body" title={market.title || market.question}>
                {market.title || market.question || "Untitled Market"}
              </h4>
              {market.url && (
                <a
                  href={market.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-cyan hover:text-cyan/80 transition-colors flex-shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            {!compact && market.description && (
              <p className="text-xs text-[var(--text-tertiary)] line-clamp-1">{market.description}</p>
            )}
            {matchScore !== undefined && (
              <div className="mt-1.5">
                <ConfidenceBadge confidence={matchScore} label="Match" />
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Probability */}
      <td className="py-4 px-4">
        {probYes !== null && probYes !== undefined ? (
          <div className="flex items-center gap-2">
            <div className={`text-lg font-mono font-bold ${
              probYes > 0.5 ? 'text-[#00ff88]' : 'text-coral'
            }`}>
              {(probYes * 100).toFixed(1)}%
            </div>
            {probYes > 0.5 ? (
              <TrendingUp className="w-4 h-4 text-[#00ff88]" />
            ) : (
              <TrendingDown className="w-4 h-4 text-coral" />
            )}
          </div>
        ) : (
          <span className="text-[var(--text-muted)] text-sm font-mono">—</span>
        )}
      </td>

      {/* Volume */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-1.5 text-sm">
          <DollarSign className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-white font-mono font-medium">
            {formatCurrency(compact && volume24hr !== undefined ? volume24hr : volume)}
          </span>
        </div>
      </td>

      {/* Liquidity */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-1.5 text-sm">
          <Activity className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-white font-mono font-medium">
            {formatCurrency(liquidity)}
          </span>
        </div>
      </td>

      {/* Spread - Only show if not compact */}
      {!compact && (
        <td className="py-4 px-4">
          {spread !== null && spread !== undefined ? (
            <span className="text-sm text-[var(--text-secondary)] font-mono">
              {spread.toFixed(4)}
            </span>
          ) : (
            <span className="text-[var(--text-muted)] text-sm font-mono">—</span>
          )}
        </td>
      )}

      {/* End Date - Only show if not compact */}
      {!compact && (
        <td className="py-4 px-4">
          {market.endDate ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs">
                <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="text-[var(--text-secondary)] font-mono">
                  {new Date(market.endDate).toLocaleDateString()}
                </span>
              </div>
              {(() => {
                const now = Date.now();
                const timeUntilExpiry = market.endDate - now;
                const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);
                
                if (hoursUntilExpiry < 24 && hoursUntilExpiry > 0) {
                  return (
                    <span className="text-xs font-medium text-amber font-mono">
                      {hoursUntilExpiry < 1 
                        ? `${Math.round(timeUntilExpiry / (1000 * 60))}m left`
                        : `${Math.round(hoursUntilExpiry)}h left`}
                    </span>
                  );
                }
                return null;
              })()}
            </div>
          ) : (
            <span className="text-[var(--text-muted)] text-sm font-mono">—</span>
          )}
        </td>
      )}
    </motion.tr>
  );
}
