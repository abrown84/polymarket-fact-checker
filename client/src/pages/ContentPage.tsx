import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Users,
  MessageSquare,
  Calendar,
  User,
  ExternalLink,
  TrendingUp,
  BookOpen,
} from "lucide-react";

type ContentTab = "articles" | "interviews" | "discussions";

// Mock data - in production, this would come from Convex queries
const MOCK_ARTICLES = [
  {
    id: "1",
    title: "The Future of Prediction Markets: A Deep Dive",
    excerpt: "Exploring how prediction markets are reshaping information aggregation and decision-making...",
    author: "Market Analyst",
    category: "Analysis",
    publishedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    views: 1234,
    imageUrl: null,
  },
  {
    id: "2",
    title: "Understanding Market Sentiment: A Trader's Guide",
    excerpt: "How to read market sentiment and use it to make better trading decisions...",
    author: "Trading Expert",
    category: "Trading",
    publishedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    views: 892,
    imageUrl: null,
  },
];

const MOCK_INTERVIEWS = [
  {
    id: "1",
    title: "Interview with a Polymarket Power Trader",
    interviewee: "Alex Trader",
    intervieweeTitle: "Professional Prediction Market Trader",
    excerpt: "We sit down with one of Polymarket's most successful traders to discuss strategy...",
    publishedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    views: 2156,
  },
];

const MOCK_DISCUSSIONS = [
  {
    id: "1",
    title: "What's driving the election market volatility?",
    content: "I've noticed significant price swings in the election markets. What factors are contributing to this?",
    author: "MarketWatcher",
    category: "Politics",
    upvotes: 42,
    replies: 8,
    createdAt: Date.now() - 1 * 60 * 60 * 1000,
  },
];

function ContentCard({ item }: { item: any }) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#1c2127] border border-[#2a3441] hover:border-[#3a4451] rounded-xl p-6 transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors mb-2">
            {item.title}
          </h3>
          {item.excerpt && (
            <p className="text-sm text-gray-400 mb-4 line-clamp-2">{item.excerpt}</p>
          )}
          {item.content && (
            <p className="text-sm text-gray-400 mb-4 line-clamp-2">{item.content}</p>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-500">
            {item.author && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{item.author}</span>
              </div>
            )}
            {item.interviewee && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{item.interviewee}</span>
              </div>
            )}
            {(item.publishedAt || item.createdAt) && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(item.publishedAt || item.createdAt)}</span>
              </div>
            )}
            {item.views && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>{item.views.toLocaleString()} views</span>
              </div>
            )}
            {item.upvotes !== undefined && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>{item.upvotes} upvotes</span>
              </div>
            )}
            {item.replies !== undefined && (
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                <span>{item.replies} replies</span>
              </div>
            )}
          </div>
        </div>
        <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
      </div>
    </motion.div>
  );
}

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState<ContentTab>("articles");

  return (
    <div className="min-h-screen bg-[#0f1419] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-8 h-8 text-emerald-400" />
            <h1 className="text-3xl font-bold">Content</h1>
          </div>
          <p className="text-gray-400">
            Weekly interviews, long-form analysis, and live discussions covering the prediction market ecosystem
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-[#2a3441]">
          {[
            { id: "articles" as ContentTab, label: "Articles", icon: FileText },
            { id: "interviews" as ContentTab, label: "Interviews", icon: Users },
            { id: "discussions" as ContentTab, label: "Discussions", icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? "border-emerald-400 text-emerald-400"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="space-y-4">
          {activeTab === "articles" && (
            <>
              {MOCK_ARTICLES.length === 0 ? (
                <div className="text-center py-20">
                  <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No articles yet. Check back soon!</p>
                </div>
              ) : (
                MOCK_ARTICLES.map((article) => (
                  <ContentCard key={article.id} item={article} />
                ))
              )}
            </>
          )}

          {activeTab === "interviews" && (
            <>
              {MOCK_INTERVIEWS.length === 0 ? (
                <div className="text-center py-20">
                  <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No interviews yet. Check back soon!</p>
                </div>
              ) : (
                MOCK_INTERVIEWS.map((interview) => (
                  <ContentCard key={interview.id} item={interview} />
                ))
              )}
            </>
          )}

          {activeTab === "discussions" && (
            <>
              {MOCK_DISCUSSIONS.length === 0 ? (
                <div className="text-center py-20">
                  <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No discussions yet. Check back soon!</p>
                </div>
              ) : (
                MOCK_DISCUSSIONS.map((discussion) => (
                  <ContentCard key={discussion.id} item={discussion} />
                ))
              )}
            </>
          )}
        </div>

        {/* Coming Soon Notice */}
        <div className="mt-12 bg-[#1c2127] border border-[#2a3441] rounded-xl p-6 text-center">
          <p className="text-gray-400 mb-2">
            <strong className="text-white">Content section coming soon!</strong>
          </p>
          <p className="text-sm text-gray-500">
            We're building a library of trader interviews, in-depth articles, and market discussions.
            Stay tuned for updates!
          </p>
        </div>
      </div>
    </div>
  );
}
