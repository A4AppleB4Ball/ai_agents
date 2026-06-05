# Frontmatter Schema

Every `projects/{slug}/state.md` file MUST have this YAML frontmatter.
Your output must conform exactly to this schema.

## Required Fields

These fields MUST always be present. If you cannot determine a value,
flag it in the PR — do NOT omit the field or leave it blank.

```yaml
---
name: string                    # Display name (e.g., "RGA")
slug: string                    # URL-safe identifier, must match folder name
health: green | yellow | red    # Current health status
phase: discovery | development | production | sunset
owner: string                   # Project owner name
last_updated: "YYYY-MM-DD"     # Date of last meaningful update (today if you're updating)
vertical: string                # Slug of the vertical (ai4workforce, manufacturing-intelligence, mct, sustainability)
summary: string                 # 1-2 sentence current status for portfolio card
---
```

## Optional Fields

Include these when data is available from source documents.

```yaml
# Portfolio display
pm: string
tech_lead: string
accent: string                  # Highlight text (e.g., "$3-4M benefit")

# Next milestone (shown on portfolio + detail)
next_milestone:
  what: string
  date: "YYYY-MM-DD" | string   # Can be "Q3 2026" for rough dates
  confidence: high | medium | low

# Blockers (shown in attention panel + detail)
blockers:
  - description: string
    owner: string
    age_days: integer           # Days since blocker was identified

# Risks (detail page only)
risks:
  - level: high | medium | low
    description: string

# Milestones tracker (detail page)
milestones:
  - what: string
    date: string | null         # null if date not known
    status: done | active | upcoming | proposed | design
    progress: 0-100             # Integer percentage
    description: string | null  # Optional detail

# KPIs (portfolio + detail)
kpis:
  - label: string
    value: string

# Investment table (detail page)
investment:
  - year: integer
    investment: string
    recurring: string | null
    cumul_cost: string
    cumul_benefit: string
    net: string

# Tech stack (detail page)
tech_stack:
  - string

# Data sources (detail page)
data_sources:
  - string

# Reusable modules (detail page)
modules:
  - name: string
    description: string

# People (detail page)
people:
  owner: string
  pm: string
  global_po: string
  product_owner: string
  tech_lead: string
  it_pm: string
  ba:
    - string

# Dates (detail page)
dates:
  programme_start: string
  current_release: string
  go_live: string
  horizon: string

# Business impact (detail page)
business_impact:
  - string

# Manual attention items (for attention panel)
attention:
  - level: red | yellow
    title: string
    description: string
```

## Enum Values

### health
| Value | When to use |
|-------|-------------|
| green | On track, no blockers, milestones on schedule |
| yellow | At risk — blocker exists but has a known path to resolution |
| red | Off track — blocked with no clear path, or stale with no communication |

### phase
| Value | When to use |
|-------|-------------|
| discovery | Requirements gathering, feasibility, stakeholder interviews |
| development | Actively being built, sprints running |
| production | Live, serving real users |
| sunset | Being decommissioned or deprecated |

### milestone status
| Value | When to use |
|-------|-------------|
| done | Completed and shipped |
| active | Currently in progress |
| upcoming | Scheduled, not started yet |
| proposed | Planned but not committed |
| design | In design/architecture phase |

### confidence
| Value | When to use |
|-------|-------------|
| high | No known risks to hitting the date |
| medium | Risks exist but are being managed |
| low | Date likely to slip |

## Body Structure

Below the frontmatter `---`, include these markdown sections:

```markdown
## What It Is
[2-3 paragraphs: what the project does, for whom, why it matters]

## Current Status
[Detailed narrative of what's happening now — use info from extracted docs]

## Detailed Analysis
[Deep context: architecture decisions, historical reasoning, trade-offs]

## Strategic Context
[How this fits the org strategy, connections to other projects]
```

## Validation Rules

1. `slug` MUST match the folder name exactly
2. `last_updated` MUST be a valid date in YYYY-MM-DD format
3. `health` MUST be one of: green, yellow, red
4. `phase` MUST be one of: discovery, development, production, sunset
5. `blockers[].age_days` MUST be a positive integer
6. `milestones[].progress` MUST be 0-100
7. `investment[].year` MUST be a 4-digit integer
8. No field should be empty string — use null or omit the field
