interface ConfidenceBadgeProps {
  confidence: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export default function ConfidenceBadge({
  confidence,
  label = "Confidence",
  size = "sm",
}: ConfidenceBadgeProps) {
  const percentage = Math.round(confidence * 100);
  
  const getColor = () => {
    if (percentage >= 70) return { bar: "bg-[#00ff88]", text: "text-[#00ff88]" };
    if (percentage >= 50) return { bar: "bg-amber", text: "text-amber" };
    return { bar: "bg-coral", text: "text-coral" };
  };

  const colors = getColor();
  
  const sizeClasses = {
    sm: { bar: "w-16 h-1.5", text: "text-xs" },
    md: { bar: "w-24 h-2", text: "text-sm" },
    lg: { bar: "w-32 h-2.5", text: "text-base" },
  };

  const classes = sizeClasses[size];

  return (
    <div className="flex items-center gap-2">
      <span className={`${classes.text} text-[var(--text-muted)] font-mono uppercase tracking-wide`}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <div className={`${classes.bar} bg-surface rounded-full overflow-hidden`}>
          <div
            className={`h-full ${colors.bar} transition-all duration-500 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={`${classes.text} font-mono font-semibold ${colors.text} min-w-[2.5rem]`}>
          {percentage}%
        </span>
      </div>
    </div>
  );
}
