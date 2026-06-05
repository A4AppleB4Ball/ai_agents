"use client";

import Link from "next/link";
import type { AttentionItem } from "@/app/agents/digital-kb/types/portfolio";
import DashboardCard from "@/components/dashboard/dashboard-card";
import SectionLabel from "@/components/dashboard/section-label";
import HealthDot from "@/components/dashboard/health-dot";

interface AttentionPanelProps {
  items: AttentionItem[];
}

export default function AttentionPanel({ items }: AttentionPanelProps) {
  if (items.length === 0) return null;

  return (
    <DashboardCard>
      <SectionLabel>Needs Attention</SectionLabel>
      <div className="mt-4 space-y-3">
        {items.map((item, i) => (
          <Link
            key={i}
            href={`/agents/digital-kb/${item.project_slug}`}
            className="block p-3 rounded-lg border border-[#f0f0f0] hover:border-[rgba(131,0,81,0.2)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <HealthDot health={item.level} size="sm" />
              <span className="text-sm font-medium text-[#3f4444]">{item.title}</span>
            </div>
            <p className="text-[12px] text-gray-500 mt-1 ml-[18px]">{item.description}</p>
          </Link>
        ))}
      </div>
    </DashboardCard>
  );
}
