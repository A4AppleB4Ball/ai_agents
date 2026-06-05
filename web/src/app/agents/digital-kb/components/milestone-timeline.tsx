"use client";

import type { UpcomingMilestone } from "@/app/agents/digital-kb/types/portfolio";
import DashboardCard from "@/components/dashboard/dashboard-card";
import SectionLabel from "@/components/dashboard/section-label";
import MilestoneRow from "@/components/dashboard/milestone-row";

interface MilestoneTimelineProps {
  milestones: UpcomingMilestone[];
}

export default function MilestoneTimeline({ milestones }: MilestoneTimelineProps) {
  if (milestones.length === 0) return null;

  return (
    <DashboardCard>
      <SectionLabel>Upcoming Milestones</SectionLabel>
      <div className="mt-4">
        {milestones.map((ms, i) => (
          <MilestoneRow
            key={i}
            date={ms.date}
            title={ms.what}
            description={ms.description}
            status={ms.status}
            projectName={ms.project_name}
          />
        ))}
      </div>
    </DashboardCard>
  );
}
