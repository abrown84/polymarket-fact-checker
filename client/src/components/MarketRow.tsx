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
      whileHover={{ backgroundColor: "rgba(17, 17, 17, 1)" }}
      className={`border-b border-[#1a1a1a] transition-colors ${
        isBest ? "bg-emerald-500/5" : ""
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
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </motion.div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-white truncate" title={market.title || market.question}>
                {market.title || market.question || "Untitled Market"}
              </h4>
              {market.url && (
                <a
                  href={market.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-emerald-500 hover:text-emerald-400 transition-colors flex-shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            {!compact && market.description && (
              <p className="text-xs text-[#666] line-clamp-1">{market.description}</p>
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
            <div className={`text-lg font-bold ${
              probYes > 0.5 ? 'text-emerald-500' : 'text-red-500'
            }`}>
              {(probYes * 100).toFixed(1)}%
            </div>
            {probYes > 0.5 ? (
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
          </div>
        ) : (
          <span className="text-[#666] text-sm">N/A</span>
        )}
      </td>

      {/* Volume */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-1.5 text-sm">
          <DollarSign className="w-3.5 h-3.5 text-[#666]" />
          <span className="text-white font-medium">
            {formatCurrency(volume)}
          </span>
        </div>
      </td>

      {/* Liquidity */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-1.5 text-sm">
          <Activity className="w-3.5 h-3.5 text-[#666]" />
          <span className="text-white font-medium">
            {formatCurrency(liquidity)}
          </span>
        </div>
      </td>

      {/* Spread */}
      <td className="py-4 px-4">
        {spread !== null && spread !== undefined ? (
          <span className="text-sm text-[#888] font-mono">
            {spread.toFixed(4)}
          </span>
        ) : (
          <span className="text-[#666] text-sm">N/A</span>
        )}
      </td>

      {/* End Date */}
      <td className="py-4 px-4">
        {market.endDate ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs">
              <Clock className="w-3.5 h-3.5 text-[#888]" />
              <span className="text-[#888]">{new Date(market.endDate).toLocaleDateString()}</span>
            </div>
            {(() => {
              const now = Date.now();
              const timeUntilExpiry = market.endDate - now;
              const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);
              
              if (hoursUntilExpiry < 24 && hoursUntilExpiry > 0) {
                return (
                  <span className="text-xs font-medium text-orange-500">
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
          <span className="text-[#666] text-sm">N/A</span>
        )}
      </td>
    </motion.tr>
  );
}

