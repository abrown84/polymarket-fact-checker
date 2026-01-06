import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { motion } from "framer-motion";
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Info,
  BarChart3,
  Activity,
  Shield,
  Brain,
  Loader2
} from "lucide-react";

interface SentimentDisplayProps {
  sentiment: {
    overall: "positive" | "negative" | "neutral";
    score: number;
    breakdown: {
      news: number;
      social: number;
      market: number;
    };
    confidence: number;
  };
}

function SentimentDisplay({ sentiment }: SentimentDisplayProps) {
  const getSentimentColor = () => {
    if (sentiment.overall === "positive") return "text-emerald-400";
    if (sentiment.overall === "negative") return "text-red-400";
    return "text-yellow-400";
  };

  const getSentimentIcon = () => {
    if (sentiment.overall === "positive") return <TrendingUp className="w-5 h-5" />;
    if (sentiment.overall === "negative") return <TrendingDown className="w-5 h-5" />;
    return <Activity className="w-5 h-5" />;
  };

  return (
    <div className="bg-[#1c2127] border border-[#2a3441] rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`${getSentimentColor()}`}>
          {getSentimentIcon()}
        </div>
        <h3 className="text-lg font-semibold text-white">Sentiment Analysis</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Overall Sentiment</span>
            <span className={`text-lg font-bold ${getSentimentColor()}`}>
              {sentiment.overall.toUpperCase()}
            </span>
          </div>
          <div className="w-full bg-[#2a3441] rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                sentiment.score > 0 ? "bg-emerald-400" : sentiment.score < 0 ? "bg-red-400" : "bg-yellow-400"
              }`}
              style={{ width: `${Math.abs(sentiment.score) * 100}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Score: {(sentiment.score * 100).toFixed(0)}%
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#2a3441]">
          <div>
            <div className="text-xs text-gray-400 mb-1">News</div>
            <div className="text-sm font-medium text-white">
              {(sentiment.breakdown.news * 100).toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Social</div>
            <div className="text-sm font-medium text-white">
              {(sentiment.breakdown.social * 100).toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Market</div>
            <div className="text-sm font-medium text-white">
              {(sentiment.breakdown.market * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        <div className="pt-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Confidence</span>
            <span className="text-gray-300">{(sentiment.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RiskDisplayProps {
  risk: {
    overall: "low" | "medium" | "high";
    score: number;
    factors: Array<{
      name: string;
      level: "low" | "medium" | "high";
      description: string;
    }>;
    confidence: number;
  };
}

function RiskDisplay({ risk }: RiskDisplayProps) {
  const getRiskColor = () => {
    if (risk.overall === "high") return "text-red-400";
    if (risk.overall === "medium") return "text-yellow-400";
    return "text-emerald-400";
  };

  const getRiskIcon = () => {
    if (risk.overall === "high") return <AlertTriangle className="w-5 h-5" />;
    if (risk.overall === "medium") return <Info className="w-5 h-5" />;
    return <Shield className="w-5 h-5" />;
  };

  const getFactorColor = (level: string) => {
    if (level === "high") return "text-red-400 border-red-400/20 bg-red-400/10";
    if (level === "medium") return "text-yellow-400 border-yellow-400/20 bg-yellow-400/10";
    return "text-emerald-400 border-emerald-400/20 bg-emerald-400/10";
  };

  return (
    <div className="bg-[#1c2127] border border-[#2a3441] rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={getRiskColor()}>
          {getRiskIcon()}
        </div>
        <h3 className="text-lg font-semibold text-white">Risk Assessment</h3>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Overall Risk</span>
            <span className={`text-lg font-bold ${getRiskColor()}`}>
              {risk.overall.toUpperCase()}
            </span>
          </div>
          <div className="w-full bg-[#2a3441] rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                risk.score > 0.6 ? "bg-red-400" : risk.score > 0.4 ? "bg-yellow-400" : "bg-emerald-400"
              }`}
              style={{ width: `${risk.score * 100}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Score: {(risk.score * 100).toFixed(0)}%
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t border-[#2a3441]">
          <div className="text-sm font-medium text-gray-300 mb-3">Risk Factors</div>
          {risk.factors.map((factor, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border ${getFactorColor(factor.level)}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm font-medium">{factor.name}</span>
                <span className="text-xs font-semibold">{factor.level.toUpperCase()}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{factor.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ConfidenceDisplayProps {
  confidence: {
    overall: number;
    breakdown: {
      marketMatch: number;
      dataQuality: number;
      sourceDiversity: number;
      recency: number;
    };
  };
}

function ConfidenceDisplay({ confidence }: ConfidenceDisplayProps) {
  return (
    <div className="bg-[#1c2127] border border-[#2a3441] rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <CheckCircle className="w-5 h-5 text-emerald-400" />
        <h3 className="text-lg font-semibold text-white">Confidence Breakdown</h3>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Overall Confidence</span>
            <span className="text-lg font-bold text-emerald-400">
              {(confidence.overall * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-[#2a3441] rounded-full h-2">
            <div
              className="h-2 rounded-full bg-emerald-400 transition-all"
              style={{ width: `${confidence.overall * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-[#2a3441]">
          {[
            { label: "Market Match", value: confidence.breakdown.marketMatch },
            { label: "Data Quality", value: confidence.breakdown.dataQuality },
            { label: "Source Diversity", value: confidence.breakdown.sourceDiversity },
            { label: "Recency", value: confidence.breakdown.recency },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-400">{item.label}</span>
                <span className="text-xs text-gray-300">{(item.value * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-[#2a3441] rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-emerald-400/60 transition-all"
                  style={{ width: `${item.value * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ResearchPage() {
  const [marketId, setMarketId] = useState("");
  const [analysisDepth, setAnalysisDepth] = useState<"standard" | "deep">("standard");
  const deepResearch = useAction(api.actions.deepResearch.deepResearch);
  const [researchResult, setResearchResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!marketId.trim()) {
      setError("Please enter a market ID");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await deepResearch({
        marketId: marketId.trim(),
        analysisDepth,
      });
      setResearchResult(result);
    } catch (err: any) {
      setError(err.message || "Failed to perform research");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-8 h-8 text-emerald-400" />
            <h1 className="text-3xl font-bold">Deep Research</h1>
          </div>
          <p className="text-gray-400">
            AI-powered market intelligence with sentiment analysis, risk assessment, and confidence scoring
          </p>
        </div>

        {/* Search Section */}
        <div className="bg-[#1c2127] border border-[#2a3441] rounded-xl p-6 mb-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Market ID
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={marketId}
                  onChange={(e) => setMarketId(e.target.value)}
                  placeholder="Enter Polymarket market ID (e.g., 0x1234...)"
                  className="flex-1 px-4 py-2 bg-[#0f1419] border border-[#2a3441] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400"
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Research
                    </>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Analysis Depth
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setAnalysisDepth("standard")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    analysisDepth === "standard"
                      ? "bg-emerald-500 text-white"
                      : "bg-[#0f1419] border border-[#2a3441] text-gray-300 hover:border-emerald-400/50"
                  }`}
                >
                  Standard
                </button>
                <button
                  onClick={() => setAnalysisDepth("deep")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    analysisDepth === "deep"
                      ? "bg-emerald-500 text-white"
                      : "bg-[#0f1419] border border-[#2a3441] text-gray-300 hover:border-emerald-400/50"
                  }`}
                >
                  Deep Analysis
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {researchResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary */}
            <div className="bg-[#1c2127] border border-[#2a3441] rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-3">{researchResult.marketTitle}</h2>
              <p className="text-gray-300 leading-relaxed">{researchResult.summary}</p>
            </div>

            {/* Key Insights */}
            {researchResult.insights && researchResult.insights.length > 0 && (
              <div className="bg-[#1c2127] border border-[#2a3441] rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-400" />
                  Key Insights
                </h3>
                <ul className="space-y-2">
                  {researchResult.insights.map((insight: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                      <span className="text-gray-300">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Analysis Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SentimentDisplay sentiment={researchResult.sentiment} />
              <RiskDisplay risk={researchResult.risk} />
            </div>

            <ConfidenceDisplay confidence={researchResult.confidence} />

            {/* Sources */}
            <div className="bg-[#1c2127] border border-[#2a3441] rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Data Sources</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">
                    {researchResult.sources.markets}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">Markets</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">
                    {researchResult.sources.news}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">News Articles</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">
                    {researchResult.sources.social}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">Social Posts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">
                    {researchResult.sources.trends}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">Trends</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
