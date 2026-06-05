# PR Template

Use this exact format when creating PRs from the ingestor.

## Branch Naming

```
ingestor/YYYY-MM-DD/{topic}
```

Examples:
- `ingestor/2026-05-27/weekly-update`
- `ingestor/2026-06-01/rga-sprint-review`
- `ingestor/2026-06-01/multi-project-update`

## PR Title

```
ingest: {brief description}
```

Examples:
- `ingest: update RGA from sprint review 2026-05-27`
- `ingest: weekly update — RGA, SOP, Astrid`
- `ingest: onboard new project operator-assist`

## PR Body

```markdown
## Ingestor Update — YYYY-MM-DD

### Projects Updated
- **{Project Name}** — {1-line summary of what changed}
- **{Project Name}** — {1-line summary}

### Data Sources Processed
- {project}/{filename}.md (extracted from {original_filename})
- {project}/{filename}.md (extracted from {original_filename})

### Needs Human Review
- {Project}: {field} — {reason you couldn't determine this}
- {Project}: {field} — {conflicting sources, used latest}

### Changes Summary
| Project | Fields Updated | Timeline Entries | Health Change |
|---------|---------------|-----------------|---------------|
| RGA | summary, milestones, blockers | 3 | unchanged |
| SOP | summary, kpis | 1 | unchanged |

### Confidence Notes
- High confidence: {list fields with strong evidence}
- Medium confidence: {list fields inferred from context}
- Flagged: {list fields that need human verification}
```

## Labels

Add these labels to the PR when applicable:
- `ingestor` — always
- `needs-review` — when "Needs Human Review" section is non-empty
- `health-change` — when any project's health field changed
- `new-project` — when a project is being onboarded for the first time
