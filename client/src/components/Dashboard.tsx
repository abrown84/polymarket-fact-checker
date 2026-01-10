import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { motion } from "framer-motion";
import { 
  TrendingUp, Activity, Flame, Zap, BarChart3, 
  RefreshCw, Filter, Grid3X3, List, ChevronRight,
  Sparkles, Globe, DollarSign
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { SkeletonStats } from "./Skeleton";
import { AnimatedNumber, AnimatedPercent } from "./AnimatedNumber";
import MarketCard from "./MarketCard";
import { DATA_CONSTANTS } from "../constants";

type ViewMode = "grid" | "list";
type SortField = "volume" | "liquidity" | "price";

export default function Dashboard() {
  const stats = useQuery(api.queries.getDashboardStats);
  const getPopularMarketsWithPrices = useAction(api.actions.getPopularMarkets.getPopularMarketsWithPrices);
  const fetchActiveEvents = useAction(api.actions.polymarket.fetchActiveEvents);
  
  const [popularMarkets, setPopularMarkets] = useState<any[]>([]);
  const [hotEvents, setHotEvents] = useState<any[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [, setLoadingEvents] = useState(true);
  const [refreshingMarkets, setRefreshingMarkets] = useState(false);
  const [hasMoreMarkets, setHasMoreMarkets] = useState(true);
  const [marketsOffset, setMarketsOffset] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortField, setSortField] = useState<SortField>("volume");

  // Fetch markets
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setLoadingMarkets(true);
        const result = await getPopularMarketsWithPrices({ limit: 24, offset: 0 });
        setPopularMarkets(result.markets || []);
        setHasMoreMarkets(result.hasMore !== false);
        setMarketsOffset(result.markets?.length || 0);
      } catch (error) {
        console.error("Error fetching markets:", error);
      } finally {
        setLoadingMarkets(false);
      }
    };

    fetchMarkets();
    const interval = setInterval(fetchMarkets, DATA_CONSTANTS.DASHBOARD_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [getPopularMarketsWithPrices]);

  // Fetch hot events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoadingEvents(true);
        const result = await fetchActiveEvents({ limit: 20 });
        setHotEvents(result?.events || []);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, DATA_CONSTANTS.DASHBOARD_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchActiveEvents]);

  // Sort markets
  const sortedMarkets = useMemo(() => {
    if (!popularMarkets.length) return [];
    return [...popularMarkets].sort((a, b) => {
      const getValue = (m: any, field: SortField) => {
        switch (field) {
          case "volume": return m.evidence?.volume24hr ?? m.volume24hr ?? m.volume ?? 0;
          case "liquidity": return m.evidence?.liquidity ?? m.liquidity ?? 0;
          case "price": return m.evidence?.priceYes ?? m.priceYes ?? 0;
        }
      };
      return getValue(b, sortField) - getValue(a, sortField);
    });
  }, [popularMarkets, sortField]);

  // Parse hot events
  const topHotEvents = useMemo(() => {
    return (hotEvents || [])
      .map((e: any) => ({
        id: e.id || e.slug,
        title: e.title || "Untitled",
        slug: e.slug,
        volume24hr: Number(e.volume24hr) || 0,
        volume: Number(e.volume) || 0,
      }))
      .filter((e: any) => e.id && e.title)
      .sort((a: any, b: any) => b.volume24hr - a.volume24hr)
      .slice(0, 8);
  }, [hotEvents]);

  const handleRefresh = async () => {
    try {
      setRefreshingMarkets(true);
      const result = await getPopularMarketsWithPrices({ limit: 24, offset: 0, bypassCache: true });
      setPopularMarkets(result.markets || []);
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setRefreshingMarkets(false);
    }
  };

  const loadMore = async () => {
    if (!hasMoreMarkets) return;
    try {
      const result = await getPopularMarketsWithPrices({ limit: 12, offset: marketsOffset });
      setPopularMarkets(prev => [...prev, ...(result.markets || [])]);
      setHasMoreMarkets(result.hasMore !== false);
      setMarketsOffset(prev => prev + (result.markets?.length || 0));
    } catch (error) {
      console.error("Error loading more:", error);
    }
  };

  const formatCurrency = (value: number) => {
    if (!value) return "$0";
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  if (!stats) {
    return (
      <div className="space-y-6">
        <SkeletonStats />
      </div>
    );
  }

  // Get featured market (highest volume)
  const featuredMarket = sortedMarkets[0];
  const gridMarkets = sortedMarkets.slice(1);

  return (
    <div className="space-y-8">
      {/* Hero Stats Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden rounded-2xl border border-subtle bg-gradient-to-br from-deep via-surface to-deep p-8"
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-dim rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        
        <div className="relative">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-3xl md:text-4xl font-bold text-white mb-2"
              >
                Market Intelligence
              </motion.h1>
              <p className="text-[var(--text-secondary)] font-body">
                Real-time prediction market data from Polymarket, Kalshi & more
              </p>
            </div>
            
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRefresh}
              disabled={refreshingMarkets || loadingMarkets}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan text-deep font-semibold text-sm
                hover:bg-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${refreshingMarkets ? "animate-spin" : ""}`} />
              Refresh Data
            </motion.button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-5 rounded-xl bg-surface/50 border border-subtle backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-dim flex items-center justify-center">
                  <Activity className="w-4 h-4 text-cyan" />
                </div>
                <span className="text-xs text-[var(--text-tertiary)] font-mono uppercase">Markets</span>
              </div>
              <div className="text-3xl font-display font-bold text-white">
                <AnimatedNumber value={stats.totalMarkets} />
              </div>
              <div className="text-xs text-[var(--text-tertiary)] mt-1 font-mono">
                {stats.activeMarkets} active
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="p-5 rounded-xl bg-surface/50 border border-subtle backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-dim flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-amber" />
                </div>
                <span className="text-xs text-[var(--text-tertiary)] font-mono uppercase">Volume</span>
              </div>
              <div className="text-3xl font-display font-bold text-amber">
                {formatCurrency(stats.totalVolume || 0)}
              </div>
              <div className="text-xs text-[var(--text-tertiary)] mt-1 font-mono">
                Total traded
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-5 rounded-xl bg-surface/50 border border-subtle backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#00ff88]/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-[#00ff88]" />
                </div>
                <span className="text-xs text-[var(--text-tertiary)] font-mono uppercase">Confidence</span>
              </div>
              <div className="text-3xl font-display font-bold text-[#00ff88]">
                {stats.avgConfidence ? <AnimatedPercent value={stats.avgConfidence} decimals={0} /> : "N/A"}
              </div>
              <div className="text-xs text-[var(--text-tertiary)] mt-1 font-mono">
                Avg accuracy
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="p-5 rounded-xl bg-surface/50 border border-subtle backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-violet-dim flex items-center justify-center">
                  <Zap className="w-4 h-4 text-violet" />
                </div>
                <span className="text-xs text-[var(--text-tertiary)] font-mono uppercase">Queries</span>
              </div>
              <div className="text-3xl font-display font-bold text-white">
                <AnimatedNumber value={stats.totalQueries} />
              </div>
              <div className="text-xs text-cyan mt-1 font-mono">
                +{stats.queriesLast24h} today
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Hot Events Strip */}
      {topHotEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber to-coral flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-display text-xl font-semibold text-white">Hot Right Now</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-amber/30 to-transparent" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {topHotEvents.map((event: any, index: number) => (
              <motion.a
                key={event.id}
                href={`https://polymarket.com/event/${event.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                whileHover={{ y: -2 }}
                className="group glass-card rounded-xl p-4 hover:border-amber/30 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium text-white line-clamp-2 group-hover:text-amber transition-colors">
                    {event.title}
                  </h4>
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-amber transition-colors shrink-0" />
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs font-mono">
                  <span className="text-amber">{formatCurrency(event.volume24hr)}</span>
                  <span className="text-[var(--text-muted)]">24h</span>
                </div>
              </motion.a>
            ))}
          </div>
        </motion.div>
      )}

      {/* Markets Section */}
      <div>
        {/* Section Header with Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-dim flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-cyan" />
            </div>
            <h2 className="font-display text-xl font-semibold text-white">Trending Markets</h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-subtle">
              <Filter className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="bg-transparent text-sm text-white outline-none cursor-pointer font-mono"
              >
                <option value="volume" className="bg-deep">Volume</option>
                <option value="liquidity" className="bg-deep">Liquidity</option>
                <option value="price" className="bg-deep">Price</option>
              </select>
            </div>

            {/* View Toggle */}
            <div className="flex rounded-lg border border-subtle overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 transition-colors ${viewMode === "grid" ? "bg-cyan text-deep" : "bg-surface text-[var(--text-tertiary)] hover:text-white"}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 transition-colors ${viewMode === "list" ? "bg-cyan text-deep" : "bg-surface text-[var(--text-tertiary)] hover:text-white"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Markets Display */}
        {loadingMarkets ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-5 animate-shimmer">
                <div className="h-4 w-3/4 bg-surface rounded mb-4" />
                <div className="h-8 w-1/4 bg-surface rounded mb-4" />
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-12 bg-surface rounded" />
                  <div className="h-12 bg-surface rounded" />
                  <div className="h-12 bg-surface rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedMarkets.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <Globe className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <p className="text-white font-medium mb-2">No markets available</p>
            <p className="text-sm text-[var(--text-tertiary)]">Markets are being ingested. Check back shortly.</p>
          </div>
        ) : viewMode === "grid" ? (
          <>
            {/* Featured Market */}
            {featuredMarket && (
              <div className="mb-6">
                <MarketCard market={featuredMarket} variant="featured" />
              </div>
            )}

            {/* Grid of Markets */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.05 } }
              }}
            >
              {gridMarkets.map((market, index) => (
                <MarketCard key={market.id} market={market} index={index} />
              ))}
            </motion.div>
          </>
        ) : (
          <motion.div 
            className="glass-card rounded-xl overflow-hidden divide-y divide-subtle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {sortedMarkets.map((market, index) => (
              <MarketCard key={market.id} market={market} index={index} variant="compact" />
            ))}
          </motion.div>
        )}

        {/* Load More */}
        {hasMoreMarkets && !loadingMarkets && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 text-center"
          >
            <button
              onClick={loadMore}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-subtle
                text-white hover:border-cyan hover:text-cyan transition-all font-medium"
            >
              <Sparkles className="w-4 h-4" />
              Load More Markets
            </button>
          </motion.div>
        )}
      </div>

      {/* Most Queried Highlight */}
      {stats.mostQueriedMarket && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative overflow-hidden rounded-2xl border border-cyan/30 bg-gradient-to-r from-cyan/10 via-transparent to-transparent p-6"
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
                  🔥 Most Queried
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
