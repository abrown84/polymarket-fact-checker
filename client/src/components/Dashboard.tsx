import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Activity, Clock, ExternalLink, Flame, Search, BarChart3, Zap, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import MiniMarketChart from "./MiniMarketChart";
import { SkeletonStats, SkeletonMarketRow } from "./Skeleton";
import { AnimatedNumber, AnimatedPercent } from "./AnimatedNumber";
import MarketRow from "./MarketRow";
import MarketIngestion from "./MarketIngestion";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { 
    opacity: 1, 
    x: 0, 
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 24 
    } 
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25
    }
  }
};

export default function Dashboard() {
  const stats = useQuery(api.queries.getDashboardStats);
  const recentQueries = useQuery(api.queries.getRecentQueries, { limit: 50 });
  const getPopularMarketsWithPrices = useAction(api.actions.getPopularMarkets.getPopularMarketsWithPrices);
  const [popularMarkets, setPopularMarkets] = useState<any[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [expandedMarkets, setExpandedMarkets] = useState<Set<string>>(new Set());
  const [expandedQueries, setExpandedQueries] = useState<Set<string>>(new Set());
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);

  useEffect(() => {
    const fetchPopularMarkets = async () => {
      try {
        setLoadingMarkets(true);
        const result = await getPopularMarketsWithPrices({ limit: 20 });
        setPopularMarkets(result.markets || []);
      } catch (error: any) {
        console.error("Error fetching popular markets:", error);
        setPopularMarkets([]);
      } finally {
        setLoadingMarkets(false);
      }
    };

    fetchPopularMarkets();
    const interval = setInterval(fetchPopularMarkets, 30 * 1000);
    return () => clearInterval(interval);
  }, [getPopularMarketsWithPrices]);

  if (!stats || !recentQueries) {
    return (
      <div className="space-y-6">
        <SkeletonStats />
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden">
          <div className="p-5 border-b border-[#1a1a1a]">
            <div className="h-6 w-40 bg-[#1a1a1a] rounded animate-pulse" />
          </div>
          {[...Array(5)].map((_, i) => (
            <SkeletonMarketRow key={i} />
          ))}
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Market Ingestion Control - Only show in dev or for admins */}
      {import.meta.env.DEV && (
        <MarketIngestion />
      )}
      {/* Stats Overview - Compact Grid */}
      <motion.div 
        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -2, borderColor: "rgba(16, 185, 129, 0.3)" }}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <Activity className="h-4 w-4 text-[#888]" />
            <span className="text-xs text-[#666]">Markets</span>
          </div>
          <div className="text-xl font-bold text-white">
            <AnimatedNumber value={stats.totalMarkets} />
          </div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          whileHover={{ y: -2, borderColor: "rgba(16, 185, 129, 0.3)" }}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <Search className="h-4 w-4 text-[#888]" />
            <span className="text-xs text-[#666]">Queries</span>
          </div>
          <div className="text-xl font-bold text-white">
            <AnimatedNumber value={stats.totalQueries} />
          </div>
          <div className="text-xs text-[#666] mt-1">{stats.queriesLast24h} today</div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          whileHover={{ y: -2, borderColor: "rgba(16, 185, 129, 0.3)" }}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-[#666]">Confidence</span>
          </div>
          <div className="text-xl font-bold text-white">
            {stats.avgConfidence ? (
              <AnimatedPercent value={stats.avgConfidence} decimals={0} />
            ) : "N/A"}
          </div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          whileHover={{ y: -2, borderColor: "rgba(16, 185, 129, 0.3)" }}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <Clock className="h-4 w-4 text-[#888]" />
            <span className="text-xs text-[#666]">Updated</span>
          </div>
          <div className="text-xl font-bold text-white">
            <AnimatedNumber value={stats.marketsRecentlyIngested} />
          </div>
          <div className="text-xs text-[#666] mt-1">Last 6h</div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          whileHover={{ y: -2, borderColor: "rgba(16, 185, 129, 0.3)" }}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="h-4 w-4 text-[#888]" />
            <span className="text-xs text-[#666]">Embeddings</span>
          </div>
          <div className="text-xl font-bold text-white">
            <AnimatedNumber value={stats.totalEmbeddings} />
          </div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          whileHover={{ y: -2, borderColor: "rgba(16, 185, 129, 0.3)" }}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <Zap className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-[#666]">Coverage</span>
          </div>
          <div className="text-xl font-bold text-white">
            {stats.totalMarkets > 0 
              ? ((stats.totalEmbeddings / stats.totalMarkets) * 100).toFixed(0) 
              : 0}%
          </div>
        </motion.div>
      </motion.div>

      {/* Two Column Layout: Popular Markets + Recent Queries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Markets - Table View */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden"
        >
          <div className="p-4 border-b border-[#1a1a1a] bg-[#111]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Flame className="h-5 w-5 text-orange-500" />
                </motion.div>
                <h2 className="text-lg font-semibold text-white">Popular Markets</h2>
              </div>
              <div className="flex items-center gap-2">
                <motion.div 
                  className="w-2 h-2 bg-emerald-500 rounded-full"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-xs text-[#888]">Live</span>
              </div>
            </div>
          </div>

          {loadingMarkets ? (
            <div>
              {[...Array(5)].map((_, i) => (
                <SkeletonMarketRow key={i} />
              ))}
            </div>
          ) : popularMarkets.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[#888]">No popular markets available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1a1a1a] bg-[#111]">
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#888] uppercase">Market</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#888] uppercase">Price</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#888] uppercase">Volume</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#888] uppercase">Liquidity</th>
                  </tr>
                </thead>
                <tbody>
                  {popularMarkets.slice(0, 10).map((market) => (
                    <MarketRow 
                      key={market.id} 
                      market={market}
                      compact={true}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Recent Queries - Compact List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden"
        >
          <div className="p-4 border-b border-[#1a1a1a] bg-[#111]">
            <h2 className="text-lg font-semibold text-white">Recent Queries</h2>
            <p className="text-xs text-[#888] mt-1">Latest {recentQueries.length} fact-checks</p>
          </div>
          
          {recentQueries.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[#888]">No queries yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1a1a1a] max-h-[600px] overflow-y-auto">
              {recentQueries.map((query: any) => {
                const isExpanded = expandedQueries.has(query._id);
                const toggleExpand = () => {
                  const newExpanded = new Set(expandedQueries);
                  if (isExpanded) {
                    newExpanded.delete(query._id);
                    setSelectedQuery(null);
                  } else {
                    newExpanded.add(query._id);
                    setSelectedQuery(query._id);
                  }
                  setExpandedQueries(newExpanded);
                };

                return (
                  <motion.div
                    key={query._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ backgroundColor: "rgba(17, 17, 17, 1)" }}
                    className="p-4 transition-colors cursor-pointer group"
                    onClick={toggleExpand}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white mb-2 group-hover:text-emerald-400 transition-colors line-clamp-2">
                          {query.question}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-[#888] flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(query.createdAt)}
                          </span>
                          {query.confidence !== null && query.confidence !== undefined && (
                            <span className={`flex items-center gap-1 ${
                              query.confidence > 0.7 ? 'text-emerald-500' : 
                              query.confidence > 0.5 ? 'text-yellow-500' : 'text-red-500'
                            }`}>
                              <TrendingUp className="h-3 w-3" />
                              {(query.confidence * 100).toFixed(0)}%
                            </span>
                          )}
                          {query.bestMarketId && (
                            <span className="text-[#666] font-mono text-xs">
                              Market: {query.bestMarketId.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && query.parsedClaim && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-3 pt-3 border-t border-[#1a1a1a] space-y-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div>
                          <div className="text-xs text-[#888] uppercase tracking-wide mb-1">Claim</div>
                          <div className="text-sm text-[#ccc]">{query.parsedClaim.claim}</div>
                        </div>
                        {query.parsedClaim.must_include && query.parsedClaim.must_include.length > 0 && (
                          <div>
                            <div className="text-xs text-[#888] mb-1">Must Include:</div>
                            <div className="flex flex-wrap gap-1.5">
                              {query.parsedClaim.must_include.map((item: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-[#111] border border-[#1a1a1a] rounded text-xs text-[#ccc]"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Trending Market - Full Width */}
      {stats.mostQueriedMarket && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/30 rounded-lg p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div 
                className="w-2 h-2 bg-emerald-500 rounded-full"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <div>
                <div className="text-xs text-[#888] uppercase tracking-wide mb-1">Trending Market</div>
                <h3 className="text-lg font-semibold text-white">{stats.mostQueriedMarket.title}</h3>
                <div className="flex items-center gap-3 mt-2 text-sm text-[#888]">
                  <span>{stats.mostQueriedMarket.queryCount} queries</span>
                  <span>•</span>
                  <span>Most queried</span>
                </div>
              </div>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-500/50" />
          </div>
        </motion.div>
      )}
    </div>
  );
}
