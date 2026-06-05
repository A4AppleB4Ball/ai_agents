"use client";

import type { ProjectDetailResponse } from "@/app/agents/digital-kb/types/portfolio";
import HealthDot from "@/components/dashboard/health-dot";

interface ProjectDetailHeaderProps {
  project: ProjectDetailResponse;
}

export default function ProjectDetailHeader({ project }: ProjectDetailHeaderProps) {
  const accentColor = project.accent || "#830051";

  return (
    <div className="flex items-start gap-4">
      {/* Orb */}
      <div
        className="w-[48px] h-[48px] rounded-full shrink-0 flex items-center justify-center"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${accentColor}44, ${accentColor})`,
        }}
      >
        <span className="text-white text-[18px] font-bold">
          {project.name.charAt(0)}
        </span>
      </div>

      {/* Name + subtitle */}
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h1 className="text-[24px] font-[Georgia] font-bold text-[#3f4444]">
            {project.name}
          </h1>
          <HealthDot health={project.health} />
          <span className="text-[10px] uppercase tracking-wide text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-[#e2e5e7]">
            {project.phase}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">{project.summary}</p>
        <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-400">
          <span>Owner: {project.owner}</span>
          {project.pm && <span>PM: {project.pm}</span>}
          {project.tech_lead && <span>Tech Lead: {project.tech_lead}</span>}
          <span>Updated: {project.last_updated}</span>
        </div>
      </div>
    </div>
  );
}
