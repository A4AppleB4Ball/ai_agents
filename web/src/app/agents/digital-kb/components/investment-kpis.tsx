"use client";

import type { KPI } from "@/app/agents/digital-kb/types/portfolio";
import SectionLabel from "@/components/dashboard/section-label";
import KpiBlock from "@/components/dashboard/kpi-block";

interface InvestmentKpisProps {
  kpis: KPI[];
}

export default function InvestmentKpis({ kpis }: InvestmentKpisProps) {
  if (kpis.length === 0) return null;

  return (
    <div>
      <SectionLabel>Portfolio KPIs</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {kpis.map((kpi, i) => (
          <KpiBlock key={i} value={kpi.value} label={kpi.label} />
        ))}
      </div>
    </div>
  );
}
