# Data Schema Reference

## File Structure

The knowledge branch contains structured markdown with YAML frontmatter.

### projects/{slug}/state.md

Every project has a `state.md` with YAML frontmatter between `---` delimiters,
followed by a markdown body.

**Required frontmatter fields:**
- `name` — Display name
- `slug` — URL-safe identifier, matches folder name
- `health` — green | yellow | red
- `phase` — discovery | development | production | sunset
- `owner` — Project owner name
- `last_updated` — YYYY-MM-DD of last meaningful update
- `vertical` — Slug of the vertical
- `summary` — 1-2 sentence status

**Optional frontmatter fields:**
- `pm`, `tech_lead`, `accent`
- `next_milestone` — { what, date, confidence: high|medium|low }
- `blockers` — [{ description, owner, age_days }]
- `risks` — [{ level: high|medium|low, description }]
- `milestones` — [{ what, date, status: done|active|upcoming|proposed|design, progress: 0-100, description }]
- `kpis` — [{ label, value }]
- `investment` — [{ year, investment, recurring, cumul_cost, cumul_benefit, net }]
- `tech_stack` — [string]
- `data_sources` — [string]
- `modules` — [{ name, description }]
- `people` — { owner, pm, global_po, product_owner, tech_lead, it_pm, ba: [string] }
- `dates` — { programme_start, current_release, go_live, horizon }
- `business_impact` — [string]
- `attention` — [{ level: red|yellow, title, description }]

**Body sections (below frontmatter):**
- `## What It Is` — 2-3 paragraphs about the project
- `## Current Status` — Narrative of what's happening now
- `## Detailed Analysis` — Deep context (architecture, trade-offs)
- `## Strategic Context` — How it fits the org strategy

### projects/{slug}/timeline.md

Append-only chronological log. Most recent at top.

```markdown
## YYYY-MM-DD
- Event bullet 1
- Event bullet 2

## YYYY-MM-DD
- Older events below
```

### verticals/{slug}.md

Frontmatter: name, slug, pm, projects (list of project slugs).
Body: scope description and cross-vertical connections.

### org/strategy.md

Frontmatter: summary, detail, h2_bets.
Body: strategic direction, H2 priorities, architecture pattern.

### org/people.md

Key stakeholders organized by role: Leadership, Portfolio Management,
Technical Leadership, Product, Business Analysts.

### meta/sources.md

Documents where data comes from (SharePoint folders, email, presentations)
and the processing pipeline.

## Health Values

| Value | Meaning |
|-------|---------|
| green | On track, no blockers |
| yellow | At risk — blocker exists but has a path |
| red | Off track — blocked with no clear path |

## Phase Values

| Value | Meaning |
|-------|---------|
| discovery | Scoping, requirements, feasibility |
| development | Actively being built |
| production | Live and serving users |
| sunset | Being decommissioned |

## Verticals

| Slug | Name | PM |
|------|------|-----|
| ai4workforce | AI for Workforce | Jane Smith |
| manufacturing-intelligence | Factory Intelligence | Harish Kumar |
| mct | Manufacturing Control Tower | Bob Wilson |
| sustainability | Sustainability | TBD |
