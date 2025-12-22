import { motion } from "framer-motion";
import { 
  Newspaper, Twitter, MessageSquare, Music, Camera, BarChart3, TrendingUp,
  CheckCircle2, XCircle, AlertCircle
} from "lucide-react";

interface DataSourceOverviewProps {
  newsArticles?: any[];
  tweets?: any[];
  redditPosts?: any[];
  tiktokVideos?: any[];
  instagramPosts?: any[];
  googleTrends?: any[];
  kalshiMarkets?: any[];
  bestMarket?: any;
  alternatives?: any[];
}

const dataSources = [
  { key: "markets", label: "Polymarket", icon: BarChart3, color: "emerald" },
  { key: "news", label: "News", icon: Newspaper, color: "blue" },
  { key: "twitter", label: "Twitter", icon: Twitter, color: "blue" },
  { key: "reddit", label: "Reddit", icon: MessageSquare, color: "orange" },
  { key: "tiktok", label: "TikTok", icon: Music, color: "pink" },
  { key: "instagram", label: "Instagram", icon: Camera, color: "pink" },
  { key: "googletrends", label: "Google Trends", icon: TrendingUp, color: "blue" },
  { key: "kalshi", label: "Kalshi", icon: BarChart3, color: "purple" },
];

export default function DataSourceOverview({
  newsArticles,
  tweets,
  redditPosts,
  tiktokVideos,
  instagramPosts,
  googleTrends,
  kalshiMarkets,
  bestMarket,
  alternatives,
}: DataSourceOverviewProps) {
  const getSourceData = (key: string) => {
    switch (key) {
      case "markets":
        return (bestMarket ? 1 : 0) + (alternatives?.length || 0);
      case "news":
        return newsArticles?.length || 0;
      case "twitter":
        return tweets?.length || 0;
      case "reddit":
        return redditPosts?.length || 0;
      case "tiktok":
        return tiktokVideos?.length || 0;
      case "instagram":
        return instagramPosts?.length || 0;
      case "googletrends":
        return googleTrends?.length || 0;
      case "kalshi":
        return kalshiMarkets?.length || 0;
      default:
        return 0;
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
      blue: "bg-blue-500/10 border-blue-500/30 text-blue-400",
      orange: "bg-orange-500/10 border-orange-500/30 text-orange-400",
      pink: "bg-pink-500/10 border-pink-500/30 text-pink-400",
      purple: "bg-purple-500/10 border-purple-500/30 text-purple-400",
    };
    return colors[color] || colors.blue;
  };

  const totalSources = dataSources.filter(ds => getSourceData(ds.key) > 0).length;
  const totalItems = dataSources.reduce((sum, ds) => sum + getSourceData(ds.key), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-[#0a0a0a] to-[#111] border border-[#1a1a1a] rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Data Sources</h3>
          <p className="text-sm text-[#888]">
            Aggregated from {totalSources} source{totalSources !== 1 ? "s" : ""} • {totalItems} total items
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalSources >= 5 ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : totalSources >= 3 ? (
            <AlertCircle className="w-5 h-5 text-yellow-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {dataSources.map((source, index) => {
          const count = getSourceData(source.key);
          const Icon = source.icon;
          const hasData = count > 0;

          return (
            <motion.div
              key={source.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`relative p-4 rounded-lg border transition-all ${
                hasData
                  ? `${getColorClasses(source.color)} hover:scale-105 cursor-pointer`
                  : "bg-[#111] border-[#1a1a1a] opacity-50"
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <Icon className={`w-6 h-6 ${hasData ? "" : "text-[#666]"}`} />
                <div className="text-center">
                  <div className={`text-2xl font-bold ${hasData ? "" : "text-[#666]"}`}>
                    {count}
                  </div>
                  <div className={`text-xs mt-1 ${hasData ? "text-[#888]" : "text-[#666]"}`}>
                    {source.label}
                  </div>
                </div>
              </div>
              {hasData && (
                <motion.div
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.05 + 0.2 }}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

