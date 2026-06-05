"use client";

import type { PeopleInfo } from "@/app/agents/digital-kb/types/portfolio";
import DashboardCard from "@/components/dashboard/dashboard-card";
import SectionLabel from "@/components/dashboard/section-label";

interface PeopleBlockProps {
  people: PeopleInfo;
}

function PersonRow({ role, name }: { role: string; name: string }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-gray-500">{role}</span>
      <span className="text-[#3f4444] font-medium">{name}</span>
    </div>
  );
}

export default function PeopleBlock({ people }: PeopleBlockProps) {
  return (
    <DashboardCard>
      <SectionLabel>People</SectionLabel>
      <div className="mt-3 space-y-1">
        {people.owner && <PersonRow role="Owner" name={people.owner} />}
        {people.pm && <PersonRow role="PM" name={people.pm} />}
        {people.global_po && <PersonRow role="Global PO" name={people.global_po} />}
        {people.product_owner && <PersonRow role="Product Owner" name={people.product_owner} />}
        {people.tech_lead && <PersonRow role="Tech Lead" name={people.tech_lead} />}
        {people.it_pm && <PersonRow role="IT PM" name={people.it_pm} />}
        {people.ba.length > 0 && (
          <div className="flex justify-between text-sm py-1">
            <span className="text-gray-500">BAs</span>
            <span className="text-[#3f4444] font-medium">{people.ba.join(", ")}</span>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
