"use client";

import DashboardCard from "@/components/dashboard/dashboard-card";
import SectionLabel from "@/components/dashboard/section-label";
import Tag from "@/components/dashboard/tag";

interface TechStackTagsProps {
  items: string[];
  label: string;
}

export default function TechStackTags({ items, label }: TechStackTagsProps) {
  return (
    <DashboardCard>
      <SectionLabel>{label}</SectionLabel>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2 mt-4">
          {items.map((item, i) => (
            <Tag key={i}>{item}</Tag>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 mt-3">None listed</p>
      )}
    </DashboardCard>
  );
}
