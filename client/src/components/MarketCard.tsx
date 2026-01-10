import { motion } from "framer-motion";
import { ExternalLink, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import ConfidenceBadge from "./ConfidenceBadge";

interface MarketCardProps {
  market: any;
  index?: number;
  variant?: "default" | "featured" | "compact" | "legacy";
  // Legacy props for backward compatibility with ResultCard
  isBest?: boolean;
  showDebug?: boolean;
  debug?: any;
}

export default function MarketCard({ 
  market, 
  index = 0, 
  variant = "default",
  isBest = false,
  showDebug = false,
  debug
}: MarketCardProps) {
  const probYes = market.evidence?.priceYes ?? market.priceYes ?? null;
  const volume = market.evidence?.volume ?? market.volume ?? 0;
  const volume24hr = market.evidence?.volume24hr ?? market.volume24hr ?? 0;
  const liquidity = market.evidence?.liquidity ?? market.liquidity ?? 0;
  const spread = market.evidence?.spread ?? market.spread ?? null;
  const matchScore = market.matchScore ?? market.similarity ?? null;
  const title = market.title || market.question || "Untitled Market";

  const formatCurrency = (value: number) => {
    if (!value) return "$0";
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const getProbColor = (prob: number | null) => {
    if (prob === null) return "text-[var(--text-muted)]";
    if (prob >= 0.7) return "text-[#00ff88]";
    if (prob >= 0.5) return "text-amber";
    if (prob >= 0.3) return "text-coral";
    return "text-[#ff4444]";
  };

  const getProbBgClass = (prob: number | null) => {
    if (prob === null) return "bg-surface";
    if (prob >= 0.7) return "bg-[#00ff88]/10";
    if (prob >= 0.5) return "bg-amber/10";
    if (prob >= 0.3) return "bg-coral/10";
    return "bg-[#ff4444]/10";
  };

  // Legacy variant for ResultCard compatibility
  if (isBest || variant === "legacy") {
    return (
      <div className={`glass-card rounded-xl p-5 ${isBest ? "border-cyan/30" : ""}`}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {isBest && (
                <span className="px-2 py-0.5 rounded-full bg-cyan/20 text-cyan text-xs font-mono">
                  Best Match
                </span>
              )}
              {matchScore !== null && (
                <ConfidenceBadge confidence={matchScore} label="Match" />
              )}
            </div>
            <h4 className="font-medium text-white text-base">{title}</h4>
            {market.description && (
              <p className="text-sm text-[var(--text-tertiary)] mt-1 line-clamp-2">
                {market.description}
              </p>
            )}
          </div>
          {market.url && (
            <a
              href={market.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan hover:text-cyan/80 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-surface/50">
            <div className="text-xs text-[var(--text-muted)] font-mono uppercase mb-1">Probability</div>
            <div className={`text-xl font-mono font-bold ${getProbColor(probYes)}`}>
              {probYes !== null ? `${(probYes * 100).toFixed(1)}%` : "—"}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-surface/50">
            <div className="text-xs text-[var(--text-muted)] font-mono uppercase mb-1">Volume</div>
            <div className="text-lg font-mono font-medium text-white">
              {formatCurrency(volume || volume24hr)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-surface/50">
            <div className="text-xs text-[var(--text-muted)] font-mono uppercase mb-1">Liquidity</div>
            <div className="text-lg font-mono font-medium text-cyan">
              {formatCurrency(liquidity)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-surface/50">
            <div className="text-xs text-[var(--text-muted)] font-mono uppercase mb-1">Spread</div>
            <div className="text-lg font-mono font-medium text-[var(--text-secondary)]">
              {spread !== null ? spread.toFixed(4) : "—"}
            </div>
          </div>
        </div>

        {showDebug && debug && (
          <div className="mt-4 p-3 rounded-lg bg-surface/50 border border-subtle">
            <div className="text-xs text-[var(--text-muted)] font-mono uppercase mb-2">Debug Info</div>
            <pre className="text-xs text-[var(--text-tertiary)] overflow-auto max-h-32">
              {JSON.stringify(debug, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }

  if (variant === "featured") {
    return (
      <motion.a
        href={market.url}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 30 }}
        whileHover={{ y: -4, scale: 1.01 }}
        className="group relative block overflow-hidden rounded-2xl border border-cyan/30 bg-gradient-to-br from-cyan/10 via-surface to-surface p-6 hover:border-cyan/50 transition-all"
      >
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50 group-hover:opacity-80 transition-opacity" />
        
        {/* Badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-1 rounded-full bg-cyan/20 border border-cyan/30">
          <Sparkles className="w-3 h-3 text-cyan" />
          <span className="text-[10px] font-mono text-cyan uppercase tracking-wide">Featured</span>
        </div>

        <div className="relative">
          {/* Title */}
          <h3 className="font-display text-lg font-semibold text-white mb-4 pr-24 line-clamp-2 group-hover:text-cyan transition-colors">
            {title}
          </h3>

          {/* Probability display */}
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs text-[var(--text-tertiary)] font-mono uppercase mb-1">Probability</div>
              <div className="flex items-center gap-2">
                <span className={`text-4xl font-display font-bold ${getProbColor(probYes)}`}>
                  {probYes !== null ? `${(probYes * 100).toFixed(0)}%` : "—"}
                </span>
                {probYes !== null && probYes > 0.5 && (
                  <TrendingUp className="w-5 h-5 text-[#00ff88]" />
                )}
                {probYes !== null && probYes <= 0.5 && (
                  <TrendingDown className="w-5 h-5 text-coral" />
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-[var(--text-tertiary)]">24h </span>
                  <span className="text-white">{formatCurrency(volume24hr)}</span>
                </div>
                <div>
                  <span className="text-[var(--text-tertiary)]">Liq </span>
                  <span className="text-cyan">{formatCurrency(liquidity)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.a>
    );
  }

  if (variant === "compact") {
    return (
      <motion.a
        href={market.url}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03 }}
        whileHover={{ x: 4 }}
        className="group flex items-center justify-between gap-4 py-3 px-4 rounded-lg border border-transparent hover:border-subtle hover:bg-elevated/50 transition-all"
      >
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white truncate group-hover:text-cyan transition-colors">
            {title}
          </h4>
          <div className="flex items-center gap-3 mt-1 text-xs font-mono text-[var(--text-tertiary)]">
            <span>{formatCurrency(volume24hr)}</span>
            <span className="text-[var(--text-muted)]">•</span>
            <span>{formatCurrency(liquidity)} liq</span>
          </div>
        </div>
        <div className={`text-lg font-mono font-bold ${getProbColor(probYes)}`}>
          {probYes !== null ? `${(probYes * 100).toFixed(0)}%` : "—"}
        </div>
      </motion.a>
    );
  }

  // Default card variant
  return (
    <motion.a
      href={market.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 300, damping: 30 }}
      whileHover={{ y: -2 }}
      className="group glass-card rounded-xl p-5 hover:border-cyan/30 transition-all block"
    >
      {/* Header with probability badge */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <h4 className="font-body text-sm font-medium text-white line-clamp-2 flex-1 group-hover:text-cyan transition-colors">
          {title}
        </h4>
        <div className={`shrink-0 px-3 py-1.5 rounded-lg ${getProbBgClass(probYes)}`}>
          <span className={`text-lg font-mono font-bold ${getProbColor(probYes)}`}>
            {probYes !== null ? `${(probYes * 100).toFixed(0)}%` : "—"}
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-2 rounded-lg bg-surface/50">
          <div className="text-[10px] text-[var(--text-muted)] font-mono uppercase mb-0.5">24h Vol</div>
          <div className="text-sm font-mono font-medium text-white">{formatCurrency(volume24hr)}</div>
        </div>
        <div className="p-2 rounded-lg bg-surface/50">
          <div className="text-[10px] text-[var(--text-muted)] font-mono uppercase mb-0.5">Total Vol</div>
          <div className="text-sm font-mono font-medium text-[var(--text-secondary)]">{formatCurrency(volume)}</div>
        </div>
        <div className="p-2 rounded-lg bg-surface/50">
          <div className="text-[10px] text-[var(--text-muted)] font-mono uppercase mb-0.5">Liquidity</div>
          <div className="text-sm font-mono font-medium text-cyan">{formatCurrency(liquidity)}</div>
        </div>
      </div>

      {/* Trend indicator */}
      {probYes !== null && (
        <div className="mt-4 flex items-center gap-2 text-xs font-mono">
          {probYes >= 0.5 ? (
            <>
              <TrendingUp className="w-3.5 h-3.5 text-[#00ff88]" />
              <span className="text-[#00ff88]">Likely</span>
            </>
          ) : (
            <>
              <TrendingDown className="w-3.5 h-3.5 text-coral" />
              <span className="text-coral">Unlikely</span>
            </>
          )}
          <span className="text-[var(--text-muted)]">•</span>
          <ExternalLink className="w-3 h-3 text-[var(--text-tertiary)] group-hover:text-cyan transition-colors" />
          <span className="text-[var(--text-tertiary)] group-hover:text-cyan transition-colors">Trade</span>
        </div>
      )}
    </motion.a>
  );
}
