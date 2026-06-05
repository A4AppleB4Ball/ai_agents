"use client";

import type { Risk } from "@/app/agents/digital-kb/types/portfolio";
import DashboardCard from "@/components/dashboard/dashboard-card";
import SectionLabel from "@/components/dashboard/section-label";
import RiskItem from "@/components/dashboard/risk-item";

interface RisksPanelProps {
  risks: Risk[];
}

export default function RisksPanel({ risks }: RisksPanelProps) {
  return (
    <DashboardCard>
      <SectionLabel>Risks</SectionLabel>
      {risks.length > 0 ? (
        <div className="mt-4 space-y-2">
          {risks.map((risk, i) => (
            <RiskItem key={i} level={risk.level} description={risk.description} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 mt-3">No risks identified</p>
      )}
    </DashboardCard>
  );
}
