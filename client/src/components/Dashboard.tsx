import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Activity, Clock, ArrowRight, ExternalLink, Flame, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import MiniMarketChart from "./MiniMarketChart";

export default function Dashboard() {
  const stats = useQuery(api.queries.getDashboardStats);
  const recentQueries = useQuery(api.queries.getRecentQueries, { limit: 20 });
  const getPopularMarketsWithPrices = useAction(api.actions.getPopularMarkets.getPopularMarketsWithPrices);
  const ingestMarkets = useAction(api.actions.ingestMarkets.ingestMarkets);
  const testApiResponse = useAction(api.actions.testApiResponse.testApiResponse);
  const testApiEndpoints = useAction(api.actions.testApiEndpoints.testApiEndpoints);
  const cleanupOldMarkets = useAction(api.actions.cleanupOldMarkets.cleanupOldMarkets);
  const [popularMarkets, setPopularMarkets] = useState<any[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);
  const [apiTestResult, setApiTestResult] = useState<any>(null);
  const [testingApi, setTestingApi] = useState(false);
  const [endpointTestResult, setEndpointTestResult] = useState<any>(null);
  const [testingEndpoints, setTestingEndpoints] = useState(false);
  const [expandedMarkets, setExpandedMarkets] = useState<Set<string>>(new Set());
  const [expandedQueries, setExpandedQueries] = useState<Set<string>>(new Set());
  const [cleaningUp, setCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<any>(null);

  useEffect(() => {
    const fetchPopularMarkets = async () => {
      try {
        setLoadingMarkets(true);
        console.log("Fetching popular markets from database...");
        // Use database markets by default (useDatabase: true)
        const result = await getPopularMarketsWithPrices({ limit: 10, useDatabase: true });
        console.log("Popular markets result:", result);
        setPopularMarkets(result.markets || []);
      } catch (error: any) {
        console.error("Error fetching popular markets:", error);
        setPopularMarkets([]);
      } finally {
        setLoadingMarkets(false);
      }
    };

    fetchPopularMarkets();
    // Refresh every 2 minutes
    const interval = setInterval(fetchPopularMarkets, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [getPopularMarketsWithPrices]);

  const handleIngestMarkets = async () => {
    try {
      setIngesting(true);
      setIngestStatus("Starting market ingestion (bypassing cache)...");
      // Always bypasses cache to get fresh data
      const result = await ingestMarkets({ cursor: null, limit: 50 });
      
      if (result.processed === 0) {
        let errorMsg = `No markets processed. `;
        if (result.error) {
          errorMsg += `Error: ${result.error}. `;
        }
        if (result.skipped && result.skipped > 0) {
          errorMsg += `Skipped ${result.skipped} markets. `;
          if (result.skipReasons) {
            errorMsg += `Reasons: ${Object.entries(result.skipReasons).map(([k, v]) => `${k} (${v})`).join(", ")}. `;
          }
        }
        errorMsg += `Check browser console and Convex logs for details.`;
        setIngestStatus(errorMsg);
      } else {
        setIngestStatus(`Successfully processed ${result.processed} markets${result.done ? "" : " (more available)"}`);
        // Refresh stats after ingestion
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error: any) {
      console.error("Error ingesting markets:", error);
      setIngestStatus(`Error: ${error.message || "Failed to ingest markets"}`);
    } finally {
      setIngesting(false);
    }
  };

  const handleTestApi = async () => {
    try {
      setTestingApi(true);
      setApiTestResult(null);
      console.log("Testing API response...");
      const result = await testApiResponse({});
      console.log("API test result:", result);
      setApiTestResult(result);
    } catch (error: any) {
      console.error("Error testing API:", error);
      setApiTestResult({ success: false, error: error.message || "Failed to test API" });
    } finally {
      setTestingApi(false);
    }
  };

  const handleTestEndpoints = async () => {
    try {
      setTestingEndpoints(true);
      setEndpointTestResult(null);
      console.log("Testing API endpoints...");
      const result = await testApiEndpoints({});
      console.log("Endpoint test result:", result);
      setEndpointTestResult(result);
    } catch (error: any) {
      console.error("Error testing endpoints:", error);
      setEndpointTestResult({ success: false, error: error.message || "Failed to test endpoints" });
    } finally {
      setTestingEndpoints(false);
    }
  };

  const handleCleanupOldMarkets = async (dryRun: boolean = false) => {
    try {
      setCleaningUp(true);
      setCleanupResult(null);
      console.log(`Cleaning up old markets (dryRun: ${dryRun})...`);
      const result = await cleanupOldMarkets({
        deleteExpired: true,
        deleteOlderThanDays: 90,
        dryRun,
      });
      console.log("Cleanup result:", result);
      setCleanupResult(result);
      
      if (!dryRun && result.deletedMarkets > 0) {
        // Refresh stats after cleanup
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error: any) {
      console.error("Error cleaning up markets:", error);
      setCleanupResult({ error: error.message || "Failed to clean up markets" });
    } finally {
      setCleaningUp(false);
    }
  };

  if (!stats || !recentQueries) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
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
      {/* Data Update Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Update Market Data</h3>
            <p className="text-sm text-[#888]">Fetch and ingest latest markets from Polymarket</p>
            {ingestStatus && (
              <p className={`text-sm mt-2 ${ingestStatus.includes("Error") ? "text-red-500" : "text-emerald-500"}`}>
                {ingestStatus}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleTestEndpoints}
              disabled={testingEndpoints}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-[#1a1a1a] disabled:text-[#666] text-white rounded-lg transition-colors font-medium"
            >
              <RefreshCw className={`h-4 w-4 ${testingEndpoints ? "animate-spin" : ""}`} />
              {testingEndpoints ? "Testing..." : "Find Endpoints"}
            </button>
            <button
              onClick={handleTestApi}
              disabled={testingApi}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-[#1a1a1a] disabled:text-[#666] text-white rounded-lg transition-colors font-medium"
            >
              <RefreshCw className={`h-4 w-4 ${testingApi ? "animate-spin" : ""}`} />
              {testingApi ? "Testing..." : "Test API"}
            </button>
            <button
              onClick={handleIngestMarkets}
              disabled={ingesting}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-[#1a1a1a] disabled:text-[#666] text-white rounded-lg transition-colors font-medium"
            >
              <RefreshCw className={`h-4 w-4 ${ingesting ? "animate-spin" : ""}`} />
              {ingesting ? "Updating..." : "Update Data"}
            </button>
            <button
              onClick={() => handleCleanupOldMarkets(true)}
              disabled={cleaningUp}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-[#1a1a1a] disabled:text-[#666] text-white rounded-lg transition-colors font-medium"
            >
              {cleaningUp ? "Checking..." : "Check Old Data"}
            </button>
          </div>
        </div>
        
        {cleanupResult && (
          <div className="mt-4 p-4 bg-[#111] rounded-lg border border-[#1a1a1a]">
            <h4 className="text-sm font-semibold text-white mb-2">
              {cleanupResult.dryRun ? "Cleanup Preview:" : "Cleanup Results:"}
            </h4>
            <div className="space-y-2 text-xs">
              {cleanupResult.dryRun ? (
                <>
                  <div className="text-yellow-500">
                    Would delete {cleanupResult.marketsToDelete} markets and {cleanupResult.embeddingsToDelete} embeddings
                  </div>
                  {cleanupResult.details && cleanupResult.details.length > 0 && (
                    <div className="mt-2">
                      <div className="text-white font-medium mb-1">Sample markets to delete:</div>
                      {cleanupResult.details.map((m: any, idx: number) => (
                        <div key={idx} className="text-[#888] ml-2">
                          • {m.title} ({m.reason})
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => handleCleanupOldMarkets(false)}
                    disabled={cleaningUp}
                    className="mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-[#1a1a1a] disabled:text-[#666] text-white rounded-lg transition-colors font-medium text-sm"
                  >
                    {cleaningUp ? "Deleting..." : "Confirm Delete"}
                  </button>
                </>
              ) : (
                <>
                  <div className="text-emerald-500">
                    ✓ {cleanupResult.message || `Deleted ${cleanupResult.deletedMarkets} markets and ${cleanupResult.deletedEmbeddings} embeddings`}
                  </div>
                  {cleanupResult.errors > 0 && (
                    <div className="text-yellow-500">
                      ⚠ {cleanupResult.errors} errors occurred during cleanup
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        
        {endpointTestResult && (
          <div className="mt-4 p-4 bg-[#111] rounded-lg border border-[#1a1a1a]">
            <h4 className="text-sm font-semibold text-white mb-2">Endpoint Test Results:</h4>
            {endpointTestResult.bestEndpoints && endpointTestResult.bestEndpoints.length > 0 ? (
              <div className="space-y-3 text-xs">
                <div className="text-emerald-500">✓ Found {endpointTestResult.bestEndpoints.length} endpoints with active markets</div>
                <div className="space-y-2">
                  <div className="text-white font-medium">Best Endpoints:</div>
                  {endpointTestResult.bestEndpoints.map((ep: any, idx: number) => (
                    <div key={idx} className="p-2 bg-[#0a0a0a] rounded border border-[#1a1a1a]">
                      <div className="text-emerald-400 font-medium">{ep.endpoint}</div>
                      <div className="text-[#888] mt-1">Active: {ep.activeMarkets} / Total: {ep.totalMarkets}</div>
                      <div className="text-[#666] text-xs mt-1 break-all">{ep.url}</div>
                    </div>
                  ))}
                </div>
                <details className="mt-2">
                  <summary className="text-white cursor-pointer">All Results ({endpointTestResult.totalTested} endpoints tested)</summary>
                  <pre className="mt-2 text-[#888] overflow-auto max-h-60 whitespace-pre-wrap break-words text-xs">
                    {JSON.stringify(endpointTestResult.results, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="text-yellow-500">⚠ No endpoints with active markets found</div>
                <div className="text-[#888]">Tested {endpointTestResult.totalTested} endpoints</div>
                <details className="mt-2">
                  <summary className="text-white cursor-pointer">View All Results</summary>
                  <pre className="mt-2 text-[#888] overflow-auto max-h-60 whitespace-pre-wrap break-words text-xs">
                    {JSON.stringify(endpointTestResult.results, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}
        
        {apiTestResult && (
          <div className="mt-4 p-4 bg-[#111] rounded-lg border border-[#1a1a1a]">
            <h4 className="text-sm font-semibold text-white mb-2">API Test Results:</h4>
            {apiTestResult.success ? (
              <div className="space-y-2 text-xs">
                <div className="text-emerald-500">✓ API responded successfully</div>
                <div className="text-[#888]">Status: {apiTestResult.status}</div>
                <div className="text-[#888]">URL: {apiTestResult.url}</div>
                <details className="mt-2">
                  <summary className="text-white cursor-pointer">Analysis</summary>
                  <pre className="mt-2 text-[#888] overflow-auto max-h-40">
                    {JSON.stringify(apiTestResult.analysis, null, 2)}
                  </pre>
                </details>
                <details className="mt-2">
                  <summary className="text-white cursor-pointer">Response Preview (first 2000 chars)</summary>
                  <pre className="mt-2 text-[#888] overflow-auto max-h-60 whitespace-pre-wrap break-words">
                    {apiTestResult.responsePreview}
                  </pre>
                </details>
                <details className="mt-2">
                  <summary className="text-white cursor-pointer">Full Response (check console for full JSON)</summary>
                  <p className="text-[#888] mt-2">Full response logged to browser console. Check console for complete JSON.</p>
                </details>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="text-red-500">✗ API test failed</div>
                <div className="text-[#888]">Error: {apiTestResult.error || "Unknown error"}</div>
                {apiTestResult.status && (
                  <div className="text-[#888]">Status: {apiTestResult.status} {apiTestResult.statusText}</div>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Stats Overview - Polymarket Style */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-5 hover:border-[#2a2a2a] transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#888] uppercase tracking-wide font-medium">Total Markets</span>
            <Activity className="h-4 w-4 text-[#888]" />
          </div>
          <div className="text-2xl font-semibold text-white">{stats.totalMarkets.toLocaleString()}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-5 hover:border-[#2a2a2a] transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#888] uppercase tracking-wide font-medium">Total Queries</span>
            <TrendingUp className="h-4 w-4 text-[#888]" />
          </div>
          <div className="text-2xl font-semibold text-white">{stats.totalQueries.toLocaleString()}</div>
          <div className="text-xs text-[#666] mt-1">{stats.queriesLast24h} in last 24h</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-5 hover:border-[#2a2a2a] transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#888] uppercase tracking-wide font-medium">Avg Confidence</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-semibold text-white">
            {stats.avgConfidence ? `${(stats.avgConfidence * 100).toFixed(1)}%` : "N/A"}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-5 hover:border-[#2a2a2a] transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#888] uppercase tracking-wide font-medium">Markets Updated</span>
            <Clock className="h-4 w-4 text-[#888]" />
          </div>
          <div className="text-2xl font-semibold text-white">{stats.marketsRecentlyIngested}</div>
          <div className="text-xs text-[#666] mt-1">Last 6 hours</div>
        </motion.div>
      </div>

      {/* Most Queried Market - Polymarket Style Card */}
      {stats.mostQueriedMarket && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6 hover:border-emerald-500/30 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span className="text-sm text-[#888] uppercase tracking-wide font-medium">Trending Market</span>
            </div>
            <span className="text-xs text-[#666]">{stats.mostQueriedMarket.queryCount} queries</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{stats.mostQueriedMarket.title}</h3>
          <div className="flex items-center gap-2 text-sm text-emerald-500">
            <TrendingUp className="h-4 w-4" />
            <span>Most queried market</span>
          </div>
        </motion.div>
      )}

      {/* Recent Queries Table - Polymarket Style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden"
      >
        <div className="p-5 border-b border-[#1a1a1a]">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          <p className="text-sm text-[#888] mt-1">Latest queries and fact-checks</p>
        </div>
        
        {recentQueries.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[#888]">No queries yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {recentQueries.map((query: any, index: number) => {
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
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className="p-5 hover:bg-[#111] transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0" onClick={toggleExpand}>
                      <p className="text-white font-medium mb-2 group-hover:text-emerald-400 transition-colors">
                        {query.question}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-[#888]">
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
                            {(query.confidence * 100).toFixed(0)}% confidence
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand();
                        }}
                        className="text-[#666] hover:text-emerald-500 transition-colors p-1"
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                      <ArrowRight className="h-5 w-5 text-[#666] group-hover:text-emerald-500 transition-colors" />
                    </div>
                  </div>

                  {/* Expanded Query Details */}
                  {isExpanded && query.parsedClaim && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-4 pt-4 border-t border-[#1a1a1a] space-y-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div>
                        <div className="text-xs text-[#888] uppercase tracking-wide mb-2">Parsed Claim</div>
                        <div className="text-sm text-[#ccc] mb-2">{query.parsedClaim.claim}</div>
                        {query.parsedClaim.must_include && query.parsedClaim.must_include.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-[#888] mb-1">Must Include:</div>
                            <div className="flex flex-wrap gap-2">
                              {query.parsedClaim.must_include.map((item: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-[#111] border border-[#1a1a1a] rounded text-xs text-[#ccc]"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {query.debug && (
                        <div>
                          <div className="text-xs text-[#888] uppercase tracking-wide mb-2">Debug Info</div>
                          <div className="text-xs text-[#888] font-mono bg-[#111] p-3 rounded border border-[#1a1a1a] overflow-auto max-h-40">
                            <pre>{JSON.stringify(query.debug, null, 2)}</pre>
                          </div>
                        </div>
                      )}

                      {query.bestMarketId && (
                        <div>
                          <div className="text-xs text-[#888] uppercase tracking-wide mb-1">Best Market ID</div>
                          <div className="text-xs text-[#ccc] font-mono break-all">{query.bestMarketId}</div>
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

      {/* Popular Markets Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden"
      >
        <div className="p-5 border-b border-[#1a1a1a]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-white">Popular Markets</h2>
            </div>
            <span className="text-xs text-[#888]">Live from Polymarket</span>
          </div>
        </div>

        {loadingMarkets ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
            <p className="text-[#888] mt-4">Loading popular markets...</p>
          </div>
        ) : popularMarkets.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[#888]">No popular markets available</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {popularMarkets.map((market, index) => {
              const isExpanded = expandedMarkets.has(market.id);
              const toggleExpand = () => {
                const newExpanded = new Set(expandedMarkets);
                if (isExpanded) {
                  newExpanded.delete(market.id);
                } else {
                  newExpanded.add(market.id);
                }
                setExpandedMarkets(newExpanded);
              };

              return (
                <motion.div
                  key={market.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="p-5 hover:bg-[#111] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 
                          className="text-white font-medium hover:text-emerald-400 transition-colors cursor-pointer flex-1"
                          onClick={toggleExpand}
                        >
                          {market.question}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {market.url && (
                            <a
                              href={market.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-500 hover:text-emerald-400 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          <button
                            onClick={toggleExpand}
                            className="text-[#888] hover:text-white transition-colors p-1"
                            aria-label={isExpanded ? "Collapse" : "Expand"}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 flex-wrap mt-3">
                        {market.priceYes !== null && market.priceYes !== undefined && (
                          <div className={`flex items-center gap-2 ${
                            market.priceYes > 0.5 ? 'text-emerald-500' : 'text-red-500'
                          }`}>
                            <TrendingUp className="h-4 w-4" />
                            <span className="font-semibold">{(market.priceYes * 100).toFixed(1)}%</span>
                            <span className="text-xs text-[#888]">YES</span>
                          </div>
                        )}
                        
                        {market.volume > 0 && (
                          <div className="flex items-center gap-2 text-[#888]">
                            <DollarSign className="h-4 w-4" />
                            <span className="text-sm">
                              {formatCurrency(market.volume)} volume
                            </span>
                          </div>
                        )}
                        
                        {market.liquidity > 0 && (
                          <div className="flex items-center gap-2 text-[#888]">
                            <Activity className="h-4 w-4" />
                            <span className="text-sm">
                              {formatCurrency(market.liquidity)} liquidity
                            </span>
                          </div>
                        )}
                        
                        {market.endDate && (
                          <div className="flex items-center gap-2 text-[#888]">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm">
                              {typeof market.endDate === 'string' 
                                ? new Date(market.endDate).toLocaleDateString()
                                : new Date(market.endDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-4 pt-4 border-t border-[#1a1a1a] space-y-4"
                        >
                          {/* Price Chart */}
                          {(market.priceYes !== null && market.priceYes !== undefined) && (
                            <div className="bg-[#111] border border-[#1a1a1a] rounded-lg p-3">
                              <div className="text-xs text-[#888] uppercase tracking-wide mb-2">Price Trend</div>
                              <MiniMarketChart 
                                priceYes={market.priceYes}
                                volume={market.volume}
                                liquidity={market.liquidity}
                              />
                            </div>
                          )}

                          {market.description && (
                            <div>
                              <div className="text-xs text-[#888] uppercase tracking-wide mb-1">Description</div>
                              <p className="text-sm text-[#ccc]">{market.description}</p>
                            </div>
                          )}

                          {market.outcomes && market.outcomes.length > 0 && (
                            <div>
                              <div className="text-xs text-[#888] uppercase tracking-wide mb-2">Outcomes</div>
                              <div className="flex flex-wrap gap-2">
                                {market.outcomes.map((outcome: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-[#111] border border-[#1a1a1a] rounded text-xs text-[#ccc]"
                                  >
                                    {outcome}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4 pt-2">
                            {market.id && (
                              <div>
                                <div className="text-xs text-[#888] uppercase tracking-wide mb-1">Market ID</div>
                                <div className="text-xs text-[#ccc] font-mono break-all">{market.id}</div>
                              </div>
                            )}
                            {market.endDate && (
                              <div>
                                <div className="text-xs text-[#888] uppercase tracking-wide mb-1">End Date</div>
                                <div className="text-xs text-[#ccc]">
                                  {typeof market.endDate === 'string' 
                                    ? new Date(market.endDate).toLocaleString()
                                    : new Date(market.endDate).toLocaleString()}
                                </div>
                              </div>
                            )}
                            {market.priceYes !== null && market.priceYes !== undefined && (
                              <div>
                                <div className="text-xs text-[#888] uppercase tracking-wide mb-1">YES Price</div>
                                <div className={`text-sm font-semibold ${
                                  market.priceYes > 0.5 ? 'text-emerald-500' : 'text-red-500'
                                }`}>
                                  {(market.priceYes * 100).toFixed(2)}%
                                </div>
                              </div>
                            )}
                            {market.spread !== null && market.spread !== undefined && (
                              <div>
                                <div className="text-xs text-[#888] uppercase tracking-wide mb-1">Spread</div>
                                <div className="text-sm text-[#ccc]">{market.spread.toFixed(4)}</div>
                              </div>
                            )}
                          </div>

                          {market.url && (
                            <div className="pt-2">
                              <a
                                href={market.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
                              >
                                View full market on Polymarket <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Additional Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-[#888] uppercase tracking-wide font-medium">System Status</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#888]">Embeddings</span>
              <span className="text-white font-medium">{stats.totalEmbeddings.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#888]">Market Coverage</span>
              <span className="text-white font-medium">
                {stats.totalMarkets > 0 
                  ? ((stats.totalEmbeddings / stats.totalMarkets) * 100).toFixed(1) 
                  : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#888]">Query Success Rate</span>
              <span className="text-emerald-500 font-medium">
                {stats.totalQueries > 0 && stats.avgConfidence 
                  ? (stats.avgConfidence * 100).toFixed(1) 
                  : 0}%
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-[#888] uppercase tracking-wide font-medium">Activity Summary</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#888]">Queries Today</span>
              <span className="text-white font-medium">{stats.queriesLast24h}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#888]">Markets Updated</span>
              <span className="text-white font-medium">{stats.marketsRecentlyIngested}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#888]">Status</span>
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-emerald-500 font-medium">Active</span>
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


