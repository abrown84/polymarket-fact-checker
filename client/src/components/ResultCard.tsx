import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import CollapsibleClaim from "./CollapsibleClaim";
import MarketCard from "./MarketCard";
import ConfidenceBadge from "./ConfidenceBadge";
import MarketRow from "./MarketRow";
import NewsSources from "./NewsSources";
import TwitterFeed from "./TwitterFeed";
import RedditFeed from "./RedditFeed";
import TikTokFeed from "./TikTokFeed";
import InstagramFeed from "./InstagramFeed";
import YouTubeFeed from "./YouTubeFeed";
import GoogleTrendsFeed from "./GoogleTrendsFeed";
import KalshiMarkets from "./KalshiMarkets";
import MarketsSection from "./MarketsSection";
import DataSourceOverview from "./DataSourceOverview";
import { TrendingUp, TrendingDown, BarChart3, ExternalLink, Clock, AlertCircle, ChevronDown, ChevronUp, Grid3x3, List, Activity, AlertTriangle, Info, Shield, CheckCircle } from "lucide-react";
import { AnomalyDisplay } from "./AnomalyDisplay";
import { EnsembleDisplay } from "./EnsembleDisplay";
import { FusionDisplay } from "./FusionDisplay";
import { MomentumDisplay } from "./MomentumDisplay";
import { GraphDisplay } from "./GraphDisplay";
import { CascadeDisplay } from "./CascadeDisplay";

interface ResultCardProps {
  result: any;
  showDebug: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
  show: { 
    opacity: 1, 
    y: 0, 
    filter: "blur(0px)",
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 25 
    } 
  }
};

