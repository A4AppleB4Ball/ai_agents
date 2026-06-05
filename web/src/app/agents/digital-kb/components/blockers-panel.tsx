"use client";

import type { Blocker } from "@/app/agents/digital-kb/types/portfolio";
import DashboardCard from "@/components/dashboard/dashboard-card";
import SectionLabel from "@/components/dashboard/section-label";
import RiskItem from "@/components/dashboard/risk-item";

interface BlockersPanelProps {
  blockers: Blocker[];
}

export default function BlockersPanel({ blockers }: BlockersPanelProps) {
  return (
    <DashboardCard warning={blockers.length > 0}>
      <SectionLabel>Blockers</SectionLabel>
      {blockers.length > 0 ? (
        <div className="mt-4 space-y-2">
          {blockers.map((blocker, i) => (
            <RiskItem
              key={i}
              level="blocker"
              description={`${blocker.description} (Owner: ${blocker.owner}, ${blocker.age_days}d)`}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 mt-3">No blockers</p>
      )}
    </DashboardCard>
  );
}
