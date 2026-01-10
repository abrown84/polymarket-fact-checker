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
        const result = await getPopularMarketsWithPrices({ limit: DATA_CONSTANTS.MARKETS_INITIAL_LOAD, offset: 0 });
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
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 text-[var(--text-muted)]" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="w-3 h-3 ml-1 text-cyan" />
      : <ArrowDown className="w-3 h-3 ml-1 text-cyan" />;
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
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-5 border-b border-subtle">
            <div className="h-6 w-40 animate-shimmer rounded" />
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
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="font-display text-3xl font-bold text-white mb-2">Market Dashboard</h2>
        <p className="text-[var(--text-secondary)]">Real-time prediction market data and analytics</p>
      </div>
      
      {/* Market Ingestion Status */}
      <MarketIngestion />
      
      {/* Stats Overview */}
      <motion.div 
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Markets */}
        <motion.div
          variants={cardVariants}
          className="glass-card rounded-xl p-4 hover:border-cyan/30 transition-colors group"
        >
          <div className="flex items-center justify-between mb-3">
            <Activity className="h-4 w-4 text-[var(--text-tertiary)] group-hover:text-cyan transition-colors" />
            <span className="text-xs text-[var(--text-muted)] font-mono uppercase">Markets</span>
          </div>
          <div className="text-2xl font-display font-bold text-white">
            <AnimatedNumber value={stats.totalMarkets} />
          </div>
        </motion.div>

        {/* Queries */}
        <motion.div
          variants={cardVariants}
          className="glass-card rounded-xl p-4 hover:border-cyan/30 transition-colors group"
        >
          <div className="flex items-center justify-between mb-3">
            <Search className="h-4 w-4 text-[var(--text-tertiary)] group-hover:text-cyan transition-colors" />
            <span className="text-xs text-[var(--text-muted)] font-mono uppercase">Queries</span>
          </div>
          <div className="text-2xl font-display font-bold text-white">
            <AnimatedNumber value={stats.totalQueries} />
          </div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1 font-mono">
            {stats.queriesLast24h} <span className="text-cyan">today</span>
          </div>
        </motion.div>

        {/* Confidence */}
        <motion.div
          variants={cardVariants}
          className="glass-card rounded-xl p-4 hover:border-amber/30 transition-colors group"
        >
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="h-4 w-4 text-amber group-hover:text-amber transition-colors" />
            <span className="text-xs text-[var(--text-muted)] font-mono uppercase">Confidence</span>
          </div>
          <div className="text-2xl font-display font-bold text-amber">
            {stats.avgConfidence ? (
              <AnimatedPercent value={stats.avgConfidence} decimals={0} />
            ) : "N/A"}
          </div>
        </motion.div>

        {/* Updated */}
        <motion.div
          variants={cardVariants}
          className="glass-card rounded-xl p-4 hover:border-cyan/30 transition-colors group"
        >
          <div className="flex items-center justify-between mb-3">
            <Clock className="h-4 w-4 text-[var(--text-tertiary)] group-hover:text-cyan transition-colors" />
            <span className="text-xs text-[var(--text-muted)] font-mono uppercase">Updated</span>
          </div>
          <div className="text-2xl font-display font-bold text-white">
            <AnimatedNumber value={stats.marketsRecentlyIngested} />
          </div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1 font-mono">Last 6h</div>
        </motion.div>

        {/* Embeddings */}
        <motion.div
          variants={cardVariants}
          className="glass-card rounded-xl p-4 hover:border-cyan/30 transition-colors group"
        >
          <div className="flex items-center justify-between mb-3">
            <BarChart3 className="h-4 w-4 text-[var(--text-tertiary)] group-hover:text-cyan transition-colors" />
            <span className="text-xs text-[var(--text-muted)] font-mono uppercase">Embeddings</span>
          </div>
          <div className="text-2xl font-display font-bold text-white">
            <AnimatedNumber value={stats.totalEmbeddings} />
          </div>
        </motion.div>

        {/* Coverage */}
        <motion.div
          variants={cardVariants}
          className="glass-card rounded-xl p-4 hover:border-[#00ff88]/30 transition-colors group"
        >
          <div className="flex items-center justify-between mb-3">
            <Zap className="h-4 w-4 text-[#00ff88] group-hover:text-[#00ff88] transition-colors" />
            <span className="text-xs text-[var(--text-muted)] font-mono uppercase">Coverage</span>
          </div>
          <div className="text-2xl font-display font-bold text-[#00ff88]">
            {stats.totalMarkets > 0 
              ? ((stats.totalEmbeddings / stats.totalMarkets) * 100).toFixed(0) 
              : 0}%
          </div>
        </motion.div>
      </motion.div>

      {/* Hot Events */}
      <HotEventsPanel />

      {/* Popular Markets Table */}
      <motion.div
        variants={cardVariants}
        className="glass-card rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-subtle bg-surface/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber/20 to-amber/10 flex items-center justify-center">
                <Flame className="h-4 w-4 text-amber" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-white">Trending Markets</h3>
                <p className="text-xs text-[var(--text-tertiary)] font-mono">
                  Live data
                  {marketsFetchedAt
                    ? ` • ${Math.max(0, Math.round((Date.now() - marketsFetchedAt) / 1000))}s ago`
                    : ""}
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleRefreshPopularMarkets}
              disabled={loadingMarkets || refreshingMarkets}
              className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg 
                border border-subtle text-[var(--text-secondary)] 
                hover:bg-surface hover:border-bright hover:text-white
                disabled:opacity-50 disabled:cursor-not-allowed 
                transition-all font-mono"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingMarkets ? "animate-spin" : ""}`} />
              Refresh
            </button>
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
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-surface mx-auto mb-4 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-[var(--text-muted)]" />
              </div>
              <p className="text-[var(--text-secondary)] mb-1">No markets available</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                Markets are being ingested. Check back shortly.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-subtle bg-deep">
                    <th 
                      className="text-left py-3 px-4 text-xs font-mono font-semibold text-[var(--text-tertiary)] uppercase cursor-pointer hover:text-white transition-colors select-none"
                      onClick={() => handleSort("market")}
                    >
                      <div className="flex items-center">
                        Market
                        <SortIcon field="market" />
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-xs font-mono font-semibold text-[var(--text-tertiary)] uppercase cursor-pointer hover:text-white transition-colors select-none"
                      onClick={() => handleSort("price")}
                    >
                      <div className="flex items-center">
                        Price
                        <SortIcon field="price" />
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-xs font-mono font-semibold text-[var(--text-tertiary)] uppercase cursor-pointer hover:text-white transition-colors select-none"
                      onClick={() => handleSort("volume")}
                    >
                      <div className="flex items-center">
                        24h Vol
                        <SortIcon field="volume" />
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-xs font-mono font-semibold text-[var(--text-tertiary)] uppercase cursor-pointer hover:text-white transition-colors select-none"
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
                <div ref={loadMoreMarketsRef} className="py-6 text-center">
                  {loadingMoreMarkets ? (
                    <div className="flex items-center justify-center gap-2 text-[var(--text-tertiary)]">
                      <motion.div
                        className="w-4 h-4 border-2 border-cyan border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      <span className="text-sm font-mono">Loading more...</span>
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

      {/* Trending Market Highlight */}
      {stats.mostQueriedMarket && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative overflow-hidden rounded-xl border border-cyan/30 bg-gradient-to-r from-cyan/10 via-transparent to-transparent p-6"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div 
                className="w-3 h-3 bg-cyan rounded-full"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <div>
                <div className="text-xs text-cyan uppercase tracking-wider font-mono mb-1">
                  🔥 Most Queried Market
                </div>
                <h3 className="font-display text-xl font-semibold text-white">
                  {stats.mostQueriedMarket.title}
                </h3>
                <div className="flex items-center gap-3 mt-2 text-sm text-[var(--text-secondary)] font-mono">
                  <span className="text-cyan">{stats.mostQueriedMarket.queryCount} queries</span>
                  <span className="text-[var(--text-muted)]">•</span>
                  <span>Trending now</span>
                </div>
              </div>
            </div>
            <TrendingUp className="w-10 h-10 text-cyan/30" />
          </div>
        </motion.div>
      )}
    </div>
  );
}
