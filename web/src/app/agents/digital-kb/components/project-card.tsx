"use client";

import Link from "next/link";
import type { ProjectSummary } from "@/app/agents/digital-kb/types/portfolio";
import DashboardCard from "@/components/dashboard/dashboard-card";
import HealthDot from "@/components/dashboard/health-dot";

interface ProjectCardProps {
  project: ProjectSummary;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/agents/digital-kb/${project.slug}`}>
      <DashboardCard clickable warning={project.blockers.length > 0}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <HealthDot health={project.health} />
            <h3 className="text-sm font-semibold text-[#3f4444]">{project.name}</h3>
          </div>
          <span className="text-[10px] uppercase tracking-wide text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
            {project.phase}
          </span>
        </div>

        <p className="text-[12px] text-gray-500 mt-2 line-clamp-2 leading-relaxed">
          {project.summary}
        </p>

        {project.next_milestone && (
          <div className="mt-3 pt-3 border-t border-[#f0f0f0]">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">
              Next Milestone
            </div>
            <div className="text-[12px] text-[#3f4444] font-medium">
              {project.next_milestone.what}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              {project.next_milestone.date}
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">{project.owner}</span>
          <span className="text-[10px] text-gray-300">
            {project.last_updated}
          </span>
        </div>
      </DashboardCard>
    </Link>
  );
}
