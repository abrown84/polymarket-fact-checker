import { motion } from "framer-motion";
import { ExternalLink, Twitter, Heart, Repeat2, Clock } from "lucide-react";

interface Tweet {
  id: string;
  text: string;
  author: string;
  authorUsername: string;
  createdAt: number;
  url: string;
  retweetCount: number | null;
  likeCount: number | null;
  relevanceScore: number | null;
}

interface TwitterFeedProps {
  tweets: Tweet[];
}

export default function TwitterFeed({ tweets }: TwitterFeedProps) {
  if (!tweets || tweets.length === 0) {
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
            <Twitter className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Twitter Discussion</h3>
              <p className="text-xs text-[#888] mt-1">
                {tweets.length} relevant tweet{tweets.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tweets List */}
      <div className="divide-y divide-[#1a1a1a]">
        {tweets.slice(0, 8).map((tweet, index) => (
          <motion.a
            key={tweet.id}
            href={tweet.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="block p-4 hover:bg-[#111] transition-colors group"
          >
            <div className="flex items-start gap-3">
              {/* Author Info */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Twitter className="w-5 h-5 text-blue-400" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                {/* Author and Date */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-white">
                    {tweet.author}
                  </span>
                  <span className="text-sm text-[#666]">@{tweet.authorUsername}</span>
                  <span className="text-[#666]">•</span>
                  <div className="flex items-center gap-1 text-xs text-[#666]">
                    <Clock className="w-3 h-3" />
                    {formatDate(tweet.createdAt)}
                  </div>
                  {tweet.relevanceScore !== null && (
                    <>
                      <span className="text-[#666]">•</span>
                      <span className="text-xs text-[#666]">
                        {(tweet.relevanceScore * 100).toFixed(0)}% relevant
                      </span>
                    </>
                  )}
                </div>

                {/* Tweet Text */}
                <p className="text-sm text-[#ddd] mb-3 leading-relaxed whitespace-pre-wrap break-words">
                  {tweet.text}
                </p>

                {/* Engagement Metrics */}
                <div className="flex items-center gap-4 text-xs text-[#666]">
                  {tweet.likeCount !== null && (
                    <div className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" />
                      <span>{tweet.likeCount.toLocaleString()}</span>
                    </div>
                  )}
                  {tweet.retweetCount !== null && (
                    <div className="flex items-center gap-1">
                      <Repeat2 className="w-3.5 h-3.5" />
                      <span>{tweet.retweetCount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-blue-400 group-hover:text-blue-300 transition-colors ml-auto">
                    <span>View on Twitter</span>
                    <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          </motion.a>
        ))}
      </div>

      {/* Footer */}
      {tweets.length > 8 && (
        <div className="p-3 border-t border-[#1a1a1a] bg-[#111] text-center">
          <p className="text-xs text-[#666]">
            Showing 8 of {tweets.length} tweets
          </p>
        </div>
      )}
    </motion.div>
  );
}



