import { motion } from "framer-motion";
import CollapsibleClaim from "./CollapsibleClaim";
import MarketCard from "./MarketCard";
import ConfidenceBadge from "./ConfidenceBadge";

interface ResultCardProps {
  result: any;
  showDebug: boolean;
}

export default function ResultCard({ result, showDebug }: ResultCardProps) {
  const { parsedClaim, answer, bestMarket, alternatives } = result;

  return (
    <div className="space-y-6">
      {/* Answer Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-semibold text-white">
            Answer
          </h2>
          <ConfidenceBadge confidence={answer.confidence} />
        </div>
        <p className="text-lg text-[#ccc] mb-4">
          {answer.summary}
        </p>
        {answer.probYes !== null && (
          <div className="mt-4 p-4 bg-[#111] border border-[#1a1a1a] rounded-lg">
            <div className="text-sm text-[#888] mb-1 uppercase tracking-wide">
              Market-Implied Probability
            </div>
            <div className={`text-3xl font-bold ${
              answer.probYes > 0.5 ? 'text-emerald-500' : 'text-red-500'
            }`}>
              {(answer.probYes * 100).toFixed(1)}%
            </div>
          </div>
        )}
      </motion.div>

      {/* Parsed Claim */}
      <CollapsibleClaim parsedClaim={parsedClaim} />

      {/* Best Market */}
      {bestMarket && (
        <MarketCard
          market={bestMarket}
          isBest={true}
          showDebug={showDebug}
          debug={result.debug}
        />
      )}

      {/* Alternatives */}
      {alternatives && alternatives.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">
            Alternative Markets
          </h3>
          <div className="space-y-4">
            {alternatives.map((market: any) => (
              <MarketCard
                key={market.polymarketMarketId}
                market={market}
                isBest={false}
                showDebug={showDebug}
              />
            ))}
          </div>
        </div>
      )}

      {/* Debug Info */}
      {showDebug && result.debug && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4"
        >
          <h4 className="font-semibold text-white mb-2">
            Debug Info
          </h4>
          <pre className="text-xs text-[#888] overflow-auto">
            {JSON.stringify(result.debug, null, 2)}
          </pre>
        </motion.div>
      )}
    </div>
  );
}
