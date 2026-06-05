# Digital KB — Data Model

## Source Repository

**Repo:** `ops-digital-kb-source`

### Branch: `knowledge`

The clean, reviewed source of truth. Only updated via merged PRs.

```
projects/
├── rga/
│   ├── state.md              (REQUIRED — frontmatter + narrative)
│   ├── timeline.md           (REQUIRED — append-only log)
│   ├── people.md             (optional)
│   └── releases.md           (optional)
├── sop-assistant/
│   ├── state.md
│   └── timeline.md
├── mia/
│   ├── state.md
│   └── timeline.md
├── astrid/
│   ├── state.md
│   └── timeline.md
├── launchpad/
│   ├── state.md
│   └── timeline.md
└── operator-assist/
    ├── state.md
    └── timeline.md
verticals/
├── ai4workforce.md
├── manufacturing-intelligence.md
├── mct.md
└── sustainability.md
org/
├── people.md
└── strategy.md
meta/
└── sources.md
```

### Branch: `ingestor`

Working branch for automated data processing.

```
config/
├── sources.yaml              (SharePoint paths per project, sync schedule)
└── extraction-rules.yaml     (how to convert raw → extracted per file type)
raw/
├── rga/
│   ├── sprint-review-2026-05-27.pptx
│   ├── status-email-2026-05-20.eml
│   └── ...
├── sop/
│   └── ...
├── mia/
│   └── ...
└── ...
extracted/
├── rga/
│   ├── sprint-review-2026-05-27.md
│   ├── status-email-2026-05-20.md
│   └── ...
├── sop/
│   └── ...
└── ...
analysis/
├── data-inventory.md         (catalog of all sources, what's been processed)
├── indexes/                  (intermediate analysis artifacts)
│   ├── rga-index.md
│   └── ...
└── tmp/                      (working space for multi-step analysis)
code/
├── sync/                     (GitHub Action scripts for SharePoint → raw/)
├── extraction/               (raw → extracted conversion scripts)
└── ingestion/                (Claude Code SDK agent configuration and code)
```

## Frontmatter Schema

Every `projects/{slug}/state.md` file MUST have this YAML frontmatter:

```yaml
---
# REQUIRED fields (dashboard will break without these)
name: string                    # Display name
slug: string                    # URL-safe identifier, matches folder name
health: green | yellow | red    # Current health status
phase: discovery | development | production | sunset
owner: string                   # Project owner name
last_updated: YYYY-MM-DD       # Date of last meaningful update

# REQUIRED for portfolio view
vertical: string                # Slug of the vertical (ai4workforce, mct, etc.)
summary: string                 # 1-2 sentence status for portfolio card

# OPTIONAL — used in portfolio cards
pm: string
tech_lead: string
accent: string                  # Highlight text (e.g. "$3-4M benefit")

# OPTIONAL — next milestone (shown on portfolio + detail)
next_milestone:
  what: string
  date: YYYY-MM-DD | string     # Can be "Q3 2026" for rough dates
  confidence: high | medium | low

# OPTIONAL — blockers (shown in attention panel + detail)
blockers:
  - description: string
    owner: string
    age_days: integer

# OPTIONAL — risks (detail page only)
risks:
  - level: high | medium | low
    description: string

# OPTIONAL — milestones tracker (detail page)
milestones:
  - what: string
    date: string | null
    status: done | active | upcoming | proposed | design
    progress: 0-100
    description: string | null

# OPTIONAL — KPIs (portfolio + detail)
kpis:
  - label: string
    value: string

# OPTIONAL — investment table (detail page)
investment:
  - year: integer
    investment: string
    recurring: string | null
    cumul_cost: string
    cumul_benefit: string
    net: string

# OPTIONAL — tech stack (detail page)
tech_stack:
  - string

# OPTIONAL — data sources (detail page)
data_sources:
  - string

# OPTIONAL — reusable modules (detail page)
modules:
  - name: string
    description: string

# OPTIONAL — people (detail page)
people:
  owner: string
  pm: string
  global_po: string
  product_owner: string
  tech_lead: string
  it_pm: string
  ba: [string]

# OPTIONAL — dates (detail page)
dates:
  programme_start: string
  current_release: string
  go_live: string
  horizon: string

# OPTIONAL — business impact (detail page)
business_impact:
  - string

# OPTIONAL — attention items (manually flagged for attention panel)
attention:
  - level: red | yellow
    title: string
    description: string
---
```

## Markdown Body (below frontmatter)

The body below the `---` is free-form markdown. The digitalKB agent reads it fully for context. The dashboard API parses TWO sections from the body for the project detail endpoint:

- `## What It Is` → extracted as `what_it_is` field
- `## Current Status` → extracted as `current_status` field

All other body sections are agent-only (not served via API). Recommended structure:

```markdown
## What It Is
[2-3 paragraphs: what the project does, for whom, why it matters]

## Current Status
[Detailed narrative of what's happening now]

## Detailed Analysis
[Deep context: architecture decisions, historical reasoning, trade-offs]

## Investment & Benefit Detail
[Tables, projections, assumptions]

## Strategic Context
[How this fits the org strategy, connections to other projects]
```

## timeline.md Format

```markdown
# {Project Name} — Timeline

## YYYY-MM-DD
- What happened. One bullet per event.
- Keep entries factual and concise.

## YYYY-MM-DD
- Older entries below newer ones — reverse chronological.
```

Rules:
- Append-only. Never edit past entries.
- Most recent date at the top.
- Parsed by backend to populate timeline field in project detail.

## verticals/{slug}.md Format

```yaml
---
name: AI for Workforce
slug: ai4workforce
pm: Jane Smith
projects:
  - rga
  - sop-assistant
  - operator-assist
---

## Scope
What this vertical covers. 2-3 sentences.

## Cross-Vertical Connections
How this vertical's work relates to others.
```

## Field Enums

### health
| Value | Meaning |
|-------|---------|
| green | On track, no blockers |
| yellow | At risk — blocker exists but has a path |
| red | Off track — blocked with no clear path |

### phase
| Value | Meaning |
|-------|---------|
| discovery | Scoping, requirements, feasibility |
| development | Actively being built |
| production | Live and serving users |
| sunset | Being decommissioned |

### confidence
| Value | Meaning |
|-------|---------|
| high | No known risks to hitting date |
| medium | Risks exist but are being managed |
| low | Date likely to slip |

### milestone status
| Value | Meaning |
|-------|---------|
| done | Completed |
| active | Currently in progress |
| upcoming | Scheduled, not started |
| proposed | Planned but not committed |
| design | In design phase |
| on-track | On schedule (used for upcoming milestones in timeline view) |
| at-risk | At risk of slipping |

### risk level
| Value | Meaning |
|-------|---------|
| high | Likely to impact delivery |
| medium | Possible impact, being monitored |
| low | Unlikely but worth tracking |

## Freshness Rules

Freshness is derived from `last_updated` field:

| Days Since Update | Status | Action |
|-------------------|--------|--------|
| 0-7 | fresh | None |
| 8-14 | ok | Visible on dashboard |
| 15-30 | stale | Flagged in attention panel |
| 30+ | critical | Prominent alert, red status |

Only meaningful content changes to state.md should update `last_updated`.
