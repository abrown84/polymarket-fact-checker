import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { motion } from "framer-motion";
import { TrendingUp, Activity, Clock, Flame, Search, BarChart3, Zap, ArrowUp, ArrowDown, ArrowUpDown, RefreshCw } from "lucide-react";
import { useEffect, useState, useRef, useMemo } from "react";
import { SkeletonStats, SkeletonMarketRow } from "./Skeleton";
import { AnimatedNumber, AnimatedPercent } from "./AnimatedNumber";
import MarketRow from "./MarketRow";
import MarketIngestion from "./MarketIngestion";
import { DATA_CONSTANTS } from "../constants";
import HotEventsPanel from "./HotEventsPanel";

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

type SortField = "price" | "volume" | "liquidity" | "market";
type SortDirection = "asc" | "desc";

export default function Dashboard() {
  const stats = useQuery(api.queries.getDashboardStats);
  const getPopularMarketsWithPrices = useAction(api.actions.getPopularMarkets.getPopularMarketsWithPrices);
  const [popularMarkets, setPopularMarkets] = useState<any[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [loadingMoreMarkets, setLoadingMoreMarkets] = useState(false);
  const [refreshingMarkets, setRefreshingMarkets] = useState(false);
  const [hasMoreMarkets, setHasMoreMarkets] = useState(true);
  const [marketsOffset, setMarketsOffset] = useState(0);
  const [marketsFetchedAt, setMarketsFetchedAt] = useState<number | null>(null);
  const loadMoreMarketsRef = useRef<HTMLDivElement>(null);
  const [sortField, setSortField] = useState<SortField>("volume");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Initial load and refresh
  useEffect(() => {
    const fetchPopularMarkets = async () => {
      try {
        setLoadingMarkets(true);
        setMarketsOffset(0);
        console.log("[Dashboard] Fetching popular markets...");
        const result = await getPopularMarketsWithPrices({ limit: DATA_CONSTANTS.MARKETS_INITIAL_LOAD, offset: 0 });
        console.log("[Dashboard] Received result:", { 
          marketsCount: result.markets?.length || 0, 
          hasMore: result.hasMore,
          error: result.error 
        });
        setPopularMarkets(result.markets || []);
        setHasMoreMarkets(result.hasMore !== false);
        setMarketsOffset(result.markets?.length || 0);
        setMarketsFetchedAt(typeof result?.fetchedAt === "number" ? result.fetchedAt : Date.now());
      } catch (error: any) {
        console.error("Error fetching popular markets:", error);
        setPopularMarkets([]);
        setHasMoreMarkets(false);
      } finally {
        setLoadingMarkets(false);
      }
    };

    fetchPopularMarkets();
    const interval = setInterval(fetchPopularMarkets, DATA_CONSTANTS.DASHBOARD_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [getPopularMarketsWithPrices]);

  const handleRefreshPopularMarkets = async () => {
    try {
      setRefreshingMarkets(true);
      console.log("[Dashboard] Refreshing popular markets (bypass cache)...");
      const result = await getPopularMarketsWithPrices({
        limit: DATA_CONSTANTS.MARKETS_INITIAL_LOAD,
        offset: 0,
        bypassCache: true,
      });
      setPopularMarkets(result.markets || []);
      setHasMoreMarkets(result.hasMore !== false);
      setMarketsOffset(result.markets?.length || 0);
      setMarketsFetchedAt(typeof result?.fetchedAt === "number" ? result.fetchedAt : Date.now());
    } catch (error: any) {
      console.error("Error refreshing popular markets:", error);
    } finally {
      setRefreshingMarkets(false);
    }
  };

  // Sort markets client-side
  const sortedMarkets = useMemo(() => {
    if (!popularMarkets.length) return [];
    
    const sorted = [...popularMarkets].sort((a, b) => {
      let aValue: number | string = 0;
      let bValue: number | string = 0;
      
      switch (sortField) {
        case "price":
          aValue = a.evidence?.priceYes ?? a.priceYes ?? 0;
          bValue = b.evidence?.priceYes ?? b.priceYes ?? 0;
          break;
        case "volume":
          // Popular Markets is intended to be "trending", so sort by 24h volume.
          // Fall back to total volume if 24h is unavailable.
          aValue = a.evidence?.volume24hr ?? a.volume24hr ?? a.evidence?.volume ?? a.volume ?? 0;
          bValue = b.evidence?.volume24hr ?? b.volume24hr ?? b.evidence?.volume ?? b.volume ?? 0;
          break;
        case "liquidity":
          aValue = a.evidence?.liquidity ?? a.liquidity ?? 0;
          bValue = b.evidence?.liquidity ?? b.liquidity ?? 0;
          break;
        case "market":
          aValue = (a.question || a.title || "").toLowerCase();
          bValue = (b.question || b.title || "").toLowerCase();
          break;
      }
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      const numA = Number(aValue) || 0;
      const numB = Number(bValue) || 0;
      
      return sortDirection === "asc" ? numA - numB : numB - numA;
    });
    
    return sorted;
  }, [popularMarkets, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field and default to descending
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 text-[#666]" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="w-3 h-3 ml-1 text-emerald-500" />
      : <ArrowDown className="w-3 h-3 ml-1 text-emerald-500" />;
  };

  // Infinite scroll for markets
  useEffect(() => {
    if (!hasMoreMarkets || loadingMoreMarkets || !loadMoreMarketsRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreMarkets && !loadingMoreMarkets) {
          setLoadingMoreMarkets(true);
          const currentOffset = marketsOffset;
          getPopularMarketsWithPrices({ limit: DATA_CONSTANTS.MARKETS_PER_PAGE, offset: currentOffset })
            .then((result) => {
              setPopularMarkets(prev => [...prev, ...(result.markets || [])]);
              setHasMoreMarkets(result.hasMore !== false);
              setMarketsOffset(currentOffset + (result.markets?.length || 0));
              setMarketsFetchedAt(typeof result?.fetchedAt === "number" ? result.fetchedAt : Date.now());
            })
            .catch((error) => {
              console.error("Error loading more markets:", error);
            })
            .finally(() => {
              setLoadingMoreMarkets(false);
            });
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreMarketsRef.current;
    observer.observe(currentRef);

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMoreMarkets, loadingMoreMarkets, marketsOffset, getPopularMarketsWithPrices]);

  if (!stats) {
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


  return (
    <div className="space-y-6">
      {/* Market Ingestion Status */}
      <MarketIngestion />
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

      {/* Hot Events (24h volume) */}
      <HotEventsPanel />

      {/* Popular Markets */}
      <motion.div
        variants={cardVariants}
        className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-[#1a1a1a] bg-[#111]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-emerald-500" />
              <h3 className="text-lg font-semibold text-white">Popular Markets</h3>
              <motion.div 
                className="w-2 h-2 bg-emerald-500 rounded-full ml-1"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-[#888] tabular-nums">
                Live market data
                {marketsFetchedAt
                  ? ` • updated ${Math.max(0, Math.round((Date.now() - marketsFetchedAt) / 1000))}s ago`
                  : ""}
              </p>
              <button
                type="button"
                onClick={handleRefreshPopularMarkets}
                disabled={loadingMarkets || refreshingMarkets}
                className="inline-flex items-center gap-2 text-xs px-2.5 py-1.5 rounded border border-[#2a2a2a] text-[#aaa] bg-black/20 hover:bg-black/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Refresh (bypass cache)"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingMarkets ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Markets Content */}
        <div className="p-4">
          {loadingMarkets ? (
            <div>
              {[...Array(5)].map((_, i) => (
                <SkeletonMarketRow key={i} />
              ))}
            </div>
                ) : popularMarkets.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-[#888] mb-2">No popular markets available</p>
                    <p className="text-xs text-[#666]">
                      Markets are being ingested automatically. Check back in a few minutes.
                    </p>
                  </div>
                ) : (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                  <tr className="border-b border-[#1a1a1a] bg-[#111]">
                    <th 
                      className="text-left py-2.5 px-4 text-xs font-semibold text-[#888] uppercase cursor-pointer hover:text-white transition-colors select-none"
                      onClick={() => handleSort("market")}
                    >
                      <div className="flex items-center">
                        Market
                        <SortIcon field="market" />
                      </div>
                    </th>
                    <th 
                      className="text-left py-2.5 px-4 text-xs font-semibold text-[#888] uppercase cursor-pointer hover:text-white transition-colors select-none"
                      onClick={() => handleSort("price")}
                    >
                      <div className="flex items-center">
                        Price
                        <SortIcon field="price" />
                      </div>
                    </th>
                    <th 
                      className="text-left py-2.5 px-4 text-xs font-semibold text-[#888] uppercase cursor-pointer hover:text-white transition-colors select-none"
                      onClick={() => handleSort("volume")}
                    >
                      <div className="flex items-center">
                        24h Volume
                        <SortIcon field="volume" />
                      </div>
                    </th>
                    <th 
                      className="text-left py-2.5 px-4 text-xs font-semibold text-[#888] uppercase cursor-pointer hover:text-white transition-colors select-none"
                      onClick={() => handleSort("liquidity")}
                    >
                      <div className="flex items-center">
                        Liquidity
                        <SortIcon field="liquidity" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMarkets.map((market) => (
                    <MarketRow 
                      key={market.id} 
                      market={market}
                      compact={true}
                    />
                  ))}
                </tbody>
              </table>
              {/* Infinite scroll trigger */}
              {hasMoreMarkets && (
                <div ref={loadMoreMarketsRef} className="py-4 text-center">
                  {loadingMoreMarkets ? (
                    <div className="flex items-center justify-center gap-2 text-[#888]">
                      <motion.div
                        className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      <span className="text-sm">Loading more markets...</span>
                    </div>
                  ) : (
                    <div className="h-4" />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

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
