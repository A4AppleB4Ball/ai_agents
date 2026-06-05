"use client";

import { useParams } from "next/navigation";
import { useProject } from "@/app/agents/digital-kb/hooks/use-portfolio";
import BackLink from "@/components/dashboard/back-link";
import ProjectDetailHeader from "@/app/agents/digital-kb/components/project-detail-header";
import InvestmentTable from "@/app/agents/digital-kb/components/investment-table";
import MilestonesTracker from "@/app/agents/digital-kb/components/milestones-tracker";
import RisksPanel from "@/app/agents/digital-kb/components/risks-panel";
import BlockersPanel from "@/app/agents/digital-kb/components/blockers-panel";
import TechStackTags from "@/app/agents/digital-kb/components/tech-stack-tags";
import ModulesGrid from "@/app/agents/digital-kb/components/modules-grid";
import TimelineSection from "@/app/agents/digital-kb/components/timeline-section";
import PeopleBlock from "@/app/agents/digital-kb/components/people-block";
import SectionLabel from "@/components/dashboard/section-label";
import KpiBlock from "@/components/dashboard/kpi-block";
import DashboardCard from "@/components/dashboard/dashboard-card";

export default function ProjectDetailPage() {
  const params = useParams();
  const slug = params.project as string;
  const { project, error, isLoading } = useProject(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafafb] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#830051]" />
      </div>
    );
  }

  if (error) {
    throw new Error(`Failed to load project: ${error.message}`);
  }

  if (!project) {
    throw new Error("Project data not found");
  }

  return (
    <div className="min-h-screen bg-[#fafafb] p-8 max-w-[1400px] mx-auto">
      {/* Back link */}
      <BackLink href="/agents/digital-kb" />

      {/* Header */}
      <ProjectDetailHeader project={project} />

      {/* Business Case + Business Impact */}
      <div className="grid lg:grid-cols-2 grid-cols-1 gap-6 mt-8">
        <DashboardCard>
          <SectionLabel>Business Case</SectionLabel>
          {project.what_it_is && (
            <p className="text-sm text-[#3f4444] mt-3 leading-relaxed">
              {project.what_it_is}
            </p>
          )}
          {project.current_status && (
            <p className="text-sm text-[#3f4444] mt-2 leading-relaxed">
              {project.current_status}
            </p>
          )}
        </DashboardCard>

        <DashboardCard>
          <SectionLabel>Business Impact</SectionLabel>
          {project.business_impact.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {project.business_impact.map((impact, i) => (
                <li key={i} className="text-sm text-[#3f4444] flex items-start gap-2">
                  <span className="text-[#830051] mt-0.5">&#x2022;</span>
                  {impact}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 mt-3">No business impact data</p>
          )}
        </DashboardCard>
      </div>

      {/* Dates + People */}
      <div className="grid lg:grid-cols-2 grid-cols-1 gap-6 mt-6">
        {project.dates && (
          <DashboardCard>
            <SectionLabel>Key Dates</SectionLabel>
            <div className="mt-3 space-y-2">
              {project.dates.programme_start && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Programme Start</span>
                  <span className="text-[#3f4444] font-medium">{project.dates.programme_start}</span>
                </div>
              )}
              {project.dates.current_release && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Current Release</span>
                  <span className="text-[#3f4444] font-medium">{project.dates.current_release}</span>
                </div>
              )}
              {project.dates.go_live && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Go Live</span>
                  <span className="text-[#3f4444] font-medium">{project.dates.go_live}</span>
                </div>
              )}
              {project.dates.horizon && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Horizon</span>
                  <span className="text-[#3f4444] font-medium">{project.dates.horizon}</span>
                </div>
              )}
            </div>
          </DashboardCard>
        )}

        {project.people && <PeopleBlock people={project.people} />}
      </div>

      {/* Investment Table */}
      {project.investment.length > 0 && (
        <div className="mt-6">
          <InvestmentTable rows={project.investment} />
        </div>
      )}

      {/* Milestones Tracker */}
      {project.milestones.length > 0 && (
        <div className="mt-6">
          <MilestonesTracker milestones={project.milestones} />
        </div>
      )}

      {/* Risks + Blockers */}
      <div className="grid lg:grid-cols-2 grid-cols-1 gap-6 mt-6">
        <RisksPanel risks={project.risks} />
        <BlockersPanel blockers={project.blockers} />
      </div>

      {/* Tech Stack + Data Sources */}
      <div className="grid lg:grid-cols-2 grid-cols-1 gap-6 mt-6">
        <TechStackTags items={project.tech_stack} label="Tech Stack" />
        <TechStackTags items={project.data_sources} label="Data Sources" />
      </div>

      {/* Modules Grid */}
      {project.modules.length > 0 && (
        <div className="mt-6">
          <ModulesGrid modules={project.modules} />
        </div>
      )}

      {/* Timeline */}
      {project.timeline.length > 0 && (
        <div className="mt-6">
          <TimelineSection timeline={project.timeline} />
        </div>
      )}

      {/* KPIs */}
      {project.kpis.length > 0 && (
        <div className="mt-6">
          <SectionLabel>Key Metrics</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {project.kpis.map((kpi, i) => (
              <KpiBlock key={i} value={kpi.value} label={kpi.label} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
