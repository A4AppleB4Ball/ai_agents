import Link from "next/link";

interface BackLinkProps {
  href: string;
  label?: string;
}

export default function BackLink({ href, label = "Back to portfolio" }: BackLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-[12px] text-gray-500 hover:text-[#830051] transition-colors mb-6"
    >
      <span>&larr;</span>
      <span>{label}</span>
    </Link>
  );
}
