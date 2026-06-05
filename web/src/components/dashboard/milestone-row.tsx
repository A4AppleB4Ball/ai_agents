interface MilestoneRowProps {
  date: string;
  title: string;
  description?: string;
  status: string;
  projectName?: string;
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase().replace(/[\s_]/g, "-");
  let bgColor = "bg-gray-100 text-gray-600";

  if (normalized === "on-track" || normalized === "done") {
    bgColor = "bg-[rgba(16,185,129,0.1)] text-[#059669]";
  } else if (normalized === "at-risk" || normalized === "active") {
    bgColor = "bg-[rgba(245,158,11,0.1)] text-[#d97706]";
  }

  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${bgColor}`}>
      {status}
    </span>
  );
}

export default function MilestoneRow({
  date,
  title,
  description,
  status,
  projectName,
}: MilestoneRowProps) {
  // Parse date to get day and month
  const dateObj = new Date(date);
  const day = dateObj.getDate();
  const month = dateObj.toLocaleString("en-US", { month: "short" });

  return (
    <div className="flex items-start gap-4 py-3 border-b border-[#f0f0f0] last:border-0">
      {/* Date block */}
      <div className="flex flex-col items-center min-w-[40px]">
        <span className="text-[18px] font-bold text-[#3f4444] leading-none">{day}</span>
        <span className="text-[10px] uppercase text-gray-400 mt-0.5">{month}</span>
      </div>

      {/* Info section */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[#3f4444]">{title}</div>
        {projectName && (
          <div className="text-[11px] text-gray-400 mt-0.5">{projectName}</div>
        )}
        {description && (
          <div className="text-[12px] text-gray-500 mt-0.5">{description}</div>
        )}
      </div>

      {/* Status pill */}
      <StatusPill status={status} />
    </div>
  );
}
