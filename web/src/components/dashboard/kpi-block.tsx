interface KpiBlockProps {
  value: string;
  label: string;
}

export default function KpiBlock({ value, label }: KpiBlockProps) {
  return (
    <div className="text-center p-4 rounded-[12px] bg-[rgba(131,0,81,0.03)]">
      <div className="text-[24px] font-bold text-[#3f4444]">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.1em] text-gray-500 mt-1">
        {label}
      </div>
    </div>
  );
}
