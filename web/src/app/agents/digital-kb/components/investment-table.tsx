"use client";

import type { InvestmentRow } from "@/app/agents/digital-kb/types/portfolio";
import DashboardCard from "@/components/dashboard/dashboard-card";
import SectionLabel from "@/components/dashboard/section-label";

interface InvestmentTableProps {
  rows: InvestmentRow[];
}

export default function InvestmentTable({ rows }: InvestmentTableProps) {
  return (
    <DashboardCard>
      <SectionLabel>Investment Summary</SectionLabel>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e2e5e7]">
              <th className="text-left py-2 text-[10px] uppercase tracking-wide text-gray-400 font-medium">Year</th>
              <th className="text-right py-2 text-[10px] uppercase tracking-wide text-gray-400 font-medium">Investment</th>
              <th className="text-right py-2 text-[10px] uppercase tracking-wide text-gray-400 font-medium">Recurring</th>
              <th className="text-right py-2 text-[10px] uppercase tracking-wide text-gray-400 font-medium">Cumul. Cost</th>
              <th className="text-right py-2 text-[10px] uppercase tracking-wide text-gray-400 font-medium">Cumul. Benefit</th>
              <th className="text-right py-2 text-[10px] uppercase tracking-wide text-gray-400 font-medium">Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-[#f5f5f5] last:border-0">
                <td className="py-2 text-[#3f4444] font-medium">{row.year}</td>
                <td className="py-2 text-right text-[#3f4444]">{row.investment}</td>
                <td className="py-2 text-right text-gray-500">{row.recurring || "-"}</td>
                <td className="py-2 text-right text-gray-500">{row.cumul_cost}</td>
                <td className="py-2 text-right text-[#059669]">{row.cumul_benefit}</td>
                <td className="py-2 text-right font-medium text-[#3f4444]">{row.net}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
}
