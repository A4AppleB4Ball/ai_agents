interface TrackerRowProps {
  status: string;
  title: string;
  description?: string;
  progress: number;
}

const PILL_COLORS: Record<string, string> = {
  done: "bg-[rgba(16,185,129,0.1)] text-[#059669]",
  active: "bg-[rgba(131,0,81,0.1)] text-[#830051]",
  upcoming: "bg-gray-100 text-gray-500",
  design: "bg-[rgba(245,158,11,0.1)] text-[#d97706]",
  proposed: "bg-gray-100 text-gray-500",
};

export default function TrackerRow({ status, title, description, progress }: TrackerRowProps) {
  const pillColor = PILL_COLORS[status.toLowerCase()] || PILL_COLORS.upcoming;
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[#f0f0f0] last:border-0">
      {/* Status pill */}
      <span
        className={`text-[10px] uppercase font-bold px-2 py-1 rounded text-center w-[80px] shrink-0 ${pillColor}`}
      >
        {status}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[#3f4444] truncate">{title}</div>
        {description && (
          <div className="text-[11px] text-gray-400 truncate">{description}</div>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-[130px] shrink-0">
        <div className="h-[6px] rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#830051] transition-all duration-300"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
        <div className="text-[10px] text-gray-400 mt-0.5 text-right">{clampedProgress}%</div>
      </div>
    </div>
  );
}
