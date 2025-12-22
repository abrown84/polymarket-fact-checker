import { motion } from "framer-motion";
import { ExternalLink, Heart, MessageCircle, Share2, Eye, Music } from "lucide-react";

interface TikTokVideo {
  id: string;
  description: string;
  author: string;
  authorUsername: string;
  likeCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
  viewCount: number | null;
  createdAt: number;
  url: string;
  relevanceScore: number | null;
}

interface TikTokFeedProps {
  videos: TikTokVideo[];
}

export default function TikTokFeed({ videos }: TikTokFeedProps) {
  if (!videos || videos.length === 0) {
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
            <Music className="w-5 h-5 text-pink-500" />
            <div>
              <h3 className="text-lg font-semibold text-white">TikTok Videos</h3>
              <p className="text-xs text-[#888] mt-1">
                {videos.length} relevant video{videos.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Videos List */}
      <div className="divide-y divide-[#1a1a1a]">
        {videos.slice(0, 8).map((video, index) => (
          <motion.a
            key={video.id}
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="block p-4 hover:bg-[#111] transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-pink-500/20 flex items-center justify-center">
                  <Music className="w-6 h-6 text-pink-500" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                {/* Author and Date */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-white">
                    @{video.authorUsername}
                  </span>
                  <span className="text-[#666]">•</span>
                  <span className="text-xs text-[#666]">
                    {formatDate(video.createdAt)}
                  </span>
                  {video.relevanceScore !== null && (
                    <>
                      <span className="text-[#666]">•</span>
                      <span className="text-xs text-[#666]">
                        {(video.relevanceScore * 100).toFixed(0)}% relevant
                      </span>
                    </>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-[#ddd] mb-3 leading-relaxed line-clamp-2">
                  {video.description || "No description"}
                </p>

                {/* Engagement Metrics */}
                <div className="flex items-center gap-4 text-xs text-[#666]">
                  {video.likeCount !== null && (
                    <div className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" />
                      <span>{formatNumber(video.likeCount)}</span>
                    </div>
                  )}
                  {video.commentCount !== null && (
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{formatNumber(video.commentCount)}</span>
                    </div>
                  )}
                  {video.shareCount !== null && (
                    <div className="flex items-center gap-1">
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{formatNumber(video.shareCount)}</span>
                    </div>
                  )}
                  {video.viewCount !== null && (
                    <div className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{formatNumber(video.viewCount)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-pink-400 group-hover:text-pink-300 transition-colors ml-auto">
                    <span>Watch on TikTok</span>
                    <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          </motion.a>
        ))}
      </div>

      {/* Footer */}
      {videos.length > 8 && (
        <div className="p-3 border-t border-[#1a1a1a] bg-[#111] text-center">
          <p className="text-xs text-[#666]">
            Showing 8 of {videos.length} videos
          </p>
        </div>
      )}
    </motion.div>
  );
}



