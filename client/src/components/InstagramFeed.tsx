import { motion } from "framer-motion";
import { ExternalLink, Heart, MessageCircle, Image, Video, Camera } from "lucide-react";

interface InstagramPost {
  id: string;
  caption: string | null;
  author: string;
  authorUsername: string;
  likeCount: number | null;
  commentCount: number | null;
  createdAt: number;
  url: string;
  mediaType: string;
  relevanceScore: number | null;
}

interface InstagramFeedProps {
  posts: InstagramPost[];
}

export default function InstagramFeed({ posts }: InstagramFeedProps) {
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

  const formatNumber = (num: number | null) => {
    if (num === null) return "N/A";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getMediaIcon = (mediaType: string) => {
    if (mediaType === "VIDEO") return Video;
    if (mediaType === "CAROUSEL_ALBUM") return Camera;
    return Image;
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
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <Camera className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Instagram Posts</h3>
              <p className="text-xs text-[#888] mt-1">
                {posts.length} relevant post{posts.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Posts List */}
      <div className="divide-y divide-[#1a1a1a]">
        {posts.slice(0, 8).map((post, index) => {
          const MediaIcon = getMediaIcon(post.mediaType);
          return (
            <motion.a
              key={post.id}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="block p-4 hover:bg-[#111] transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <MediaIcon className="w-6 h-6 text-pink-400" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  {/* Author and Date */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-white">
                      @{post.authorUsername}
                    </span>
                    <span className="text-[#666]">•</span>
                    <span className="text-xs text-[#666]">
                      {formatDate(post.createdAt)}
                    </span>
                    {post.relevanceScore !== null && (
                      <>
                        <span className="text-[#666]">•</span>
                        <span className="text-xs text-[#666]">
                          {(post.relevanceScore * 100).toFixed(0)}% relevant
                        </span>
                      </>
                    )}
                  </div>

                  {/* Caption */}
                  {post.caption && (
                    <p className="text-sm text-[#ddd] mb-3 leading-relaxed line-clamp-3">
                      {post.caption}
                    </p>
                  )}

                  {/* Engagement Metrics */}
                  <div className="flex items-center gap-4 text-xs text-[#666]">
                    {post.likeCount !== null && (
                      <div className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" />
                        <span>{formatNumber(post.likeCount)}</span>
                      </div>
                    )}
                    {post.commentCount !== null && (
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{formatNumber(post.commentCount)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-pink-400 group-hover:text-pink-300 transition-colors ml-auto">
                      <span>View on Instagram</span>
                      <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.a>
          );
        })}
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



