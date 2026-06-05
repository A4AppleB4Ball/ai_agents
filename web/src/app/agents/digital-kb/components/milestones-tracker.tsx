"use client";

import type { Milestone } from "@/app/agents/digital-kb/types/portfolio";
import DashboardCard from "@/components/dashboard/dashboard-card";
import SectionLabel from "@/components/dashboard/section-label";
import TrackerRow from "@/components/dashboard/tracker-row";

interface MilestonesTrackerProps {
  milestones: Milestone[];
}

export default function MilestonesTracker({ milestones }: MilestonesTrackerProps) {
  return (
    <DashboardCard>
      <SectionLabel>Milestones</SectionLabel>
      <div className="mt-4">
        {milestones.map((ms, i) => (
          <TrackerRow
            key={i}
            status={ms.status}
            title={ms.what}
            description={ms.date || undefined}
            progress={ms.progress}
          />
        ))}
      </div>
    </DashboardCard>
  );
}
