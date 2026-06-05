"use client";

import type { ProjectSummary, VerticalData } from "@/app/agents/digital-kb/types/portfolio";
import SectionLabel from "@/components/dashboard/section-label";
import ProjectCard from "@/app/agents/digital-kb/components/project-card";

interface ProjectGridProps {
  verticals: VerticalData[];
  projects: ProjectSummary[];
}

export default function ProjectGrid({ verticals, projects }: ProjectGridProps) {
  // Build a lookup map: slug -> project
  const projectMap = new Map(projects.map((p) => [p.slug, p]));

  return (
    <div className="space-y-8">
      {verticals.map((vertical) => {
        const verticalProjects = vertical.projects
          .map((slug) => projectMap.get(slug))
          .filter((p): p is ProjectSummary => p !== undefined);

        if (verticalProjects.length === 0) return null;

        return (
          <div key={vertical.slug}>
            <SectionLabel>{vertical.name}</SectionLabel>
            <div className="grid lg:grid-cols-3 grid-cols-1 gap-4 mt-4">
              {verticalProjects.map((project) => (
                <ProjectCard key={project.slug} project={project} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
