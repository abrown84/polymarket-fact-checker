import { useState } from "react";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { api } from "../convex/_generated/api";
import { ExternalLink, Newspaper, Clock, Filter, Search, TrendingUp } from "lucide-react";
import { DATA_CONSTANTS } from "../constants";

interface NewsArticle {
  _id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: number;
  snippet: string | null;
  relevanceScore: number | null;
  createdAt: number;
}

export default function NewsFeed() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"relevance" | "date">("date");
  
  // Get all news articles from the database
  const allArticles = useQuery(api.queries.getAllNewsArticles, { limit: DATA_CONSTANTS.NEWS_ARTICLES_LIMIT }) || [];
  const articles = allArticles as NewsArticle[];

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
    if (sourceLower.includes("reuters")) return "text-blue-400 bg-blue-400/10 border-blue-400/30";
    if (sourceLower.includes("bbc")) return "text-red-400 bg-red-400/10 border-red-400/30";
    if (sourceLower.includes("guardian")) return "text-blue-300 bg-blue-300/10 border-blue-300/30";
    if (sourceLower.includes("cnn")) return "text-red-500 bg-red-500/10 border-red-500/30";
    if (sourceLower.includes("npr")) return "text-green-400 bg-green-400/10 border-green-400/30";
    if (sourceLower.includes("politico")) return "text-blue-500 bg-blue-500/10 border-blue-500/30";
    if (sourceLower.includes("axios")) return "text-purple-400 bg-purple-400/10 border-purple-400/30";
    if (sourceLower.includes("ap") || sourceLower.includes("ap news")) return "text-orange-400 bg-orange-400/10 border-orange-400/30";
    return "text-[#888] bg-[#111] border-[#1a1a1a]";
  };

  // Extract unique sources from articles
  const sources = Array.from(new Set(articles.map(a => a.source))).sort();

  // Filter and sort articles
  const filteredArticles = articles
    .filter(article => {
      const matchesSearch = !searchQuery || 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (article.snippet && article.snippet.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesSource = selectedSource === "all" || article.source === selectedSource;
      
      return matchesSearch && matchesSource;
    })
    .sort((a, b) => {
      if (sortBy === "relevance") {
        const scoreA = a.relevanceScore ?? 0;
        const scoreB = b.relevanceScore ?? 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
      }
      // Sort by date (newest first) as tiebreaker or primary sort
      return b.publishedAt - a.publishedAt;
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Newspaper className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">News Feed</h2>
        </div>
        <p className="text-[#888] text-sm">
          Browse all news articles collected from multiple sources. Articles are automatically scored for relevance to fact-checking queries.
        </p>
      </div>

      {/* Filters and Search */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#111] border border-[#1a1a1a] rounded-lg text-white placeholder-[#666] focus:outline-none focus:border-[#2a2a2a] transition-colors"
            />
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#666]" />
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="px-4 py-2 bg-[#111] border border-[#1a1a1a] rounded-lg text-white text-sm focus:outline-none focus:border-[#2a2a2a] transition-colors"
            >
              <option value="all">All Sources</option>
              {sources.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#666]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "relevance" | "date")}
              className="px-4 py-2 bg-[#111] border border-[#1a1a1a] rounded-lg text-white text-sm focus:outline-none focus:border-[#2a2a2a] transition-colors"
            >
              <option value="date">Sort by Date</option>
              <option value="relevance">Sort by Relevance</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 text-sm text-[#666]">
          Showing {filteredArticles.length} of {articles.length} articles
          {selectedSource !== "all" && ` from ${selectedSource}`}
        </div>
      </div>

      {/* Articles Grid */}
      {filteredArticles.length === 0 ? (
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-12 text-center">
          <Newspaper className="w-12 h-12 text-[#666] mx-auto mb-4" />
          <p className="text-[#888] text-lg mb-2">No articles found</p>
          <p className="text-[#666] text-sm">
            {articles.length === 0 
              ? "No news articles have been collected yet. Try making a fact-check query to gather articles."
              : "Try adjusting your filters or search query."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArticles.map((article, index) => (
            <motion.a
              key={article._id}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="block bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-5 hover:border-[#2a2a2a] hover:bg-[#111] transition-all group"
            >
              {/* Source Badge */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-medium px-2 py-1 rounded border ${getSourceColor(article.source)}`}>
                  {article.source}
                </span>
                {article.relevanceScore !== null && (
                  <span className="text-xs text-[#666]">
                    {(article.relevanceScore * 100).toFixed(0)}% relevant
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors mb-2 line-clamp-2">
                {article.title}
              </h3>

              {/* Snippet */}
              {article.snippet && (
                <p className="text-sm text-[#888] line-clamp-3 mb-3">
                  {article.snippet}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-[#1a1a1a]">
                <div className="flex items-center gap-1 text-xs text-[#666]">
                  <Clock className="w-3 h-3" />
                  {formatDate(article.publishedAt)}
                </div>
                <div className="flex items-center gap-1 text-xs text-blue-400 group-hover:text-blue-300 transition-colors">
                  <span>Read</span>
                  <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      )}
    </div>
  );
}

