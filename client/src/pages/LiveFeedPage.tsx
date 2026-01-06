import { useState, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { motion } from "framer-motion";
import {
  Newspaper,
  Twitter,
  MessageCircle,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  Loader2,
  DollarSign,
  Vote,
  Gamepad2,
  BarChart3,
  Flame,
} from "lucide-react";

type Category = "all" | "crypto" | "politics" | "sports" | "prediction-markets";

interface FeedItem {
  id: string;
  type: "news" | "tweet" | "reddit" | "trend";
  title: string;
  content: string;
  source: string;
  url: string;
  timestamp: number;
  category: string;
  relevanceScore: number;
  marketImpact?: {
    hasImpact: boolean;
    relatedMarkets?: string[];
    impactLevel?: "low" | "medium" | "high";
  };
  metadata?: {
    author?: string;
    engagement?: number;
    imageUrl?: string;
  };
}

const CATEGORIES: Array<{ id: Category; label: string; icon: any }> = [
  { id: "all", label: "All", icon: Flame },
  { id: "crypto", label: "Crypto", icon: DollarSign },
  { id: "politics", label: "Politics", icon: Vote },
  { id: "sports", label: "Sports", icon: Gamepad2 },
  { id: "prediction-markets", label: "Markets", icon: BarChart3 },
];

function FeedItemCard({ item, index }: { item: FeedItem; index: number }) {
  const getTypeIcon = () => {
    switch (item.type) {
      case "news":
        return <Newspaper className="w-4 h-4" />;
      case "tweet":
        return <Twitter className="w-4 h-4" />;
      case "reddit":
        return <MessageCircle className="w-4 h-4" />;
      default:
        return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getTypeColor = () => {
    switch (item.type) {
      case "news":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "tweet":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "reddit":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      default:
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    }
  };

  const getImpactColor = () => {
    if (!item.marketImpact?.hasImpact) return "";
    switch (item.marketImpact.impactLevel) {
      case "high":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "low":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      default:
        return "";
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-[#1c2127] border border-[#2a3441] hover:border-[#3a4451] rounded-xl p-5 transition-all cursor-pointer group"
      onClick={() => window.open(item.url, "_blank")}
    >
      <div className="flex items-start gap-4">
        {/* Type Icon */}
        <div className={`p-2 rounded-lg border ${getTypeColor()} flex-shrink-0`}>
          {getTypeIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-white group-hover:text-emerald-400 transition-colors line-clamp-2 mb-1">
                {item.title}
              </h3>
              {item.content && (
                <p className="text-sm text-gray-400 line-clamp-2 mb-2">
                  {item.content}
                </p>
              )}
            </div>
            <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 transition-colors flex-shrink-0 mt-1" />
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500">{item.source}</span>
            {item.metadata?.author && (
              <span className="text-xs text-gray-500">• {item.metadata.author}</span>
            )}
            <span className="text-xs text-gray-500">• {formatTime(item.timestamp)}</span>
            {item.metadata?.engagement && (
              <span className="text-xs text-gray-500">
                • {item.metadata.engagement.toLocaleString()} engagement
              </span>
            )}
          </div>

          {/* Market Impact Badge */}
          {item.marketImpact?.hasImpact && (
            <div className="mt-3 flex items-center gap-2">
              <div className={`px-2 py-1 rounded text-xs font-medium border ${getImpactColor()}`}>
                Market Impact: {item.marketImpact.impactLevel?.toUpperCase()}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function LiveFeedPage() {
  const [category, setCategory] = useState<Category>("all");
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const getLiveFeed = useAction(api.actions.getLiveFeed.getLiveFeed);

  const loadFeed = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await getLiveFeed({
        category,
        limit: 50,
      });
      setFeedItems(result.items);
    } catch (error) {
      console.error("Error loading feed:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, [category]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadFeed(true);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [category]);

  return (
    <div className="min-h-screen bg-[#0f1419] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Newspaper className="w-8 h-8 text-emerald-400" />
              <div>
                <h1 className="text-3xl font-bold">Live Feed</h1>
                <p className="text-gray-400">Real-time news and updates from crypto, politics, sports, and prediction markets</p>
              </div>
            </div>
            <button
              onClick={() => loadFeed(true)}
              disabled={refreshing}
              className="px-4 py-2 bg-[#1c2127] border border-[#2a3441] hover:border-emerald-400 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    category === cat.id
                      ? "bg-emerald-500 text-white"
                      : "bg-[#1c2127] border border-[#2a3441] text-gray-300 hover:border-emerald-400/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <span className="ml-3 text-gray-400">Loading feed...</span>
          </div>
        ) : feedItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400">No items found for this category.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedItems.map((item, index) => (
              <FeedItemCard key={item.id} item={item} index={index} />
            ))}
          </div>
        )}

        {/* Stats */}
        {feedItems.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-500">
            Showing {feedItems.length} items • Auto-refreshes every 5 minutes
          </div>
        )}
      </div>
    </div>
  );
}
