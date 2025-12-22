import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { motion } from "framer-motion";
import { Clock, TrendingUp, History } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { DATA_CONSTANTS } from "../constants";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function RecentQueries() {
  const [expandedQueries, setExpandedQueries] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<string | null>(null);
  const [allQueries, setAllQueries] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { queries, nextCursor } = useQuery(
    api.queries.getRecentQueries,
    { limit: DATA_CONSTANTS.RECENT_QUERIES_LIMIT, cursor: cursor || undefined }
  ) || { queries: [], nextCursor: null };

  // Update all queries when new data arrives
  useEffect(() => {
    if (queries) {
      if (cursor === null) {
        // Initial load
        setAllQueries(queries);
      } else {
        // Append new queries
        setAllQueries((prev) => {
          const existingIds = new Set(prev.map((q) => q._id));
          const newQueries = queries.filter((q: any) => !existingIds.has(q._id));
          return [...prev, ...newQueries];
        });
      }
      setHasMore(nextCursor !== null);
      setLoadingMore(false);
    }
  }, [queries, nextCursor, cursor]);

  // Infinite scroll
  useEffect(() => {
    if (!hasMore || loadingMore || !loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && nextCursor) {
          setLoadingMore(true);
          setCursor(nextCursor);
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    observer.observe(currentRef);

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, loadingMore, nextCursor]);

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

  if (!queries) {
    return (
      <div className="space-y-6">
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-48 bg-[#1a1a1a] rounded" />
            <div className="h-4 w-32 bg-[#1a1a1a] rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6" />
            Recent Queries
          </h2>
          <p className="text-sm text-[#888] mt-1">
            Browse your recent fact-checking queries
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{allQueries.length}</div>
          <div className="text-xs text-[#888]">Total queries</div>
        </div>
      </motion.div>

      {/* Queries List */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden"
      >
        <div className="p-4 border-b border-[#1a1a1a] bg-[#111]">
          <h3 className="text-sm font-semibold text-white">Query History</h3>
          <p className="text-xs text-[#888] mt-1">Latest fact-checks and their results</p>
        </div>

        {allQueries.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-12 h-12 text-[#333] mx-auto mb-4" />
            <p className="text-[#888]">No queries yet</p>
            <p className="text-sm text-[#666] mt-2">
              Start fact-checking to see your query history here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a1a] max-h-[700px] overflow-y-auto">
            {allQueries.map((query: any) => {
              const isExpanded = expandedQueries.has(query._id);
              const toggleExpand = () => {
                const newExpanded = new Set(expandedQueries);
                if (isExpanded) {
                  newExpanded.delete(query._id);
                } else {
                  newExpanded.add(query._id);
                }
                setExpandedQueries(newExpanded);
              };

              return (
                <motion.div
                  key={query._id}
                  variants={itemVariants}
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
                          <span
                            className={`flex items-center gap-1 ${
                              query.confidence > 0.7
                                ? "text-emerald-500"
                                : query.confidence > 0.5
                                ? "text-yellow-500"
                                : "text-red-500"
                            }`}
                          >
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
                        <div className="text-xs text-[#888] uppercase tracking-wide mb-1">
                          Claim
                        </div>
                        <div className="text-sm text-[#ccc]">
                          {query.parsedClaim.claim}
                        </div>
                      </div>
                      {query.parsedClaim.must_include &&
                        query.parsedClaim.must_include.length > 0 && (
                          <div>
                            <div className="text-xs text-[#888] mb-1">Must Include:</div>
                            <div className="flex flex-wrap gap-1.5">
                              {query.parsedClaim.must_include.map(
                                (item: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-[#111] border border-[#1a1a1a] rounded text-xs text-[#ccc]"
                                  >
                                    {item}
                                  </span>
                                )
                              )}
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

        {/* Infinite scroll trigger */}
        {hasMore && (
          <div ref={loadMoreRef} className="py-4 text-center">
            {loadingMore ? (
              <div className="flex items-center justify-center gap-2 text-[#888]">
                <motion.div
                  className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span className="text-sm">Loading more queries...</span>
              </div>
            ) : (
              <div className="h-4" />
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