export default function ResultCard({ result, showDebug }: ResultCardProps) {
  const { parsedClaim, answer, bestMarket, alternatives, marketSentiment, newsArticles, tweets, redditPosts, tiktokVideos, instagramPosts, youtubeVideos, googleTrends, kalshiMarkets, expiringMarkets, targetDate, sentiment, risk, fusion, momentum, anomalies, ensemble, graph, cascade, insights } = result;
  const [expandedMarkets, setExpandedMarkets] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeSourceTab, setActiveSourceTab] = useState<string | null>(null);
  
  const toggleMarketExpansion = (marketId: string) => {
    setExpandedMarkets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(marketId)) {
        newSet.delete(marketId);
      } else {
        newSet.add(marketId);
      }
      return newSet;
    });
  };

  // Organize data sources
  const dataSources = [
    { key: "markets", label: "Markets", component: (bestMarket || alternatives?.length) ? <MarketsSection bestMarket={bestMarket} alternatives={alternatives} /> : null, count: (bestMarket ? 1 : 0) + (alternatives?.length || 0) },
    { key: "news", label: "News", component: newsArticles && newsArticles.length > 0 ? <NewsSources articles={newsArticles} /> : null, count: newsArticles?.length || 0 },
    { key: "twitter", label: "Twitter", component: tweets && tweets.length > 0 ? <TwitterFeed tweets={tweets} /> : null, count: tweets?.length || 0 },
    { key: "reddit", label: "Reddit", component: redditPosts && redditPosts.length > 0 ? <RedditFeed posts={redditPosts} /> : null, count: redditPosts?.length || 0 },
    { key: "tiktok", label: "TikTok", component: tiktokVideos && tiktokVideos.length > 0 ? <TikTokFeed videos={tiktokVideos} /> : null, count: tiktokVideos?.length || 0 },
    { key: "instagram", label: "Instagram", component: instagramPosts && instagramPosts.length > 0 ? <InstagramFeed posts={instagramPosts} /> : null, count: instagramPosts?.length || 0 },
    { key: "youtube", label: "YouTube", component: youtubeVideos && youtubeVideos.length > 0 ? <YouTubeFeed videos={youtubeVideos} /> : null, count: youtubeVideos?.length || 0 },
    { key: "googletrends", label: "Google Trends", component: googleTrends && googleTrends.length > 0 ? <GoogleTrendsFeed trends={googleTrends} /> : null, count: googleTrends?.length || 0 },
    { key: "kalshi", label: "Kalshi", component: kalshiMarkets && kalshiMarkets.length > 0 ? <KalshiMarkets markets={kalshiMarkets} /> : null, count: kalshiMarkets?.length || 0 },
  ].filter(ds => ds.count > 0);

  const totalEvidenceCount = dataSources.reduce((sum, ds) => sum + ds.count, 0);
  const citationCount = (newsArticles?.length || 0) + (kalshiMarkets?.length || 0) + (googleTrends?.length || 0);
  const confidenceValue = answer?.confidence ?? 0;
  const weakEvidenceReasons: string[] = [];
  if (confidenceValue < 0.5) weakEvidenceReasons.push("model confidence below 50%.");
  if (citationCount < 3) weakEvidenceReasons.push("fewer than 3 citation-backed sources.");
  if (totalEvidenceCount < 5) weakEvidenceReasons.push("fewer than 5 total corroborating signals.");
  const hasWeakEvidence = weakEvidenceReasons.length > 0;
  const citations = [
    ...(newsArticles || []).slice(0, 5).map((n: any) => ({
      label: n.source || "News",
      title: n.title,
      url: n.url,
      snippet: n.snippet,
    })),
    ...(kalshiMarkets || []).slice(0, 2).map((k: any) => ({
      label: "Kalshi",
      title: k.title,
      url: k.url,
      snippet: null,
    })),
  ].filter((c) => c.url);

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Data Source Overview */}
      <motion.div variants={itemVariants}>
        <DataSourceOverview
          newsArticles={newsArticles}
          tweets={tweets}
          redditPosts={redditPosts}
          tiktokVideos={tiktokVideos}
          instagramPosts={instagramPosts}
          youtubeVideos={youtubeVideos}
          googleTrends={googleTrends}
          kalshiMarkets={kalshiMarkets}
          bestMarket={bestMarket}
          alternatives={alternatives}
        />
      </motion.div>

      {/* Evidence & Citation Status */}
      <motion.div
        variants={itemVariants}
        className={`rounded-xl p-4 border ${hasWeakEvidence ? "bg-amber-500/10 border-amber-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-white">Evidence Status</div>
            <div className="text-xs text-[#aaa] mt-1">
              {citationCount} citation-backed sources • {totalEvidenceCount} total signals
            </div>
            {hasWeakEvidence ? (
              <div className="text-sm text-amber-300 mt-2">
                Weak evidence state: treat this answer as directional, not definitive.
                <ul className="mt-2 list-disc pl-5 text-xs text-amber-200/90 space-y-1">
                  {weakEvidenceReasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-sm text-emerald-300 mt-2">
                Evidence quality is acceptable for a high-confidence read.
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs text-[#888]">Model confidence</div>
            <div className={`text-lg font-bold ${hasWeakEvidence ? "text-amber-300" : "text-emerald-300"}`}>
              {(confidenceValue * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </motion.div>

      {citations.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="rounded-xl p-4 border bg-[#0a0a0a] border-[#1a1a1a]"
        >
          <div className="text-sm font-semibold text-white mb-3">Top Citations</div>
          <div className="space-y-2">
            {citations.slice(0, 4).map((c, idx) => (
              <a
                key={`${c.url}-${idx}`}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 rounded border border-[#1a1a1a] hover:border-emerald-500/40 hover:bg-[#111] transition-colors"
              >
                <div className="text-xs text-emerald-400">{c.label}</div>
                <div className="text-sm text-white line-clamp-1">{c.title}</div>
                {c.snippet && <div className="text-xs text-[#888] line-clamp-2 mt-1">{c.snippet}</div>}
              </a>
            ))}
          </div>
        </motion.div>
      )}

      {/* Top Summary Bar - Key Metrics at a Glance */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-r from-[#0a0a0a] to-[#111] border border-[#1a1a1a] rounded-xl p-5 shadow-lg shadow-black/10"
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs border border-[#2a3441] bg-[#111] text-[#ddd]">
            Citations: {citationCount}
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs border border-[#2a3441] bg-[#111] text-[#ddd]">
            Evidence signals: {totalEvidenceCount}
          </span>
          {hasWeakEvidence ? (
            <span className="px-2.5 py-1 rounded-full text-xs border border-amber-500/40 bg-amber-500/10 text-amber-300">
              Weak evidence
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
              Evidence OK
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Confidence */}
          <motion.div 
            className="flex items-center justify-between p-3 bg-[#111] rounded-lg border border-[#1a1a1a] hover:border-emerald-500/50 hover:bg-[#0f1419] cursor-pointer transition-all group"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
            title="Overall confidence in the analysis"
          >
            <div>
              <div className="text-xs text-[#888] uppercase tracking-wide mb-1 group-hover:text-emerald-400 transition-colors">Confidence</div>
              <motion.div 
                className="text-2xl font-bold text-white"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                {(answer.confidence * 100).toFixed(0)}%
              </motion.div>
            </div>
            <BarChart3 className="w-8 h-8 text-emerald-500/50 group-hover:text-emerald-400 transition-colors" />
          </motion.div>

          {/* Market Probability */}
          <motion.div 
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all group ${
              answer.probYes !== null
                ? (answer.probYes > 50 
                    ? "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/15" 
                    : "bg-red-500/10 border-red-500/30 hover:border-red-500/50 hover:bg-red-500/15")
                : "bg-[#111] border-[#1a1a1a] hover:border-[#2a3441]"
            }`}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
            title={`Market-implied probability: ${answer.probYes !== null ? answer.probYes.toFixed(1) + '%' : 'Not available'}`}
          >
            <div>
              <div className={`text-xs uppercase tracking-wide mb-1 transition-colors ${
                answer.probYes !== null
                  ? (answer.probYes > 50 ? "text-[#888] group-hover:text-emerald-400" : "text-[#888] group-hover:text-red-400")
                  : "text-[#888]"
              }`}>Probability</div>
              {answer.probYes !== null ? (
                <motion.div 
                  className={`text-2xl font-bold ${
                    answer.probYes > 0.5 ? 'text-emerald-500' : 'text-red-500'
                  }`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                >
                  {(answer.probYes * 100).toFixed(1)}%
                </motion.div>
              ) : (
                <div className="text-lg font-semibold text-[#666]">
                  Unavailable
                </div>
              )}
            </div>
            {answer.probYes !== null ? (
              answer.probYes > 0.5 ? (
                <motion.div
                  animate={{ y: [0, -3, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  <TrendingUp className="w-8 h-8 text-emerald-500/50 group-hover:text-emerald-400 transition-colors" />
                </motion.div>
              ) : (
                <motion.div
                  animate={{ y: [0, 3, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  <TrendingDown className="w-8 h-8 text-red-500/50 group-hover:text-red-400 transition-colors" />
                </motion.div>
              )
            ) : (
              <AlertCircle className="w-8 h-8 text-[#666]/50" />
            )}
          </motion.div>

          {/* Best Market Match */}
          {bestMarket && (
            <div className="flex items-center justify-between p-3 bg-[#111] rounded-lg border border-emerald-500/30">
              <div>
                <div className="text-xs text-[#888] uppercase tracking-wide mb-1">Best Match</div>
                <div className="text-lg font-semibold text-white">
                  {bestMarket.matchScore ? (bestMarket.matchScore * 100).toFixed(0) : "N/A"}%
                </div>
                {bestMarket.url && (
                  <a
                    href={bestMarket.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1 mt-1"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-500/50" />
            </div>
          )}

          {/* Alternatives Count */}
          <div className="flex items-center justify-between p-3 bg-[#111] rounded-lg border border-[#1a1a1a]">
            <div>
              <div className="text-xs text-[#888] uppercase tracking-wide mb-1">Alternatives</div>
              <div className="text-2xl font-bold text-white">
                {alternatives?.length || 0}
              </div>
            </div>
            <BarChart3 className="w-8 h-8 text-[#666]" />
          </div>
        </div>
      </motion.div>

      {/* Answer Summary - Enhanced Design */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-br from-[#0a0a0a] to-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden shadow-lg shadow-black/20"
      >
        {/* Header with confidence badge */}
        <div className="p-6 border-b border-[#1a1a1a] bg-gradient-to-r from-[#111] to-[#0a0a0a]">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-[#ddd] bg-clip-text text-transparent">Analysis</h2>
            <ConfidenceBadge confidence={answer.confidence} />
          </div>
          {answer.ambiguity && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-[#888]">Ambiguity:</span>
              <span className={`font-medium ${
                answer.ambiguity === "low" ? "text-emerald-500" :
                answer.ambiguity === "medium" ? "text-yellow-500" : "text-red-500"
              }`}>
                {answer.ambiguity.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Main Answer Content - Clean Narrative Style */}
        <div className="p-6">
          {/* Market Probability Context - If Available */}
          {answer.probYes !== null && bestMarket && (
            <div className="mb-6 p-4 bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-500 uppercase tracking-wide">
                  Market Consensus
                </span>
              </div>
              <p className="text-lg text-white font-medium">
                Traders are pricing this at <span className="text-emerald-400 font-bold">{answer.probYes.toFixed(1)}%</span> probability
                {bestMarket.evidence?.volume && (
                  <span className="text-[#888] text-base font-normal">
                    {" "}with ${(bestMarket.evidence.volume / 1000).toFixed(0)}K in volume
                  </span>
                )}
              </p>
              {marketSentiment && (
                <div className="mt-2 text-sm text-[#bbb]">
                  <span className="text-[#888]">Sentiment:</span>{" "}
                  <span className={`font-semibold ${marketSentiment.label === "bullish" ? "text-emerald-400" : marketSentiment.label === "bearish" ? "text-red-400" : "text-[#ddd]"}`}>
                    {marketSentiment.label.toUpperCase()}
                  </span>
                  <span className="text-[#444]">{" • "}</span>
                  <span className="tabular-nums text-[#888]">
                    1h: {marketSentiment.delta1h !== null ? `${marketSentiment.delta1h >= 0 ? "+" : ""}${marketSentiment.delta1h.toFixed(1)}pp` : "N/A"}
                  </span>
                  <span className="text-[#444]">{" • "}</span>
                  <span className="tabular-nums text-[#888]">
                    24h: {marketSentiment.delta24h !== null ? `${marketSentiment.delta24h >= 0 ? "+" : ""}${marketSentiment.delta24h.toFixed(1)}pp` : "N/A"}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* AI Reasoning - Show how the AI arrived at its answer */}
          {answer.reasoning && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-[#0a0a0a] border border-[#2a3441] rounded-lg"
            >
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-blue-400 uppercase tracking-wide">
                  Analysis Reasoning
                </span>
              </div>
              <div className="text-sm text-[#999] leading-relaxed whitespace-pre-line">
                {answer.reasoning}
              </div>
            </motion.div>
          )}

          {/* Key Insight - Single most important takeaway */}
          {answer.keyInsight && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/30 rounded-lg"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                  Key Insight
                </span>
              </div>
              <p className="text-[#ddd] font-medium">{answer.keyInsight}</p>
            </motion.div>
          )}

          {/* Main Answer Text - Clean, Readable Format */}
          <div className="prose prose-invert max-w-none">
            <div className="text-[#ddd] leading-relaxed text-base space-y-4">
              {answer.summary.split('\n\n').map((paragraph: string, idx: number) => (
                paragraph.trim() && (
                  <motion.p
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="text-[#ddd] leading-relaxed"
                  >
                    {paragraph.trim()}
                  </motion.p>
                )
              ))}
            </div>
          </div>

          {/* Caveats - Important limitations */}
          {answer.caveats && answer.caveats.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-[#1a0a0a] border border-red-900/30 rounded-lg"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold text-red-400 uppercase tracking-wide">
                  Important Caveats
                </span>
              </div>
              <ul className="space-y-1">
                {answer.caveats.map((caveat: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-[#999]">
                    <span className="text-red-400 mt-1">•</span>
                    <span>{caveat}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Best Market Link - Prominent */}
          {bestMarket && bestMarket.url && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 pt-6 border-t border-[#1a1a1a]"
            >
              <a
                href={bestMarket.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 rounded-lg text-emerald-400 hover:text-emerald-300 transition-all group"
              >
                <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                <span className="font-medium">View Market on Polymarket</span>
              </a>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Parsed Claim - Compact */}
      <motion.div variants={itemVariants}>
        <CollapsibleClaim parsedClaim={parsedClaim} />
      </motion.div>

      {/* Algorithm Results - Applied Automatically */}
      {(sentiment || risk || fusion || momentum || anomalies || ensemble || graph || cascade || insights) && (
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="border-t border-[#1a1a1a] pt-6">
            <h2 className="text-xl font-semibold text-white mb-4">Advanced Analysis</h2>
            
            {/* Key Insights */}
            {insights && insights.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/30 rounded-xl p-6 mb-6"
              >
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  Key Insights
                </h3>
                <ul className="space-y-2">
                  {insights.map((insight: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                      <span className="text-gray-300">{insight}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Sentiment & Risk Grid */}
            {(sentiment || risk) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {sentiment && (
                  <div className="bg-[#1c2127] border border-[#2a3441] rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={sentiment.overall === "positive" ? "text-emerald-400" : sentiment.overall === "negative" ? "text-red-400" : "text-yellow-400"}>
                        {sentiment.overall === "positive" ? <TrendingUp className="w-5 h-5" /> : sentiment.overall === "negative" ? <TrendingDown className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                      </div>
                      <h3 className="text-lg font-semibold text-white">Sentiment Analysis</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-400">Overall Sentiment</span>
                          <span className={`text-lg font-bold ${sentiment.overall === "positive" ? "text-emerald-400" : sentiment.overall === "negative" ? "text-red-400" : "text-yellow-400"}`}>
                            {sentiment.overall.toUpperCase()}
                          </span>
                        </div>
                        <div className="w-full bg-[#2a3441] rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              sentiment.score > 0 ? "bg-emerald-400" : sentiment.score < 0 ? "bg-red-400" : "bg-yellow-400"
                            }`}
                            style={{ width: `${Math.abs(sentiment.score) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#2a3441]">
                        <div>
                          <div className="text-xs text-gray-400 mb-1">News</div>
                          <div className="text-sm font-medium text-white">
                            {(sentiment.breakdown.news * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Social</div>
                          <div className="text-sm font-medium text-white">
                            {(sentiment.breakdown.social * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Market</div>
                          <div className="text-sm font-medium text-white">
                            {(sentiment.breakdown.market * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {risk && (
                  <div className="bg-[#1c2127] border border-[#2a3441] rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={risk.overall === "high" ? "text-red-400" : risk.overall === "medium" ? "text-yellow-400" : "text-emerald-400"}>
                        {risk.overall === "high" ? <AlertTriangle className="w-5 h-5" /> : risk.overall === "medium" ? <Info className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                      </div>
                      <h3 className="text-lg font-semibold text-white">Risk Assessment</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-400">Overall Risk</span>
                          <span className={`text-lg font-bold ${risk.overall === "high" ? "text-red-400" : risk.overall === "medium" ? "text-yellow-400" : "text-emerald-400"}`}>
                            {risk.overall.toUpperCase()}
                          </span>
                        </div>
                        <div className="w-full bg-[#2a3441] rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              risk.score > 0.6 ? "bg-red-400" : risk.score > 0.4 ? "bg-yellow-400" : "bg-emerald-400"
                            }`}
                            style={{ width: `${risk.score * 100}%` }}
                          />
                        </div>
                      </div>
                      {risk.factors && risk.factors.length > 0 && (
                        <div className="space-y-2 pt-4 border-t border-[#2a3441]">
                          <div className="text-sm font-medium text-gray-300 mb-3">Risk Factors</div>
                          {risk.factors.slice(0, 3).map((factor: any, idx: number) => (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg border ${
                                factor.level === "high" ? "text-red-400 border-red-400/20 bg-red-400/10" :
                                factor.level === "medium" ? "text-yellow-400 border-yellow-400/20 bg-yellow-400/10" :
                                "text-emerald-400 border-emerald-400/20 bg-emerald-400/10"
                              }`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-sm font-medium">{factor.name}</span>
                                <span className="text-xs font-semibold">{factor.level.toUpperCase()}</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">{factor.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Fusion, Ensemble, Anomalies Grid */}
            {(fusion || ensemble || anomalies) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {fusion && <FusionDisplay fusion={fusion} />}
                {ensemble && <EnsembleDisplay ensemble={ensemble} />}
                {anomalies && <AnomalyDisplay anomalies={anomalies} />}
              </div>
            )}

            {/* Momentum, Graph, Cascade Analysis */}
            {(momentum || graph || cascade) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {momentum && <MomentumDisplay momentum={momentum} />}
                {cascade && <CascadeDisplay cascade={cascade} />}
                {graph && <GraphDisplay graph={graph} />}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Data Sources - Organized View */}
      {dataSources.length > 0 && (
        <motion.div variants={itemVariants} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden">
          {/* Header with View Toggle */}
          <div className="p-4 md:p-5 border-b border-[#1a1a1a] bg-[#111]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">All Data Sources</h2>
                <p className="text-sm text-[#888] mt-1">
                  {dataSources.reduce((sum, ds) => sum + ds.count, 0)} items across {dataSources.length} source{dataSources.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 self-start md:self-auto">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "grid"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-[#0a0a0a] text-[#666] border border-[#1a1a1a] hover:border-[#2a3441]"
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "list"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-[#0a0a0a] text-[#666] border border-[#1a1a1a] hover:border-[#2a3441]"
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Source Tabs */}
            <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
              <button
                onClick={() => setActiveSourceTab(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeSourceTab === null
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-[#0a0a0a] text-[#888] border border-[#1a1a1a] hover:border-[#2a3441] hover:text-white"
                }`}
              >
                All ({dataSources.reduce((sum, ds) => sum + ds.count, 0)})
              </button>
              {dataSources.map((source) => (
                <button
                  key={source.key}
                  onClick={() => setActiveSourceTab(source.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    activeSourceTab === source.key
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-[#0a0a0a] text-[#888] border border-[#1a1a1a] hover:border-[#2a3441] hover:text-white"
                  }`}
                >
                  {source.label} ({source.count})
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6">
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {dataSources
                  .filter(ds => activeSourceTab === null || activeSourceTab === ds.key)
                  .map((source, index) => (
                    <motion.div
                      key={source.key}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {source.component}
                    </motion.div>
                  ))}
              </div>
            ) : (
              <div className="space-y-6">
                {dataSources
                  .filter(ds => activeSourceTab === null || activeSourceTab === ds.key)
                  .map((source, index) => (
                    <motion.div
                      key={source.key}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {source.component}
                    </motion.div>
                  ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Markets Comparison Table - Show All Markets at Once */}
      {(bestMarket || (alternatives && alternatives.length > 0)) && (
        <motion.div
          variants={itemVariants}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden"
        >
          <div className="p-4 border-b border-[#1a1a1a] bg-[#111]">
            <h3 className="text-lg font-semibold text-white">Market Comparison</h3>
            <p className="text-xs text-[#888] mt-1">All matching markets with key metrics</p>
          </div>
          
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
      )}

      {/* Expiring Markets Section - Show markets closing on the queried date */}
      {expiringMarkets && expiringMarkets.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/30 rounded-lg overflow-hidden"
        >
          <div className="p-4 border-b border-orange-500/30 bg-orange-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Clock className="h-5 w-5 text-orange-500" />
                </motion.div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Markets Expiring {targetDate ? new Date(targetDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'Soon'}
                  </h3>
                  <p className="text-xs text-[#888] mt-1">
                    {expiringMarkets.length} market{expiringMarkets.length !== 1 ? 's' : ''} closing on this date
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 rounded-full border border-orange-500/30">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-500">Expiring</span>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-orange-500/20 bg-orange-500/5">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#888] uppercase tracking-wide">Market</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#888] uppercase tracking-wide">Probability</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#888] uppercase tracking-wide">Volume</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#888] uppercase tracking-wide">Liquidity</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#888] uppercase tracking-wide">Expires</th>
                </tr>
              </thead>
              <tbody>
                {expiringMarkets.map((market: any) => (
                  <MarketRow 
                    key={market.polymarketMarketId || market._id} 
                    market={market} 
                  />
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}


      {/* Detailed Best Market Card - Expandable Details */}
      {bestMarket && (() => {
        const marketId = bestMarket.polymarketMarketId || bestMarket._id || 'best';
        const isExpanded = expandedMarkets.has(marketId);
        
        return (
          <motion.div variants={itemVariants}>
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden">
              {/* Collapsed Header - Always Visible */}
              <motion.div
                onClick={() => toggleMarketExpansion(marketId)}
                className="p-4 cursor-pointer hover:bg-[#111] transition-colors"
                whileHover={{ backgroundColor: "rgba(17, 17, 17, 0.5)" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <motion.div
                      animate={{ scale: isExpanded ? [1, 1.1, 1] : 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[#888] flex-shrink-0" />
                      )}
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-white truncate">
                          {bestMarket.title || bestMarket.question}
                        </h3>
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-500 text-xs font-medium rounded flex-shrink-0">
                          Best Match
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[#888]">
                        {bestMarket.evidence?.chanceYes !== null && bestMarket.evidence?.chanceYes !== undefined && (
                          <span className={`font-medium ${
                            bestMarket.evidence.chanceYes > 0.5 ? 'text-emerald-500' : 'text-red-500'
                          }`}>
                            {(bestMarket.evidence.chanceYes * 100).toFixed(1)}%
                          </span>
                        )}
                        {bestMarket.matchScore !== undefined && (
                          <span className="text-[#666]">
                            Match: {(bestMarket.matchScore * 100).toFixed(0)}%
                          </span>
                        )}
                        {bestMarket.evidence?.volume && (
                          <span className="text-[#666]">
                            Vol: ${(bestMarket.evidence.volume / 1000).toFixed(0)}K
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {bestMarket.url && (
                    <a
                      href={bestMarket.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="ml-4 text-emerald-500 hover:text-emerald-400 transition-colors flex-shrink-0"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </motion.div>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0 border-t border-[#1a1a1a]">
                      <MarketCard
                        market={bestMarket}
                        isBest={true}
                        showDebug={showDebug}
                        debug={result.debug}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })()}

      {/* Debug Info */}
      {showDebug && result.debug && (
        <motion.div
          variants={itemVariants}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4"
        >
          <h4 className="font-semibold text-white mb-2">Debug Info</h4>
          <pre className="text-xs text-[#888] overflow-auto max-h-96">
            {JSON.stringify(result.debug, null, 2)}
          </pre>
        </motion.div>
      )}
    </motion.div>
  );
}
