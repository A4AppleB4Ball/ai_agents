"use client";

import type { TimelineEntry } from "@/app/agents/digital-kb/types/portfolio";
import DashboardCard from "@/components/dashboard/dashboard-card";
import SectionLabel from "@/components/dashboard/section-label";

interface TimelineSectionProps {
  timeline: TimelineEntry[];
}

export default function TimelineSection({ timeline }: TimelineSectionProps) {
  return (
    <DashboardCard>
      <SectionLabel>Timeline</SectionLabel>
      <div className="mt-4 space-y-4">
        {timeline.map((entry, i) => (
          <div key={i} className="flex gap-4">
            {/* Date */}
            <div className="w-[80px] shrink-0 text-[12px] text-gray-400 font-medium pt-0.5">
              {entry.date}
            </div>

            {/* Dot + line */}
            <div className="flex flex-col items-center">
              <div className="w-2 h-2 rounded-full bg-[#830051] shrink-0 mt-1.5" />
              {i < timeline.length - 1 && (
                <div className="w-px flex-1 bg-[#e2e5e7] mt-1" />
              )}
            </div>

            {/* Entries */}
            <div className="flex-1 pb-4">
              {entry.entries.map((text, j) => (
                <p key={j} className="text-sm text-[#3f4444] leading-relaxed">
                  {text}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
