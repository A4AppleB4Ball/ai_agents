interface TagProps {
  children: React.ReactNode;
}

export default function Tag({ children }: TagProps) {
  return (
    <span className="inline-block px-[10px] py-[4px] rounded-[5px] text-[11px] bg-[rgba(131,0,81,0.06)] text-[#830051] border border-[rgba(131,0,81,0.12)]">
      {children}
    </span>
  );
}
