import { motion } from "framer-motion";
import { ExternalLink, TrendingUp, BarChart3 } from "lucide-react";

interface KalshiMarket {
  ticker: string;
  title: string;
  subtitle: string | null;
  category: string;
  lastPrice: number | null;
  volume: number | null;
  url: string;
}

interface KalshiMarketsProps {
  markets: KalshiMarket[];
}

export default function KalshiMarkets({ markets }: KalshiMarketsProps) {
  if (!markets || markets.length === 0) {
    return null;
  }

  const getCategoryColor = (category: string) => {
    const catLower = category.toLowerCase();
    if (catLower.includes("politics")) return "text-blue-400 bg-blue-400/10 border-blue-400/30";
    if (catLower.includes("economics") || catLower.includes("finance")) return "text-green-400 bg-green-400/10 border-green-400/30";
    if (catLower.includes("sports")) return "text-orange-400 bg-orange-400/10 border-orange-400/30";
    if (catLower.includes("entertainment")) return "text-purple-400 bg-purple-400/10 border-purple-400/30";
    return "text-[#888] bg-[#111] border-[#1a1a1a]";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-[#1a1a1a] bg-[#111]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Kalshi Markets</h3>
              <p className="text-xs text-[#888] mt-1">
                {markets.length} related market{markets.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Markets List */}
      <div className="divide-y divide-[#1a1a1a]">
        {markets.slice(0, 8).map((market, index) => (
          <motion.a
            key={market.ticker}
            href={market.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="block p-4 hover:bg-[#111] transition-colors group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Category Badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded border ${getCategoryColor(market.category)}`}>
                    {market.category}
                  </span>
                  <span className="text-xs text-[#666]">{market.ticker}</span>
                </div>

                {/* Title */}
                <h4 className="text-base font-semibold text-white group-hover:text-purple-400 transition-colors mb-1 line-clamp-2">
                  {market.title}
                </h4>

                {/* Subtitle */}
                {market.subtitle && (
                  <p className="text-sm text-[#888] line-clamp-1 mb-3">
                    {market.subtitle}
                  </p>
                )}

                {/* Metrics */}
                <div className="flex items-center gap-4 text-sm">
                  {market.lastPrice !== null && (
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-purple-400" />
                      <span className={`font-medium ${
                        market.lastPrice > 0.5 ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        {(market.lastPrice * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {market.volume !== null && (
                    <span className="text-[#666] text-xs">
                      Vol: ${(market.volume / 1000).toFixed(0)}K
                    </span>
                  )}
                </div>
              </div>

              {/* Link */}
              <div className="flex-shrink-0">
                <ExternalLink className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
              </div>
            </div>
          </motion.a>
        ))}
      </div>

      {/* Footer */}
      {markets.length > 8 && (
        <div className="p-3 border-t border-[#1a1a1a] bg-[#111] text-center">
          <p className="text-xs text-[#666]">
            Showing 8 of {markets.length} markets
          </p>
        </div>
      )}
    </motion.div>
  );
}



