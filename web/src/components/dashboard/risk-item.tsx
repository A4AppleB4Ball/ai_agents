interface RiskItemProps {
  level: "high" | "medium" | "low" | "blocker";
  description: string;
}

const LEVEL_STYLES: Record<RiskItemProps["level"], { border: string; bg: string; tag: string }> = {
  blocker: { border: "border-l-[#ef4444]", bg: "bg-[rgba(239,68,68,0.04)]", tag: "bg-[rgba(239,68,68,0.1)] text-[#dc2626]" },
  high: { border: "border-l-[#ef4444]", bg: "bg-[rgba(239,68,68,0.04)]", tag: "bg-[rgba(239,68,68,0.1)] text-[#dc2626]" },
  medium: { border: "border-l-[#f59e0b]", bg: "bg-[rgba(245,158,11,0.04)]", tag: "bg-[rgba(245,158,11,0.1)] text-[#d97706]" },
  low: { border: "border-l-[#10b981]", bg: "bg-[rgba(16,185,129,0.04)]", tag: "bg-[rgba(16,185,129,0.1)] text-[#059669]" },
};

export default function RiskItem({ level, description }: RiskItemProps) {
  const styles = LEVEL_STYLES[level];

  return (
    <div className={`border-l-[3px] ${styles.border} ${styles.bg} rounded-r-lg px-4 py-3`}>
      <div className="flex items-start gap-2">
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${styles.tag} shrink-0`}>
          {level}
        </span>
        <span className="text-sm text-[#3f4444]">{description}</span>
      </div>
    </div>
  );
}
