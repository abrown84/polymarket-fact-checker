interface MetricRowProps {
  label: string;
  value: string | number;
}

export default function MetricRow({ label, value }: MetricRowProps) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[#1a1a1a] last:border-0">
      <span className="text-sm text-[#888]">{label}</span>
      <span className="text-sm font-medium text-white">
        {value}
      </span>
    </div>
  );
}
