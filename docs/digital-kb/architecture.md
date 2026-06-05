# Digital KB — Architecture

## Overview

Digital KB is a git-backed knowledge base for project status across all Digital verticals. It provides a web dashboard for leadership and a chat interface for interactive queries. Data lives in a dedicated GitHub repo (`ops-digital-kb-source`) as structured markdown with YAML frontmatter.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER LAYER                                       │
│                                                                           │
│  Leadership ──── PMs ──── Admins                                        │
│  (dashboard)    (dashboard+chat) (dashboard+chat+ingest)                 │
└───────────────────────────┬───────────────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────────────┐
│                     THIS APPLICATION (ai_agents)                           │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ Frontend (Next.js)                                                   │ │
│  │                                                                      │ │
│  │  Agent Tabs: [ Dashboard | Chat ]                                    │ │
│  │                                                                      │ │
│  │  /agents/digital-kb          → Portfolio dashboard                   │ │
│  │  /agents/digital-kb/[project] → Project detail page                  │ │
│  │  Chat interface              → digitalKB skill via WebSocket         │ │
│  └──────────────────────────────────┬──────────────────────────────────┘ │
│                                     │                                     │
│  ┌──────────────────────────────────▼──────────────────────────────────┐ │
│  │ Backend (FastAPI)                                                    │ │
│  │                                                                      │ │
│  │  GET /agent/v1/digital-kb/portfolio                                  │ │
│  │  GET /agent/v1/digital-kb/portfolio/{project_slug}                   │ │
│  │                                                                      │ │
│  │  git_reader.py → pulls knowledge branch                             │ │
│  │  frontmatter_parser.py → extracts YAML from state.md files          │ │
│  │  portfolio_builder.py → assembles response                          │ │
│  └──────────────────────────────────┬──────────────────────────────────┘ │
│                                     │                                     │
└─────────────────────────────────────┼─────────────────────────────────────┘
                                      │ git pull
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     GITHUB REPO: ops-digital-kb-source                       │
│                                                                              │
│  ┌─────────────────────────────┐   ┌─────────────────────────────────────┐ │
│  │ Branch: knowledge            │   │ Branch: ingestor                     │ │
│  │                              │   │                                      │ │
│  │ projects/rga/state.md        │   │ config/sources.yaml                  │ │
│  │ projects/sop/state.md        │   │ raw/{project}/*.pptx, .eml, .xlsx    │ │
│  │ projects/mia/state.md        │   │ extracted/{project}/*.md             │ │
│  │ verticals/*.md               │   │ analysis/data-inventory.md           │ │
│  │ org/people.md                │ ← │ analysis/indexes/                    │ │
│  │ meta/sources.md              │ PR│ code/sync/                           │ │
│  │                              │   │ code/extraction/                     │ │
│  │                              │   │ code/ingestion/                      │ │
│  └─────────────────────────────┘   └─────────────────────────────────────┘ │
│                                                                              │
│  PR flow: ingestor branch → feature branch → PR → manual review → merge     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                      ▲
                                      │ GitHub Action (scheduled sync)
                                      │
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SharePoint Folders                                   │
│  (sprint reviews, status emails, presentations per project)                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Read Path (Dashboard)

1. Backend maintains a local clone of `ops-digital-kb-source` (branch: `knowledge`)
2. On startup and periodically (every 5 min), backend runs `git pull`
3. On API request, backend reads `projects/*/state.md`, extracts YAML frontmatter
4. Assembles portfolio response (pulse, projects, attention items, milestones)
5. Frontend fetches and renders

### Write Path (Ingestion)

1. GitHub Action syncs SharePoint folders → `raw/` on `ingestor` branch (scheduled)
2. Extraction script converts `raw/` → `extracted/` (same structure, all .md)
3. Claude Code SDK agent (ingestor skill) reads `extracted/`, analyzes content
4. Agent creates/updates `projects/{slug}/state.md` with valid frontmatter + narrative
5. Agent creates feature branch: `<userid>/<date>/<topic>`
6. Agent opens PR from feature branch → `knowledge` branch
7. Manual review and approval
8. Merge updates `knowledge` branch
9. Next `git pull` from backend picks up changes

### Chat Path (digitalKB skill)

1. User asks question via chat interface
2. digitalKB skill does `git pull` on local clone
3. Reads full markdown files (frontmatter + body) for rich context
4. Can run `git log`, `git diff` for history-based questions
5. Returns audience-appropriate answer

## Key Design Decisions

1. **Frontmatter is the dashboard contract** — YAML frontmatter in state.md contains all fields the dashboard needs. Body is for agent depth only.
2. **One repo, two branches** — `knowledge` (clean, reviewed output) and `ingestor` (raw data, extraction code, analysis artifacts).
3. **PR-based updates** — All changes to `knowledge` go through PRs for manual review. No direct pushes.
4. **Local clone, not API** — Backend reads from a local git clone for speed. No GitHub API rate limits.
5. **Per-agent folder structure** — Each agent (digital-kb, ui-testing, cloud-pilot) owns its own folder in both frontend and backend. No shared framework — just shared UI primitives.
6. **Horizontal tabs** — Agents with dashboards show a tab bar (Dashboard | Chat) in the main content area.
