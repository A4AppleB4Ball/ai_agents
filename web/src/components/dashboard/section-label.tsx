interface SectionLabelProps {
  children: React.ReactNode;
}

export default function SectionLabel({ children }: SectionLabelProps) {
  return (
    <div className="flex items-center gap-[10px]">
      <span className="uppercase text-[10.5px] tracking-[0.14em] font-bold text-[#830051] whitespace-nowrap">
        {children}
      </span>
      <span
        className="flex-1 h-px"
        style={{
          background: "linear-gradient(to right, #830051, transparent)",
        }}
      />
    </div>
  );
}
