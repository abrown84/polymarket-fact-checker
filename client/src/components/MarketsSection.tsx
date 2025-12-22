import { motion } from "framer-motion";
import MarketRow from "./MarketRow";
import { BarChart3 } from "lucide-react";

interface MarketsSectionProps {
  bestMarket: any;
  alternatives?: any[];
}

export default function MarketsSection({ bestMarket, alternatives }: MarketsSectionProps) {
  if (!bestMarket && (!alternatives || alternatives.length === 0)) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-[#1a1a1a] bg-[#111]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Polymarket Markets</h3>
              <p className="text-xs text-[#888] mt-1">
                {1 + (alternatives?.length || 0)} market{(1 + (alternatives?.length || 0)) !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Markets Table */}
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
  );
}



