# Digital KB — Skills Design

## Overview

Two skills operate on the `ops-digital-kb-source` repo:

1. **digitalKB** — Read-only. Answers questions, generates reports, powers the chat interface.
2. **ingestor** — Write. Analyzes raw data, produces structured knowledge, creates PRs.

## Skill: digitalKB

### Purpose
Answers questions about project status across Digital. Reads the `knowledge` branch for full context (frontmatter + narrative body + git history).

### Access
- Local clone of `ops-digital-kb-source` (branch: `knowledge`)
- Full read access to all markdown files
- `git log`, `git diff`, `git blame` for history questions

### Behavior

**On invocation:**
1. `git pull` to ensure latest merged data
2. Read relevant files based on question scope
3. Answer at appropriate altitude for the user

**Audience-aware responses:**

| User Type | Response Style |
|-----------|----------------|
| Leadership | 3-5 bullets. Health summary. Blockers only if red. No jargon. |
| Director | Detailed status with timeline context. Blockers with owners and ages. |
| PM | Full detail including technical status, dependencies, next actions. |
| Admin | Everything. Including git history, cross-project connections. |

**Example interactions:**
- "How are we doing overall?" → reads all state.md frontmatter, computes pulse, highlights attention items
- "What's blocking RGA?" → reads rga/state.md blockers section + body for context
- "What shipped last month?" → reads all timeline.md, filters to date range
- "Compare RGA and SOP progress" → reads both state.md files, synthesizes comparison
- "What changed since last week?" → `git log --since='1 week ago'` on projects/

### Configuration

```yaml
skill_name: digitalKB
description: Knowledge base for all Digital project status
workspace: /data/digital-kb-source  # local clone path
branch: knowledge
tools:
  - read_file
  - list_directory
  - git_log
  - git_diff
system_prompt: |
  You are the Digital KB assistant. You answer questions about project status
  across all Digital verticals by reading structured markdown files.

  Rules:
  - Only state facts from the files. Never hallucinate.
  - If data is missing, say so: "No information available. Last update was X days ago."
  - Adapt response depth to the user's role.
  - Include the data's freshness: "As of {last_updated}..."
  - Flag stale data proactively: "Note: MIA hasn't been updated in 22 days."
```

## Skill: ingestor

### Purpose
Automated agent that reads extracted source data, analyzes it, and produces/updates structured knowledge files with valid YAML frontmatter. Creates PRs for human review.

### Access
- `ops-digital-kb-source` repo (full write access to feature branches)
- Reads from `extracted/` folder on `ingestor` branch
- Writes to `projects/` folder structure
- Can create branches and open PRs via `gh` CLI

### Pipeline

```
1. Switch to ingestor branch, pull latest
2. Read config/sources.yaml for project mappings
3. For each project with new data in extracted/:
   a. Read all extracted/*.md files for that project
   b. Read existing projects/{slug}/state.md (if exists) from knowledge branch
   c. Analyze: what's new, what changed, what needs updating
   d. Use /tmp/ingestion/ for intermediate analysis if needed
   e. Produce updated state.md with valid frontmatter + narrative
   f. Append new entries to timeline.md
4. Create feature branch: <userid>/<YYYY-MM-DD>/<topic>
5. Commit all changes
6. Open PR from feature branch → knowledge branch
7. PR includes summary of what changed and why
```

### Trigger
- **Scheduled:** GitHub Action triggers weekly (configurable in config/sources.yaml)
- **On-demand:** Admin can trigger manually via chat or CLI

### Frontmatter Validation
The ingestor MUST produce valid frontmatter that passes the same Pydantic model validation the backend uses. If it can't determine a required field (health, phase, etc.), it must flag it in the PR description for human review — never guess.

### PR Format

```markdown
## Ingestor Update — {date}

### Projects Updated
- **RGA** — updated current status, added 2 timeline entries, resolved 1 blocker
- **SOP** — new project onboarded, initial state.md created

### Data Sources Processed
- rga/sprint-review-2026-05-27.md (extracted from sprint-review-2026-05-27.pptx)
- sop/status-email-2026-05-20.md

### Needs Human Review
- MIA: couldn't determine health status from available data. Defaulted to yellow.
- SOP: tech_lead field empty — not mentioned in source material.

### Changes
{standard git diff summary}
```

### Configuration

```yaml
skill_name: ingestor
description: Automated knowledge ingestion agent
workspace: /data/digital-kb-source
tools:
  - read_file
  - write_file
  - list_directory
  - git_operations  # checkout, commit, push, branch
  - gh_cli          # create PR
system_prompt: |
  You are the Digital KB ingestor. Your job is to read extracted source
  documents and produce structured project state files.

  Rules:
  - Always produce valid YAML frontmatter matching the schema.
  - Never guess required fields — flag them for human review.
  - Preserve existing data that isn't contradicted by new sources.
  - timeline.md is append-only — never modify past entries.
  - Include source attribution: where did each fact come from.
  - When uncertain, err on the side of flagging for review.
```

## Repo Setup: config/sources.yaml

```yaml
projects:
  example-project:
    sharepoint_path: "/sites/YourOrg/YourTeam/ProjectA"
    sync_schedule: "weekly"
    file_types: ["pptx", "docx", "xlsx", "eml", "pdf"]
    extraction_priority: ["sprint-review", "status-email", "steering-deck"]

  another-project:
    sharepoint_path: "/sites/YourOrg/YourTeam/ProjectB"
    sync_schedule: "weekly"
    file_types: ["pptx", "docx", "eml"]

global:
  sync_day: "monday"
  sync_time: "06:00"
  timezone: "UTC"
  pr_reviewers: ["your-github-username"]
```
