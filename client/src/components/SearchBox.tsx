import { motion } from "framer-motion";
import { Search } from "lucide-react";

interface SearchBoxProps {
  question: string;
  setQuestion: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}

export default function SearchBox({
  question,
  setQuestion,
  onSubmit,
  loading,
}: SearchBoxProps) {
  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="w-full"
    >
      <div className="relative">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Will the Fed cut rates by March 2026?"
          disabled={loading}
          className="w-full px-6 py-4 pl-12 pr-32 text-lg rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] text-white placeholder-[#666] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#666] w-5 h-5" />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Checking..." : "Check"}
        </button>
      </div>
    </motion.form>
  );
}
