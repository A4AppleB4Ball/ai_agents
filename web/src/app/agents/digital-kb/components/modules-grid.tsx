"use client";

import type { ModuleInfo } from "@/app/agents/digital-kb/types/portfolio";
import DashboardCard from "@/components/dashboard/dashboard-card";
import SectionLabel from "@/components/dashboard/section-label";

interface ModulesGridProps {
  modules: ModuleInfo[];
}

export default function ModulesGrid({ modules }: ModulesGridProps) {
  return (
    <div>
      <SectionLabel>Modules</SectionLabel>
      <div className="grid lg:grid-cols-3 grid-cols-1 gap-4 mt-4">
        {modules.map((mod, i) => (
          <DashboardCard key={i}>
            <h4 className="text-sm font-semibold text-[#3f4444]">{mod.name}</h4>
            <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">
              {mod.description}
            </p>
          </DashboardCard>
        ))}
      </div>
    </div>
  );
}
