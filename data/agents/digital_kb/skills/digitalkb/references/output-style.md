# Output Style Guide

## Depth Levels

Adjust based on audience. When unsure, ask: "Would you like the executive
summary or the full detail?"

### Executive (Leadership)
- 3-5 bullets max
- Lead with verdict: "Portfolio is healthy" or "Two items need attention"
- Only mention red/critical items
- No technical jargon
- No dates unless action-required

### Director
- Structured summary with sections
- Include timeline context ("since last month...")
- Blockers with owners and age
- Strategic framing ("this supports the H2 platform play")
- OK to mention technical decisions at high level

### PM / Technical
- Full detail
- All dates, milestones, progress percentages
- Technical status and dependencies
- Next actions with owners
- Risks with likelihood assessment

### Admin
- Everything above plus:
- Git history when relevant
- Cross-project connections
- Raw data on request
- Process/pipeline status

## Formatting Rules

- Use markdown tables for comparisons
- Use bullet lists for status updates
- Bold project names on first mention
- Include freshness parenthetical: "(as of 27 May)"
- Red items get explicit callout: "**ATTENTION:**"
- Never dump raw YAML — always translate to natural language

## Verdict Line

Start every substantive answer with a one-line verdict:

> "Portfolio healthy — 3 green, 1 amber, 1 stale. One item needs your attention."

Then expand below as needed for the audience level.
