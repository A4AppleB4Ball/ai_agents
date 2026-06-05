interface DashboardCardProps {
  children: React.ReactNode;
  className?: string;
  clickable?: boolean;
  warning?: boolean;
}

export default function DashboardCard({
  children,
  className = "",
  clickable = false,
  warning = false,
}: DashboardCardProps) {
  return (
    <div
      className={[
        "bg-white border rounded-[14px] p-5",
        "shadow-[0_1px_2px_rgba(25,27,27,0.04),0_8px_24px_rgba(25,27,27,0.06)]",
        warning ? "border-[rgba(239,68,68,0.3)]" : "border-[#e2e5e7]",
        clickable
          ? "transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(25,27,27,0.1),0_12px_32px_rgba(25,27,27,0.1)] hover:border-[rgba(131,0,81,0.25)] cursor-pointer"
          : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
