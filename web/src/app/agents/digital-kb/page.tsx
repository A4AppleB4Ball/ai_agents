"use client";

import { usePortfolio } from "@/app/agents/digital-kb/hooks/use-portfolio";
import PortfolioPulse from "@/app/agents/digital-kb/components/portfolio-pulse";
import ProjectGrid from "@/app/agents/digital-kb/components/project-grid";
import AttentionPanel from "@/app/agents/digital-kb/components/attention-panel";
import StrategyBlock from "@/app/agents/digital-kb/components/strategy-block";
import MilestoneTimeline from "@/app/agents/digital-kb/components/milestone-timeline";
import InvestmentKpis from "@/app/agents/digital-kb/components/investment-kpis";

export default function DigitalKbPortfolioPage() {
  const { portfolio, error, isLoading } = usePortfolio();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafafb] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#830051]" />
      </div>
    );
  }

  if (error) {
    throw new Error(`Failed to load portfolio: ${error.message}`);
  }

  if (!portfolio) {
    throw new Error("Portfolio data not found");
  }

  // Aggregate KPIs from all projects for the portfolio-level view
  const allKpis = portfolio.projects.flatMap((p) => p.kpis).slice(0, 4);

  return (
    <div className="min-h-screen bg-[#fafafb] p-8 max-w-[1400px] mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-[28px] font-[Georgia] font-bold text-[#3f4444]">
          Digital KB Portfolio
        </h1>
        <p className="text-[12px] text-gray-400 mt-1">
          Last synced: {portfolio.last_synced} &middot; {portfolio.commit_sha.slice(0, 7)}
        </p>
      </div>

      {/* 1. Portfolio Pulse */}
      <PortfolioPulse pulse={portfolio.pulse} />

      {/* 2. Project Grid by vertical */}
      <div className="mt-8">
        <ProjectGrid verticals={portfolio.verticals} projects={portfolio.projects} />
      </div>

      {/* 3. Attention + Strategy */}
      <div className="grid lg:grid-cols-2 grid-cols-1 gap-6 mt-8">
        <AttentionPanel items={portfolio.attention} />
        {portfolio.strategy && <StrategyBlock strategy={portfolio.strategy} />}
      </div>

      {/* 4. Milestone Timeline */}
      <div className="mt-8">
        <MilestoneTimeline milestones={portfolio.upcoming_milestones} />
      </div>

      {/* 5. Investment KPIs */}
      <div className="mt-8">
        <InvestmentKpis kpis={allKpis} />
      </div>
    </div>
  );
}
