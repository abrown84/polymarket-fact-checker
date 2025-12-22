import { motion } from "framer-motion";
import CollapsibleClaim from "./CollapsibleClaim";
import MarketCard from "./MarketCard";
import ConfidenceBadge from "./ConfidenceBadge";
import MarketRow from "./MarketRow";
import { TrendingUp, TrendingDown, BarChart3, ExternalLink, Clock, AlertCircle } from "lucide-react";

interface ResultCardProps {
  result: any;
  showDebug: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
  show: { 
    opacity: 1, 
    y: 0, 
    filter: "blur(0px)",
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 25 
    } 
  }
};

export default function ResultCard({ result, showDebug }: ResultCardProps) {
  const { parsedClaim, answer, bestMarket, alternatives, expiringMarkets, targetDate } = result;

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Top Summary Bar - Key Metrics at a Glance */}
      <motion.div
        variants={itemVariants}
        className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Confidence */}
          <div className="flex items-center justify-between p-3 bg-[#111] rounded-lg border border-[#1a1a1a]">
            <div>
              <div className="text-xs text-[#888] uppercase tracking-wide mb-1">Confidence</div>
              <div className="text-2xl font-bold text-white">
                {(answer.confidence * 100).toFixed(0)}%
              </div>
            </div>
            <BarChart3 className="w-8 h-8 text-emerald-500/50" />
          </div>

          {/* Market Probability */}
          <div className={`flex items-center justify-between p-3 rounded-lg border ${
            answer.probYes !== null
              ? (answer.probYes > 0.5 
                  ? "bg-emerald-500/10 border-emerald-500/30" 
                  : "bg-red-500/10 border-red-500/30")
              : "bg-[#111] border-[#1a1a1a]"
          }`}>
            <div>
              <div className="text-xs text-[#888] uppercase tracking-wide mb-1">Probability</div>
              {answer.probYes !== null ? (
                <div className={`text-2xl font-bold ${
                  answer.probYes > 0.5 ? 'text-emerald-500' : 'text-red-500'
                }`}>
                  {(answer.probYes * 100).toFixed(1)}%
                </div>
              ) : (
                <div className="text-lg font-semibold text-[#666]">
                  Unavailable
                </div>
              )}
            </div>
            {answer.probYes !== null ? (
              answer.probYes > 0.5 ? (
                <TrendingUp className="w-8 h-8 text-emerald-500/50" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-500/50" />
              )
            ) : (
              <AlertCircle className="w-8 h-8 text-[#666]/50" />
            )}
          </div>

          {/* Best Market Match */}
          {bestMarket && (
            <div className="flex items-center justify-between p-3 bg-[#111] rounded-lg border border-emerald-500/30">
              <div>
                <div className="text-xs text-[#888] uppercase tracking-wide mb-1">Best Match</div>
                <div className="text-lg font-semibold text-white">
                  {bestMarket.matchScore ? (bestMarket.matchScore * 100).toFixed(0) : "N/A"}%
                </div>
                {bestMarket.url && (
                  <a
                    href={bestMarket.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1 mt-1"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-500/50" />
            </div>
          )}

          {/* Alternatives Count */}
          <div className="flex items-center justify-between p-3 bg-[#111] rounded-lg border border-[#1a1a1a]">
            <div>
              <div className="text-xs text-[#888] uppercase tracking-wide mb-1">Alternatives</div>
              <div className="text-2xl font-bold text-white">
                {alternatives?.length || 0}
              </div>
            </div>
            <BarChart3 className="w-8 h-8 text-[#666]" />
          </div>
        </div>
      </motion.div>

      {/* Answer Summary - More Compact */}
      <motion.div
        variants={itemVariants}
        className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-5"
      >
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-xl font-semibold text-white">Answer</h2>
          <ConfidenceBadge confidence={answer.confidence} />
        </div>
        <p className="text-base text-[#ccc] leading-relaxed">
          {answer.summary}
        </p>
        {answer.ambiguity && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="text-[#888]">Ambiguity:</span>
            <span className={`font-medium ${
              answer.ambiguity === "low" ? "text-emerald-500" :
              answer.ambiguity === "medium" ? "text-yellow-500" : "text-red-500"
            }`}>
              {answer.ambiguity.toUpperCase()}
            </span>
          </div>
        )}
      </motion.div>

      {/* Parsed Claim - Compact */}
      <motion.div variants={itemVariants}>
        <CollapsibleClaim parsedClaim={parsedClaim} />
      </motion.div>

      {/* Expiring Markets Section - Show markets closing on the queried date */}
      {expiringMarkets && expiringMarkets.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/30 rounded-lg overflow-hidden"
        >
          <div className="p-4 border-b border-orange-500/30 bg-orange-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Clock className="h-5 w-5 text-orange-500" />
                </motion.div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Markets Expiring {targetDate ? new Date(targetDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'Soon'}
                  </h3>
                  <p className="text-xs text-[#888] mt-1">
                    {expiringMarkets.length} market{expiringMarkets.length !== 1 ? 's' : ''} closing on this date
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 rounded-full border border-orange-500/30">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-500">Expiring</span>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-orange-500/20 bg-orange-500/5">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#888] uppercase tracking-wide">Market</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#888] uppercase tracking-wide">Probability</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#888] uppercase tracking-wide">Volume</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#888] uppercase tracking-wide">Liquidity</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#888] uppercase tracking-wide">Expires</th>
                </tr>
              </thead>
              <tbody>
                {expiringMarkets.map((market: any) => (
                  <MarketRow 
                    key={market.polymarketMarketId || market._id} 
                    market={market} 
                  />
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Markets Comparison Table - Show All Markets at Once */}
      {(bestMarket || (alternatives && alternatives.length > 0)) && (
        <motion.div
          variants={itemVariants}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden"
        >
          <div className="p-4 border-b border-[#1a1a1a] bg-[#111]">
            <h3 className="text-lg font-semibold text-white">Market Comparison</h3>
            <p className="text-xs text-[#888] mt-1">All matching markets with key metrics</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1a1a1a] bg-[#111]">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#888] uppercase tracking-wide">Market</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#888] uppercase tracking-wide">Probability</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#888] uppercase tracking-wide">Volume</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#888] uppercase tracking-wide">Liquidity</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#888] uppercase tracking-wide">Spread</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#888] uppercase tracking-wide">End Date</th>
                </tr>
              </thead>
              <tbody>
                {bestMarket && (
                  <MarketRow market={bestMarket} isBest={true} />
                )}
                {alternatives && alternatives.map((market: any) => (
                  <MarketRow 
                    key={market.polymarketMarketId || market._id} 
                    market={market} 
                  />
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Detailed Best Market Card - Expandable Details */}
      {bestMarket && (
        <motion.div variants={itemVariants}>
          <MarketCard
            market={bestMarket}
            isBest={true}
            showDebug={showDebug}
            debug={result.debug}
          />
        </motion.div>
      )}

      {/* Debug Info */}
      {showDebug && result.debug && (
        <motion.div
          variants={itemVariants}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4"
        >
          <h4 className="font-semibold text-white mb-2">Debug Info</h4>
          <pre className="text-xs text-[#888] overflow-auto max-h-96">
            {JSON.stringify(result.debug, null, 2)}
          </pre>
        </motion.div>
      )}
    </motion.div>
  );
}
