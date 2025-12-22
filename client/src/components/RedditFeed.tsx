import { motion } from "framer-motion";
import { ExternalLink, MessageSquare, ArrowUp, Clock } from "lucide-react";

interface RedditPost {
  id: string;
  title: string;
  text: string | null;
  author: string;
  subreddit: string;
  score: number;
  numComments: number;
  createdAt: number;
  url: string;
  permalink: string;
  relevanceScore: number | null;
}

interface RedditFeedProps {
  posts: RedditPost[];
}

export default function RedditFeed({ posts }: RedditFeedProps) {
  if (!posts || posts.length === 0) {
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
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <span className="text-orange-500 font-bold text-lg">r/</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Reddit Discussion</h3>
              <p className="text-xs text-[#888] mt-1">
                {posts.length} relevant post{posts.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Posts List */}
      <div className="divide-y divide-[#1a1a1a]">
        {posts.slice(0, 8).map((post, index) => (
          <motion.a
            key={post.id}
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="block p-4 hover:bg-[#111] transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                {/* Subreddit and Author */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-orange-400">
                    r/{post.subreddit}
                  </span>
                  <span className="text-[#666]">•</span>
                  <span className="text-xs text-[#666]">u/{post.author}</span>
                  <span className="text-[#666]">•</span>
                  <div className="flex items-center gap-1 text-xs text-[#666]">
                    <Clock className="w-3 h-3" />
                    {formatDate(post.createdAt)}
                  </div>
                  {post.relevanceScore !== null && (
                    <>
                      <span className="text-[#666]">•</span>
                      <span className="text-xs text-[#666]">
                        {(post.relevanceScore * 100).toFixed(0)}% relevant
                      </span>
                    </>
                  )}
                </div>

                {/* Title */}
                <h4 className="text-base font-semibold text-white group-hover:text-orange-400 transition-colors mb-2 line-clamp-2">
                  {post.title}
                </h4>

                {/* Text Preview */}
                {post.text && (
                  <p className="text-sm text-[#888] line-clamp-3 mb-3">
                    {post.text}
                  </p>
                )}

                {/* Engagement Metrics */}
                <div className="flex items-center gap-4 text-xs text-[#666]">
                  <div className="flex items-center gap-1">
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>{post.score.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{post.numComments.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1 text-orange-400 group-hover:text-orange-300 transition-colors ml-auto">
                    <span>View on Reddit</span>
                    <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          </motion.a>
        ))}
      </div>

      {/* Footer */}
      {posts.length > 8 && (
        <div className="p-3 border-t border-[#1a1a1a] bg-[#111] text-center">
          <p className="text-xs text-[#666]">
            Showing 8 of {posts.length} posts
          </p>
        </div>
      )}
    </motion.div>
  );
}



