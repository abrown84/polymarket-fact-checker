import { motion } from "framer-motion";
import { ExternalLink, Newspaper, Clock } from "lucide-react";

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: number;
  snippet: string | null;
  relevanceScore: number | null;
}

interface NewsSourcesProps {
  articles: NewsArticle[];
}

export default function NewsSources({ articles }: NewsSourcesProps) {
  if (!articles || articles.length === 0) {
    return null;
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return "Just now";
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  const getSourceColor = (source: string) => {
    const sourceLower = source.toLowerCase();
    if (sourceLower.includes("reuters")) return "text-blue-400";
    if (sourceLower.includes("bbc")) return "text-red-400";
    if (sourceLower.includes("guardian")) return "text-blue-300";
    if (sourceLower.includes("cnn")) return "text-red-500";
    if (sourceLower.includes("npr")) return "text-green-400";
    if (sourceLower.includes("politico")) return "text-blue-500";
    if (sourceLower.includes("axios")) return "text-purple-400";
    return "text-[#888]";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-[#1a1a1a] bg-[#111]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Newspaper className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">News Sources</h3>
              <p className="text-xs text-[#888] mt-1">
                {articles.length} relevant article{articles.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Articles List */}
      <div className="divide-y divide-[#1a1a1a]">
        {articles.slice(0, 8).map((article, index) => (
          <motion.a
            key={article.url}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="block p-4 hover:bg-[#111] transition-colors group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Source and Date */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-medium ${getSourceColor(article.source)}`}>
                    {article.source}
                  </span>
                  <span className="text-[#666]">•</span>
                  <div className="flex items-center gap-1 text-xs text-[#666]">
                    <Clock className="w-3 h-3" />
                    {formatDate(article.publishedAt)}
                  </div>
                  {article.relevanceScore !== null && (
                    <>
                      <span className="text-[#666]">•</span>
                      <span className="text-xs text-[#666]">
                        {(article.relevanceScore * 100).toFixed(0)}% relevant
                      </span>
                    </>
                  )}
                </div>

                {/* Title */}
                <h4 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors mb-2 line-clamp-2">
                  {article.title}
                </h4>

                {/* Snippet */}
                {article.snippet && (
                  <p className="text-sm text-[#888] line-clamp-2 mb-2">
                    {article.snippet}
                  </p>
                )}

                {/* Link */}
                <div className="flex items-center gap-1 text-xs text-blue-400 group-hover:text-blue-300 transition-colors">
                  <span>Read article</span>
                  <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </motion.a>
        ))}
      </div>

      {/* Footer */}
      {articles.length > 8 && (
        <div className="p-3 border-t border-[#1a1a1a] bg-[#111] text-center">
          <p className="text-xs text-[#666]">
            Showing 8 of {articles.length} articles
          </p>
        </div>
      )}
    </motion.div>
  );
}



