import { motion } from "framer-motion";
import { TrendingUp, Search, ExternalLink } from "lucide-react";

interface GoogleTrend {
  keyword: string;
  searchInterest: number; // 0-100
  relatedQueries: string[];
  relatedTopics: string[];
  timeRange: string;
  region: string;
  trendScore: number | null;
}

interface GoogleTrendsFeedProps {
  trends: GoogleTrend[];
}

export default function GoogleTrendsFeed({ trends }: GoogleTrendsFeedProps) {
  if (!trends || trends.length === 0) {
    return null;
  }

  const getInterestColor = (interest: number) => {
    if (interest >= 75) return "text-red-500";
    if (interest >= 50) return "text-orange-500";
    if (interest >= 25) return "text-yellow-500";
    return "text-gray-400";
  };

  const getInterestLabel = (interest: number) => {
    if (interest >= 75) return "Very High";
    if (interest >= 50) return "High";
    if (interest >= 25) return "Moderate";
    return "Low";
  };

  const getTrendUrl = (keyword: string) => {
    return `https://trends.google.com/trends/explore?q=${encodeURIComponent(keyword)}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-white">Google Trends</h3>
        <span className="text-sm text-gray-400">({trends.length} trends)</span>
      </div>

      <div className="grid gap-4">
        {trends.map((trend, index) => (
          <motion.div
            key={trend.keyword}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gradient-to-br from-blue-950/50 to-blue-900/30 rounded-lg p-4 border border-blue-800/30 hover:border-blue-700/50 transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-4 h-4 text-blue-400" />
                  <h4 className="font-semibold text-white">{trend.keyword}</h4>
                  <a
                    href={getTrendUrl(trend.keyword)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Interest:</span>
                    <span className={`text-sm font-semibold ${getInterestColor(trend.searchInterest)}`}>
                      {trend.searchInterest}/100
                    </span>
                    <span className="text-xs text-gray-500">
                      ({getInterestLabel(trend.searchInterest)})
                    </span>
                  </div>
                  {trend.trendScore !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">Relevance:</span>
                      <span className="text-sm font-semibold text-blue-400">
                        {(trend.trendScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Search Interest Bar */}
                <div className="mb-3">
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all`}
                      style={{ width: `${trend.searchInterest}%` }}
                    />
                  </div>
                </div>

                {/* Related Queries */}
                {trend.relatedQueries && trend.relatedQueries.length > 0 && (
                  <div className="mt-3">
                    <span className="text-xs text-gray-400 mb-1 block">Related Searches:</span>
                    <div className="flex flex-wrap gap-2">
                      {trend.relatedQueries.slice(0, 5).map((query, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 bg-blue-900/30 text-blue-300 rounded border border-blue-800/30"
                        >
                          {query}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span>Region: {trend.region}</span>
                  <span>•</span>
                  <span>Time: {trend.timeRange}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}



