import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Network,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

interface Market {
  id: string;
  question: string;
  title?: string;
  volume?: number;
  volume24hr?: number;
  liquidity?: number;
  chanceYes?: number | null;
}

interface Query {
  _id: string;
  question: string;
  createdAt: number;
  confidence?: number;
}

interface DashboardAnalyticsProps {
  markets: Market[];
  recentQueries: Query[];
}

interface MomentumData {
  trend: "bullish" | "bearish" | "neutral";
  velocity: number;
  hotTopics: string[];
  volumeTrend: number;
}

interface ClusterData {
  name: string;
  count: number;
  avgVolume: number;
  sentiment: number;
}

interface ActivityPattern {
  hour: number;
  count: number;
  avgConfidence: number;
}

// Extract keywords from market questions
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "will", "the", "be", "to", "in", "and", "or", "of", "a", "an", "for",
    "by", "on", "at", "is", "it", "that", "this", "with", "from", "as",
    "are", "was", "were", "been", "being", "have", "has", "had", "do",
    "does", "did", "but", "if", "than", "so", "what", "when", "where",
    "who", "which", "why", "how", "before", "after", "above", "below",
    "between", "into", "through", "during", "under", "again", "further",
    "then", "once", "here", "there", "all", "each", "few", "more", "most",
    "other", "some", "such", "no", "not", "only", "own", "same", "too",
    "very", "can", "just", "should", "now", "2024", "2025", "2026",
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));
}

// Calculate market momentum from volume data
function calculateMomentum(markets: Market[]): MomentumData {
  const marketsWithVolume = markets.filter((m) => m.volume24hr && m.volume24hr > 0);

  if (marketsWithVolume.length === 0) {
    return {
      trend: "neutral",
      velocity: 0,
      hotTopics: [],
      volumeTrend: 0,
    };
  }

  // Calculate volume trend (24hr volume as % of total volume)
  const totalVolume = marketsWithVolume.reduce((sum, m) => sum + (m.volume || 0), 0);
  const total24hr = marketsWithVolume.reduce((sum, m) => sum + (m.volume24hr || 0), 0);
  const volumeTrend = totalVolume > 0 ? (total24hr / totalVolume) * 100 : 0;

  // Determine trend based on market prices
  const marketsWithPrice = markets.filter((m) => m.chanceYes !== null && m.chanceYes !== undefined);
  const avgPrice = marketsWithPrice.length > 0
    ? marketsWithPrice.reduce((sum, m) => sum + (m.chanceYes || 50), 0) / marketsWithPrice.length
    : 50;

  // Extract hot topics from high-volume markets
  const topMarkets = [...marketsWithVolume]
    .sort((a, b) => (b.volume24hr || 0) - (a.volume24hr || 0))
    .slice(0, 5);

  const topicCounts: Record<string, number> = {};
  topMarkets.forEach((market) => {
    const keywords = extractKeywords(market.question || market.title || "");
    keywords.forEach((kw) => {
      topicCounts[kw] = (topicCounts[kw] || 0) + 1;
    });
  });

  const hotTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([topic]) => topic.charAt(0).toUpperCase() + topic.slice(1));

  return {
    trend: avgPrice > 55 ? "bullish" : avgPrice < 45 ? "bearish" : "neutral",
    velocity: Math.min(volumeTrend, 100),
    hotTopics,
    volumeTrend,
  };
}

