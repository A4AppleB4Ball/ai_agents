"use client";

import type { StrategyData } from "@/app/agents/digital-kb/types/portfolio";
import DashboardCard from "@/components/dashboard/dashboard-card";
import SectionLabel from "@/components/dashboard/section-label";

interface StrategyBlockProps {
  strategy: StrategyData;
}

export default function StrategyBlock({ strategy }: StrategyBlockProps) {
  return (
    <DashboardCard>
      <SectionLabel>Strategy</SectionLabel>
      <div className="mt-4 space-y-3">
        <p className="text-sm text-[#3f4444] leading-relaxed font-medium">
          {strategy.summary}
        </p>
        <p className="text-[12px] text-gray-500 leading-relaxed">
          {strategy.detail}
        </p>
        {strategy.h2_bets && (
          <div className="pt-3 border-t border-[#f0f0f0]">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">
              H2 Bets
            </div>
            <p className="text-[12px] text-[#3f4444]">{strategy.h2_bets}</p>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
