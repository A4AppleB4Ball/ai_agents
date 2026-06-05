"use client";

import type { PulseData } from "@/app/agents/digital-kb/types/portfolio";
import HealthDot from "@/components/dashboard/health-dot";

interface PortfolioPulseProps {
  pulse: PulseData;
}

export default function PortfolioPulse({ pulse }: PortfolioPulseProps) {
  const total = pulse.total_projects;
  const greenPct = total > 0 ? (pulse.green / total) * 100 : 0;
  const yellowPct = total > 0 ? (pulse.yellow / total) * 100 : 0;
  const redPct = total > 0 ? (pulse.red / total) * 100 : 0;

  return (
    <div className="bg-white border border-[#e2e5e7] rounded-[14px] px-6 py-4 shadow-[0_1px_2px_rgba(25,27,27,0.04),0_8px_24px_rgba(25,27,27,0.06)]">
      <div className="flex items-center gap-6 flex-wrap">
        {/* Project count */}
        <div className="flex items-center gap-2">
          <span className="text-[24px] font-bold text-[#3f4444]">{total}</span>
          <span className="text-[11px] uppercase tracking-[0.1em] text-gray-500">Projects</span>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-[#e2e5e7]" />

        {/* Health counts */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <HealthDot health="green" size="sm" />
            <span className="text-sm font-medium text-[#3f4444]">{pulse.green}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <HealthDot health="yellow" size="sm" />
            <span className="text-sm font-medium text-[#3f4444]">{pulse.yellow}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <HealthDot health="red" size="sm" />
            <span className="text-sm font-medium text-[#3f4444]">{pulse.red}</span>
          </div>
          {pulse.stale > 0 && (
            <div className="flex items-center gap-1.5">
              <HealthDot health="gray" size="sm" />
              <span className="text-sm font-medium text-gray-400">{pulse.stale} stale</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-[#e2e5e7]" />

        {/* Health progress bar */}
        <div className="flex-1 min-w-[200px]">
          <div className="h-[8px] rounded-full bg-gray-100 overflow-hidden flex">
            {greenPct > 0 && (
              <div
                className="h-full bg-[#10b981]"
                style={{ width: `${greenPct}%` }}
              />
            )}
            {yellowPct > 0 && (
              <div
                className="h-full bg-[#f59e0b]"
                style={{ width: `${yellowPct}%` }}
              />
            )}
            {redPct > 0 && (
              <div
                className="h-full bg-[#ef4444]"
                style={{ width: `${redPct}%` }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