// Cluster markets by topic
function clusterMarkets(markets: Market[]): ClusterData[] {
  const categories: Record<string, Market[]> = {};

  // Define category patterns
  const categoryPatterns: [string, RegExp][] = [
    ["Politics", /trump|biden|election|president|congress|senate|democrat|republican|vote/i],
    ["Crypto", /bitcoin|btc|ethereum|eth|crypto|blockchain|token|nft/i],
    ["Sports", /nfl|nba|mlb|world cup|championship|playoff|super bowl|team|game/i],
    ["Tech", /ai|artificial intelligence|openai|google|apple|microsoft|spacex|tesla/i],
    ["Finance", /stock|market|fed|interest rate|inflation|recession|economy/i],
    ["Entertainment", /oscar|grammy|movie|film|tv|show|celebrity|award/i],
    ["World", /china|russia|ukraine|war|nato|europe|asia|conflict/i],
  ];

  markets.forEach((market) => {
    const text = (market.question || market.title || "").toLowerCase();
    let matched = false;

    for (const [category, pattern] of categoryPatterns) {
      if (pattern.test(text)) {
        if (!categories[category]) categories[category] = [];
        categories[category].push(market);
        matched = true;
        break;
      }
    }

    if (!matched) {
      if (!categories["Other"]) categories["Other"] = [];
      categories["Other"].push(market);
    }
  });

  return Object.entries(categories)
    .map(([name, categoryMarkets]) => {
      const avgVolume = categoryMarkets.reduce((sum, m) => sum + (m.volume || 0), 0) / categoryMarkets.length;
      const marketsWithPrice = categoryMarkets.filter((m) => m.chanceYes !== null);
      const avgSentiment = marketsWithPrice.length > 0
        ? marketsWithPrice.reduce((sum, m) => sum + (m.chanceYes || 50), 0) / marketsWithPrice.length
        : 50;

      return {
        name,
        count: categoryMarkets.length,
        avgVolume,
        sentiment: avgSentiment,
      };
    })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

// Analyze query activity patterns
function analyzeQueryPatterns(queries: Query[]): {
  patterns: ActivityPattern[];
  queryMomentum: number;
  topSearches: string[];
} {
  const hourCounts: Record<number, { count: number; totalConfidence: number }> = {};
  const searchCounts: Record<string, number> = {};

  const now = Date.now();
  const last24h = queries.filter((q) => now - q.createdAt < 24 * 60 * 60 * 1000);

  last24h.forEach((query) => {
    const hour = new Date(query.createdAt).getHours();
    if (!hourCounts[hour]) hourCounts[hour] = { count: 0, totalConfidence: 0 };
    hourCounts[hour].count++;
    hourCounts[hour].totalConfidence += query.confidence || 0.5;

    // Extract search keywords
    const keywords = extractKeywords(query.question);
    keywords.forEach((kw) => {
      searchCounts[kw] = (searchCounts[kw] || 0) + 1;
    });
  });

  const patterns: ActivityPattern[] = [];
  for (let h = 0; h < 24; h++) {
    const data = hourCounts[h] || { count: 0, totalConfidence: 0 };
    patterns.push({
      hour: h,
      count: data.count,
      avgConfidence: data.count > 0 ? data.totalConfidence / data.count : 0,
    });
  }

  const topSearches = Object.entries(searchCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([term]) => term.charAt(0).toUpperCase() + term.slice(1));

  // Calculate query momentum (queries in last hour vs average)
  const currentHour = new Date().getHours();
  const currentHourCount = hourCounts[currentHour]?.count || 0;
  const avgHourCount = last24h.length / 24;
  const queryMomentum = avgHourCount > 0 ? (currentHourCount / avgHourCount) * 100 : 0;

  return { patterns, queryMomentum, topSearches };
}

export default function DashboardAnalytics({ markets, recentQueries }: DashboardAnalyticsProps) {
  const momentum = useMemo(() => calculateMomentum(markets), [markets]);
  const clusters = useMemo(() => clusterMarkets(markets), [markets]);
  const queryAnalysis = useMemo(() => analyzeQueryPatterns(recentQueries), [recentQueries]);

  if (markets.length === 0) return null;

  const TrendIcon = momentum.trend === "bullish" ? TrendingUp :
    momentum.trend === "bearish" ? TrendingDown : Activity;

  const trendColor = momentum.trend === "bullish" ? "text-emerald-500" :
    momentum.trend === "bearish" ? "text-red-500" : "text-yellow-500";

  const trendBg = momentum.trend === "bullish" ? "bg-emerald-500/10 border-emerald-500/30" :
    momentum.trend === "bearish" ? "bg-red-500/10 border-red-500/30" : "bg-yellow-500/10 border-yellow-500/30";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-4"
    >
      {/* Market Momentum */}
      <div className={`${trendBg} border rounded-lg p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendIcon className={`w-5 h-5 ${trendColor}`} />
            <h3 className="text-sm font-semibold text-white">Market Momentum</h3>
          </div>
          <span className={`text-xs font-medium ${trendColor} uppercase`}>
            {momentum.trend}
          </span>
        </div>

        <div className="space-y-3">
          {/* Velocity indicator */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[#888]">24h Activity</span>
              <span className="text-white">{momentum.velocity.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(momentum.velocity * 2, 100)}%` }}
                transition={{ duration: 0.5 }}
                className={`h-full rounded-full ${
                  momentum.trend === "bullish" ? "bg-emerald-500" :
                  momentum.trend === "bearish" ? "bg-red-500" : "bg-yellow-500"
                }`}
              />
            </div>
          </div>

          {/* Hot topics */}
          {momentum.hotTopics.length > 0 && (
            <div>
              <span className="text-xs text-[#888] block mb-2">Hot Topics</span>
              <div className="flex flex-wrap gap-1">
                {momentum.hotTopics.map((topic, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs bg-[#1a1a1a] text-white rounded-full"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Topic Clusters */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Network className="w-5 h-5 text-purple-500" />
          <h3 className="text-sm font-semibold text-white">Topic Clusters</h3>
        </div>

        <div className="space-y-2">
          {clusters.map((cluster, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white">{cluster.name}</span>
                <span className="text-[10px] text-[#666]">({cluster.count})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      cluster.sentiment > 55 ? "bg-emerald-500" :
                      cluster.sentiment < 45 ? "bg-red-500" : "bg-yellow-500"
                    }`}
                    style={{ width: `${cluster.sentiment}%` }}
                  />
                </div>
                {cluster.sentiment > 55 ? (
                  <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                ) : cluster.sentiment < 45 ? (
                  <ArrowDownRight className="w-3 h-3 text-red-500" />
                ) : (
                  <Minus className="w-3 h-3 text-yellow-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Query Activity */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-semibold text-white">Query Activity</h3>
          </div>
          {queryAnalysis.queryMomentum > 100 && (
            <span className="text-[10px] text-emerald-500 bg-emerald-500/20 px-2 py-0.5 rounded-full">
              High Activity
            </span>
          )}
        </div>

        <div className="space-y-3">
          {/* Mini activity chart */}
          <div className="flex items-end gap-[2px] h-8">
            {queryAnalysis.patterns.map((p, i) => {
              const maxCount = Math.max(...queryAnalysis.patterns.map((x) => x.count), 1);
              const height = (p.count / maxCount) * 100;
              const isCurrentHour = i === new Date().getHours();
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t ${
                    isCurrentHour ? "bg-blue-500" : "bg-[#333]"
                  }`}
                  style={{ height: `${Math.max(height, 4)}%` }}
                  title={`${i}:00 - ${p.count} queries`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-[#666]">
            <span>12am</span>
            <span>12pm</span>
            <span>11pm</span>
          </div>

          {/* Top searches */}
          {queryAnalysis.topSearches.length > 0 && (
            <div>
              <span className="text-xs text-[#888] block mb-2">Top Searches</span>
              <div className="flex flex-wrap gap-1">
                {queryAnalysis.topSearches.map((term, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full"
                  >
                    {term}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
