import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { motion } from "framer-motion";
import { Clock, TrendingUp, History, ChevronDown } from "lucide-react";
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

  useEffect(() => {
    if (queries) {
      if (cursor === null) {
        setAllQueries(queries);
      } else {
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
        <div className="glass-card rounded-xl p-8">
          <div className="animate-shimmer space-y-4">
            <div className="h-6 w-48 rounded" />
            <div className="h-4 w-32 rounded" />
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
          <h2 className="font-display text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-dim flex items-center justify-center">
              <History className="w-5 h-5 text-violet" />
            </div>
            Query History
          </h2>
          <p className="text-[var(--text-secondary)] mt-2">
            Browse your recent fact-checking queries
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-display font-bold text-white">{allQueries.length}</div>
          <div className="text-xs text-[var(--text-muted)] font-mono uppercase">Total</div>
        </div>
      </motion.div>

      {/* Queries List */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="glass-card rounded-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-subtle bg-surface/50">
          <h3 className="font-display text-lg font-semibold text-white">Recent Activity</h3>
          <p className="text-xs text-[var(--text-tertiary)] font-mono mt-1">
            Latest fact-checks and their results
          </p>
        </div>

        {allQueries.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface mx-auto mb-4 flex items-center justify-center">
              <History className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <p className="text-[var(--text-secondary)] font-display text-lg">No queries yet</p>
            <p className="text-sm text-[var(--text-tertiary)] mt-2">
              Start fact-checking to see your query history here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-subtle max-h-[700px] overflow-y-auto">
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
                  whileHover={{ backgroundColor: "var(--bg-elevated)" }}
                  className="p-4 transition-colors cursor-pointer group"
                  onClick={toggleExpand}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white mb-2 group-hover:text-cyan transition-colors line-clamp-2">
                        {query.question}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)] flex-wrap font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(query.createdAt)}
                        </span>
                        {query.confidence !== null && query.confidence !== undefined && (
                          <span
                            className={`flex items-center gap-1 ${
                              query.confidence > 0.7
                                ? "text-[#00ff88]"
                                : query.confidence > 0.5
                                ? "text-amber"
                                : "text-coral"
                            }`}
                          >
                            <TrendingUp className="h-3 w-3" />
                            {(query.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                        {query.bestMarketId && (
                          <span className="text-[var(--text-muted)]">
                            ID: {query.bestMarketId.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                    </motion.div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && query.parsedClaim && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-4 pt-4 border-t border-subtle space-y-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div>
                        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-mono mb-1">
                          Parsed Claim
                        </div>
                        <div className="text-sm text-[var(--text-secondary)]">
                          {query.parsedClaim.claim}
                        </div>
                      </div>
                      {query.parsedClaim.must_include &&
                        query.parsedClaim.must_include.length > 0 && (
                          <div>
                            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-mono mb-2">
                              Must Include
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {query.parsedClaim.must_include.map(
                                (item: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-2.5 py-1 bg-surface border border-subtle rounded-lg text-xs text-[var(--text-secondary)] font-mono"
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
          <div ref={loadMoreRef} className="py-6 text-center border-t border-subtle">
            {loadingMore ? (
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
      </motion.div>
    </div>
  );
}
