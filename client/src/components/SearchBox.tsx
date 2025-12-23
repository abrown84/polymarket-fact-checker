import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2 } from "lucide-react";

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
      <motion.div 
        className="relative"
      >
        <motion.input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Will the Fed cut rates by 2026?"
          disabled={loading}
          className="w-full px-4 md:px-6 py-4 md:py-5 pl-10 md:pl-14 pr-24 md:pr-36 text-base md:text-lg rounded-xl border border-[#1a1a1a] bg-gradient-to-r from-[#0a0a0a] to-[#111] text-white placeholder-[#666] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-black/20"
        />
        
        <motion.div
          className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2"
          animate={loading ? { rotate: 360 } : { rotate: 0 }}
          transition={loading ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 0.3 }}
        >
          <Search className="text-[#666] w-5 h-5" />
        </motion.div>
        
        <motion.button
          type="submit"
          disabled={loading || !question.trim()}
          whileHover={loading ? {} : { opacity: 0.9, scale: 1.02 }}
          whileTap={loading ? {} : { scale: 0.98 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className="absolute right-1.5 md:right-2.5 top-1/2 -translate-y-1/2 px-3 md:px-7 py-2 md:py-3 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-emerald-500 disabled:hover:to-emerald-400 overflow-hidden flex items-center justify-center shadow-lg shadow-emerald-500/20"
          style={{ height: 'calc(100% - 1rem)' }}
        >
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.span
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking</span>
              </motion.span>
            ) : (
              <motion.span
                key="check"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                Check
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>

      {/* Subtle hint text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-[#555] text-sm mt-3"
      >
        Press Enter or click Check to search prediction markets
      </motion.p>
    </motion.form>
  );
}
