interface ConfidenceBadgeProps {
  confidence: number;
  label?: string;
}

export default function ConfidenceBadge({
  confidence,
  label = "Confidence",
}: ConfidenceBadgeProps) {
  const percentage = Math.round(confidence * 100);
  const getColor = () => {
    if (percentage >= 70) return "bg-emerald-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[#888]">{label}:</span>
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div
            className={`h-full ${getColor()} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-white min-w-[3rem]">
          {percentage}%
        </span>
      </div>
    </div>
  );
}
