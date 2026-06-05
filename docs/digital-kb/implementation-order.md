# Digital KB — Implementation Order

## Phase 1: Backend Foundation

### 1.1 Backend scaffold
- Create `agent/service/agents/digital_kb/` folder structure
- Add config.py with environment variable loading
- Add models.py with all Pydantic models
- Register router in main FastAPI app

### 1.2 Git reader
- Implement clone/pull with asyncio subprocess
- Local path management (ensure directory exists)
- HEAD sha tracking (detect changes)

### 1.3 Frontmatter parser
- YAML frontmatter extraction (split on `---`)
- Parse into Pydantic models
- Validate required fields, throw on missing
- Handle optional fields gracefully

### 1.4 Timeline parser
- Parse `## YYYY-MM-DD` headings
- Extract bullet points per date
- Return sorted list

### 1.5 Portfolio builder
- Assemble PortfolioResponse from parsed projects
- Compute pulse (count health statuses)
- Compute attention items (from blockers + staleness)
- Compute upcoming milestones (aggregate and sort)
- Compute freshness per project

### 1.6 API endpoints
- GET /agent/v1/digital-kb/portfolio
- GET /agent/v1/digital-kb/portfolio/{project_slug}
- In-memory caching
- Background periodic pull task

## Phase 2: Source Repository

### 2.1 Create ops-digital-kb-source repo
- Initialize with `knowledge` branch
- Create folder structure: projects/, verticals/, org/, meta/
- Seed with initial data from existing AOS knowledge

### 2.2 Create sample project state files
- rga/state.md with full frontmatter (based on example HTML data)
- sop-assistant/state.md
- mia/state.md
- astrid/state.md
- launchpad/state.md
- All with valid frontmatter + narrative body

### 2.3 Create vertical and org files
- verticals/ai4workforce.md
- verticals/manufacturing-intelligence.md
- verticals/mct.md
- verticals/sustainability.md
- org/people.md

## Phase 3: Frontend — Dashboard

### 3.1 Shared dashboard primitives
- health-dot.tsx
- dashboard-card.tsx
- section-label.tsx
- kpi-block.tsx
- milestone-row.tsx
- risk-item.tsx
- tracker-row.tsx
- tag.tsx
- back-link.tsx

### 3.2 Agent tab system
- agent-dashboards.ts config
- AgentTabs component (renders tab bar when agent has dashboard)
- Integration with existing page.tsx / routing

### 3.3 Portfolio page
- page.tsx with data fetching (SWR)
- PortfolioPulse component
- ProjectGrid + ProjectCard components
- AttentionPanel component
- StrategyBlock component
- MilestoneTimeline component
- InvestmentKpis component
- Loading / error states

### 3.4 Project detail page
- [project]/page.tsx with data fetching
- ProjectDetailHeader component
- Business case + impact blocks
- Dates + People blocks
- InvestmentTable component
- MilestonesTracker component (full with progress bars)
- RisksPanel + BlockersPanel components
- TechStackTags + ModulesGrid components
- TimelineSection component
- Back navigation

### 3.5 Types and hooks
- portfolio.ts TypeScript interfaces
- use-portfolio.ts SWR hook
- api.ts fetch wrapper

## Phase 4: Ingestor Branch Setup

### 4.1 Ingestor branch structure
- Create `ingestor` branch from `knowledge`
- Add config/sources.yaml
- Add config/extraction-rules.yaml
- Create raw/, extracted/, analysis/ folders
- Add code/sync/, code/extraction/, code/ingestion/ scaffolds

### 4.2 Extraction scripts
- PDF → markdown converter
- PPTX → markdown converter
- DOCX → markdown converter
- Email (.eml) → markdown converter

### 4.3 GitHub Action for SharePoint sync
- Scheduled action (weekly)
- Syncs configured SharePoint paths → raw/ folders
- Commits to ingestor branch

## Phase 5: Ingestor Agent

### 5.1 Claude Code SDK integration
- Ingestor skill definition
- System prompt with schema rules
- Tool access: file read/write, git, gh CLI

### 5.2 Ingestion pipeline
- Read extracted/ for each project
- Compare with existing knowledge
- Produce updated state.md with valid frontmatter
- Append to timeline.md
- Create feature branch
- Open PR with structured summary

### 5.3 Validation
- Frontmatter schema validation (same Pydantic models)
- Flag uncertain fields in PR description
- Dry-run mode for testing

## Phase 6: digitalKB Chat Skill

### 6.1 Skill definition
- System prompt with audience-awareness rules
- Tool access: file read, git log, git diff

### 6.2 Integration
- Register as available skill for Digital KB agent
- Connect to existing chat/WebSocket infrastructure

---

## Build Order for Agents

When instructing agents to build, use this order:

1. **Phase 1** (backend) — can be built independently, needs only a mock repo or test fixtures
2. **Phase 2** (source repo) — can be built in parallel with Phase 1
3. **Phase 3** (frontend) — depends on Phase 1 API being available
4. **Phase 4** (ingestor setup) — independent of Phases 1-3
5. **Phase 5** (ingestor agent) — depends on Phase 4
6. **Phase 6** (chat skill) — depends on Phase 2 (repo with data)

Phases 1+2 can run in parallel. Phase 3 follows. Phases 4+5+6 can follow after.
