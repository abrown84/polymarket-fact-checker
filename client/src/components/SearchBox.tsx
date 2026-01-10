import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, ArrowRight, Sparkles } from "lucide-react";

interface SearchBoxProps {
  question: string;
  setQuestion: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}

const exampleQueries = [
  "What's happening with crypto?",
  "Will the Fed cut rates this quarter?",
  "Latest on the 2028 election",
  "Is it true AI will replace programmers?",
];

export default function SearchBox({
  question,
  setQuestion,
  onSubmit,
  loading,
}: SearchBoxProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="w-full"
    >
      <form onSubmit={onSubmit}>
        <div className="relative group">
          {/* Glow effect on focus */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan/50 to-cyan/20 rounded-2xl opacity-0 group-focus-within:opacity-100 blur-lg transition-opacity duration-300" />
          
          <div className="relative">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What's going on with... or Is it true that..."
              disabled={loading}
              className="w-full px-6 py-5 pl-14 pr-32 text-lg rounded-2xl 
                bg-surface border border-default
                text-white placeholder-[var(--text-tertiary)]
                focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan/50
                disabled:opacity-50 disabled:cursor-not-allowed 
                transition-all duration-200 font-body"
            />
            
            {/* Search icon */}
            <div className="absolute left-5 top-1/2 -translate-y-1/2">
              <Search className="w-5 h-5 text-[var(--text-tertiary)]" />
            </div>
            
            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={loading || !question.trim()}
              whileHover={loading ? {} : {}}
              whileTap={loading ? {} : {}}
              className="absolute right-2 top-1/2 -translate-y-1/2 
                px-5 h-11 rounded-xl
                bg-gradient-to-r from-cyan to-[#00b8e6]
                text-void font-display font-semibold text-sm
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all duration-200
                flex items-center justify-center gap-2
                shadow-lg shadow-cyan/20
                min-w-[100px]
                hover:shadow-xl hover:shadow-cyan/30 hover:brightness-110
                active:scale-[0.98]"
            >
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2 w-full"
                  >
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                    <span className="hidden sm:inline whitespace-nowrap">Analyzing</span>
                  </motion.span>
                ) : (
                  <motion.span
                    key="submit"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2 w-full"
                  >
                    <Sparkles className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden sm:inline whitespace-nowrap">Check</span>
                    <ArrowRight className="w-4 h-4 sm:hidden flex-shrink-0" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </form>

      {/* Example queries */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-4 flex flex-wrap items-center justify-center gap-2"
      >
        <span className="text-[var(--text-muted)] text-sm font-mono">Try:</span>
        {exampleQueries.map((query, i) => (
          <motion.button
            key={query}
            type="button"
            onClick={() => setQuestion(query)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            whileHover={{ scale: 1.02, backgroundColor: "rgba(0, 212, 255, 0.1)" }}
            className="px-3 py-1.5 rounded-lg border border-subtle 
              text-[var(--text-secondary)] text-sm
              hover:text-cyan hover:border-cyan/30
              transition-colors duration-200"
          >
            {query}
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}
