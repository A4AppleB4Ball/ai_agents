# Digital KB — Frontend Design

## Routing

```
/agents/digital-kb              → Portfolio dashboard page
/agents/digital-kb/[project]    → Project detail page (slug-based)
```

These are Next.js app router pages under `web/src/app/agents/digital-kb/`.

## Agent Tab Integration

The existing app shows `ChatInterface` or `EmptyState` as the main content. Digital KB adds a tab bar when this agent is selected:

```
┌──────────────────────────────────────────┐
│  [ Portfolio ]  [ Chat ]                  │
├──────────────────────────────────────────┤
│                                          │
│  Dashboard content OR chat interface     │
│                                          │
└──────────────────────────────────────────┘
```

Configuration in `web/src/config/agent-dashboards.ts`:

```typescript
export const AGENT_DASHBOARDS: Record<string, { path: string; label: string }> = {
  "digital-kb": { path: "/agents/digital-kb", label: "Portfolio" },
  "ui-testing": { path: "/agents/ui-testing", label: "Test Status" },
};
```

When an agent has an entry here, the tab bar renders. Otherwise, chat-only (existing behavior).

## Folder Structure

```
web/src/app/agents/digital-kb/
├── page.tsx                        → Portfolio dashboard
├── [project]/
│   └── page.tsx                    → Project detail
├── components/
│   ├── portfolio-pulse.tsx         → Health summary bar
│   ├── project-grid.tsx            → Cards grouped by vertical
│   ├── project-card.tsx            → Individual project card
│   ├── attention-panel.tsx         → Needs attention (red/yellow alerts)
│   ├── strategy-block.tsx          → Strategic direction narrative
│   ├── milestone-timeline.tsx      → Upcoming milestones list
│   ├── investment-kpis.tsx         → KPI blocks
│   ├── project-detail-header.tsx   → Project name, health badge, orb
│   ├── milestones-tracker.tsx      → Full tracker with progress bars
│   ├── risks-panel.tsx             → Risk items with severity
│   ├── blockers-panel.tsx          → Active blockers
│   ├── tech-stack-tags.tsx         → Tag cloud
│   ├── modules-grid.tsx            → Reusable modules grid
│   ├── investment-table.tsx        → Year-by-year investment table
│   ├── timeline-section.tsx        → Recent timeline entries
│   └── people-block.tsx            → Team/stakeholder info
├── hooks/
│   └── use-portfolio.ts            → SWR hook for portfolio data
├── types/
│   └── portfolio.ts                → TypeScript interfaces
└── lib/
    └── api.ts                      → Fetch wrapper
```

## Shared Dashboard Primitives

Located in `web/src/components/dashboard/`:

```
web/src/components/dashboard/
├── health-dot.tsx              → Colored dot (green/yellow/red/gray)
├── dashboard-card.tsx          → Base card with border, shadow, radius
├── section-label.tsx           → Uppercase label with gradient line
├── kpi-block.tsx               → Centered value + label block
├── milestone-row.tsx           → Date + info + status pill
├── risk-item.tsx               → Severity-colored risk row
├── tracker-row.tsx             → Status pill + info + progress bar
├── tag.tsx                     → Small rounded tag
└── back-link.tsx               → ← Back navigation button
```

These are reusable across any agent's dashboard.

## Page: Portfolio Dashboard

Sections rendered top to bottom:

1. **PortfolioPulse** — compact bar: project count, green/yellow/red counts, health bar
2. **ProjectGrid** — for each vertical, a section label + grid of ProjectCards
3. **AttentionPanel + StrategyBlock** — side by side (2-column grid)
4. **MilestoneTimeline** — upcoming milestones across all projects
5. **InvestmentKpis** — 4 KPI blocks in a row

## Page: Project Detail

Sections rendered top to bottom:

1. **Back link** — ← Back to portfolio
2. **ProjectDetailHeader** — project orb, name, subtitle, health badge
3. **Business Case + Business Impact** — 2-column grid
4. **Dates + People** — 2-column grid
5. **InvestmentTable** — full year-by-year table
6. **MilestonesTracker** — all milestones with progress bars
7. **Risks + Blockers** — 2-column grid
8. **Tech Stack + Data Sources** — 2-column grid
9. **ModulesGrid** — 3-column grid of reusable modules
10. **TimelineSection** — recent timeline entries

## Data Fetching

```typescript
// web/src/app/agents/digital-kb/hooks/use-portfolio.ts
import useSWR from 'swr';
import { PortfolioResponse } from '@/app/agents/digital-kb/types/portfolio';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function usePortfolio() {
  const { data, error, isLoading } = useSWR<PortfolioResponse>(
    '/agent/v1/digital-kb/portfolio',
    fetcher,
    { revalidateOnFocus: true, refreshInterval: 300_000 }  // 5 min
  );
  return { portfolio: data, error, isLoading };
}

export function useProject(slug: string) {
  const { data, error, isLoading } = useSWR<ProjectDetail>(
    `/agent/v1/digital-kb/portfolio/${slug}`,
    fetcher,
    { revalidateOnFocus: true }
  );
  return { project: data, error, isLoading };
}
```

## Design Language

Design tokens:

- **Colors:** mulberry (#830051), magenta (#ce0058), graphite (#3f4444)
- **Health:** green (#10b981), yellow (#f59e0b), red (#ef4444)
- **Fonts:** serif for headings (Calisto MT / Georgia), sans for body (system)
- **Cards:** white bg, 1px gray border, 14px radius, subtle shadow
- **Section labels:** uppercase, 10.5px, mulberry, gradient line after
- **Interactions:** hover lift (-2px translateY), shadow upgrade

Reference: see `web/src/app/` for visual patterns.

## Responsive Behavior

- Portfolio grid: 3 columns → 1 column below 900px
- Detail 2-column grids: → 1 column below 900px
- KPI blocks: 4 columns → 2 columns below 900px → 1 column below 600px
- Modules grid: 3 columns → 1 column below 800px
