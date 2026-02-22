import { useState, useMemo, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";

interface UseMarketSearchOptions {
  searchQuery?: string;
  limit?: number;
  sortBy?: "volume" | "liquidity" | "recent" | "title";
  sortDirection?: "asc" | "desc";
  includePrices?: boolean; // Whether to fetch prices from action
  autoRefresh?: boolean; // Auto-refresh popular markets with prices
}

/**
 * Unified hook for all market operations:
 * - Search all markets
 * - Get popular markets with prices
 * - Real-time updates
 * - All in one place
 */
export function useMarketSearch(options: UseMarketSearchOptions = {}) {
  const {
    searchQuery = "",
    limit,
    sortBy = "volume",
    sortDirection = "desc",
    includePrices = false,
    autoRefresh = false,
  } = options;

  // State for popular markets with prices (from action)
  const [popularMarketsWithPrices, setPopularMarketsWithPrices] = useState<any[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [marketsOffset, setMarketsOffset] = useState(0);
  const [hasMoreMarkets, setHasMoreMarkets] = useState(true);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  // Get all markets from database (reactive query)
  const allMarkets = useQuery(api.queries.getAllMarkets) || [];

  // Get popular markets action
  const getPopularMarketsWithPrices = useAction(api.actions.getPopularMarkets.getPopularMarketsWithPrices);

  // Reset state when includePrices changes
  useEffect(() => {
    setPopularMarketsWithPrices([]);
    setMarketsOffset(0);
    setHasMoreMarkets(true);
    setInitialFetchDone(false);
  }, [includePrices]);

  // Fetch popular markets with prices if requested
  useEffect(() => {
    if (!includePrices || !getPopularMarketsWithPrices || initialFetchDone) return;

    const fetchPopularMarkets = async () => {
      setLoadingPrices(true);
      try {
        // Always bypass cache on initial fetch to get fresh data
        const result = await getPopularMarketsWithPrices({
          limit: limit || 50,
          offset: 0,
          bypassCache: true,
        });
        setPopularMarketsWithPrices(result.markets || []);
        setHasMoreMarkets(result.hasMore !== false);
        setMarketsOffset(result.markets?.length || 0);
        setInitialFetchDone(true);
      } catch (error) {
        console.error("Error fetching popular markets with prices:", error);
        setInitialFetchDone(true);
      } finally {
        setLoadingPrices(false);
      }
    };

    fetchPopularMarkets();
  }, [includePrices, getPopularMarketsWithPrices, limit, initialFetchDone]);

  // Auto-refresh interval (separate from initial fetch)
  useEffect(() => {
    if (!includePrices || !autoRefresh || !getPopularMarketsWithPrices) return;

    const refreshMarkets = async () => {
      try {
        const result = await getPopularMarketsWithPrices({
          limit: limit || 50,
          offset: 0,
          bypassCache: true,
        });
        setPopularMarketsWithPrices(result.markets || []);
        setHasMoreMarkets(result.hasMore !== false);
        setMarketsOffset(result.markets?.length || 0);
      } catch (error) {
        console.error("Error refreshing popular markets:", error);
      }
    };

    const interval = setInterval(refreshMarkets, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [includePrices, autoRefresh, getPopularMarketsWithPrices, limit]);

  // Determine which markets to use
  const sourceMarkets = includePrices && popularMarketsWithPrices.length > 0
    ? popularMarketsWithPrices
    : allMarkets;

  // Filter and sort markets
  const filteredAndSortedMarkets = useMemo(() => {
    let filtered = [...sourceMarkets];

    // Apply search filter
    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      filtered = filtered.filter((market) => {
        const titleMatch = market.title?.toLowerCase().includes(queryLower) ||
                          market.question?.toLowerCase().includes(queryLower);
        const descMatch = market.description?.toLowerCase().includes(queryLower);
        const slugMatch = market.slug?.toLowerCase().includes(queryLower);
        const idMatch = market.polymarketMarketId?.toLowerCase().includes(queryLower) ||
                       market.id?.toLowerCase().includes(queryLower);
        return titleMatch || descMatch || slugMatch || idMatch;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "volume":
          const volA = a.volume || a.volume24hr || 0;
          const volB = b.volume || b.volume24hr || 0;
          comparison = volB - volA;
          break;
        case "liquidity":
          const liqA = a.liquidity || a.totalLiquidity || 0;
          const liqB = b.liquidity || b.totalLiquidity || 0;
          comparison = liqB - liqA;
          break;
        case "recent":
          const recentA = a.lastIngestedAt || a.createdAt || 0;
          const recentB = b.lastIngestedAt || b.createdAt || 0;
          comparison = recentB - recentA;
          break;
        case "title":
          const titleA = a.title || a.question || "";
          const titleB = b.title || b.question || "";
          comparison = titleA.localeCompare(titleB);
          break;
      }

      return sortDirection === "asc" ? -comparison : comparison;
    });

    // Apply limit
    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }, [sourceMarkets, searchQuery, sortBy, sortDirection, limit]);

  // Load more markets (for pagination with prices)
  const loadMore = async () => {
    if (!includePrices || loadingPrices || !hasMoreMarkets || !getPopularMarketsWithPrices) return;

    setLoadingPrices(true);
    try {
      const result = await getPopularMarketsWithPrices({
        limit: limit || 50,
        offset: marketsOffset,
      });
      setPopularMarketsWithPrices(prev => [...prev, ...(result.markets || [])]);
      setHasMoreMarkets(result.hasMore !== false);
      setMarketsOffset(prev => prev + (result.markets?.length || 0));
    } catch (error) {
      console.error("Error loading more markets:", error);
    } finally {
      setLoadingPrices(false);
    }
  };

  // Reset pagination
  const reset = () => {
    setMarketsOffset(0);
    setPopularMarketsWithPrices([]);
    setHasMoreMarkets(true);
  };

  return {
    // Markets data
    markets: filteredAndSortedMarkets,
    totalMarkets: allMarkets.length,
    filteredCount: filteredAndSortedMarkets.length,
    
    // Loading states
    isLoading: allMarkets === undefined,
    isLoadingPrices: loadingPrices,
    
    // Pagination (for prices mode)
    hasMore: hasMoreMarkets,
    loadMore: includePrices ? loadMore : undefined,
    reset: includePrices ? reset : undefined,
    
    // Actions
    refresh: includePrices && getPopularMarketsWithPrices
      ? async () => {
          reset();
          setLoadingPrices(true);
          try {
            const result = await getPopularMarketsWithPrices({
              limit: limit || 50,
              offset: 0,
              bypassCache: true, // Force fresh data on manual refresh
            });
            setPopularMarketsWithPrices(result.markets || []);
            setHasMoreMarkets(result.hasMore !== false);
            setMarketsOffset(result.markets?.length || 0);
          } finally {
            setLoadingPrices(false);
          }
        }
      : undefined,
  };
}

// Export legacy hook for backward compatibility
export function usePopularMarkets(_options: { limit?: number; offset?: number } = {}) {
  const getPopularMarketsWithPrices = useAction(api.actions.getPopularMarkets.getPopularMarketsWithPrices);

  return {
    getPopularMarketsWithPrices,
  };
}
