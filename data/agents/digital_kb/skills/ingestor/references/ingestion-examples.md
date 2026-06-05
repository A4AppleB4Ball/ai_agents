# Ingestion Examples

## Example: Extracting facts from a sprint review

**Source:** `extracted/rga/sprint-review-2026-05-27.md`

```markdown
## Slide 3

Sprint 8 Summary
- Template Wizard: DONE — shipped to UAT
- User Groups: DONE — 3 permission tiers working
- OCR Handwriting: Dev complete, validation in progress (75%)
- QAA Clause Bank: Design ongoing, demo scheduled 12 Jun

## Slide 7

Risks & Issues
- ECS scaling: still no answer from infra team (12 days)
- No automated testing framework (30 days, Dev Lead owning)
```

**What to extract:**
- Milestone updates: Template Wizard done, User Groups done, OCR at 75%, QAA at 50%
- Blockers: ECS scaling (12 days, Admin), testing framework (30 days, Dev Lead)
- Timeline entry: "Template wizard shipped to UAT", "User groups feature complete"

**Updated frontmatter (partial):**
```yaml
last_updated: "2026-05-27"
summary: "R6 on track for 30 Jun. Template wizard and user groups shipped to UAT."
milestones:
  - what: "V6 — Template Wizard"
    status: done
    progress: 100
  - what: "V6 — OCR Handwriting Extraction"
    status: active
    progress: 75
    description: "Dev complete, validating with templates"
blockers:
  - description: "ECS capacity for 100-1000 concurrent users undefined"
    owner: Admin
    age_days: 12
```

## Example: Handling a status email

**Source:** `extracted/sop/status-email-2026-05-20.md`

```markdown
## Metadata
- From: Jane Smith
- Subject: SOP Assistant — Weekly Update
- Date: 2026-05-20

## Body
Hi team,

Quick update on SOP Assistant:
- Pilot expanded to Frederick (3rd site) this week
- Weekly queries now at ~120, up from 80 last week
- Main concern: SOP document quality varies wildly between sites
- Some scanned PDFs have no extractable text — need OCR or manual cleanup
- Feedback form deployed, expecting first results next week

Next steps:
- Review feedback in 2 weeks (target: 20 Jun)
- Discuss go/no-go for production at Q3 planning
```

**What to extract:**
- Progress: pilot at 3 sites, 120 queries/week
- Blocker: SOP document quality (owner: Jane Smith, since site quality was flagged)
- Timeline: "Pilot expanded to Frederick", "Weekly queries at 120"
- Next milestone update: feedback review → 2026-06-20

## Example: New project with incomplete data

**Source:** `extracted/operator-assist/discovery-notes-2026-05-01.md`

```markdown
## Page 1

Operator Assist — Discovery Phase Kickoff

Objective: AI co-pilot for manufacturing floor operators
Sponsor: Director
PM: Project Manager (discovery phase)
Technical owner: TBD

Timeline:
- Discovery: May–Jun 2026
- Requirements: Jul 2026
- Build: H2 2026 (tentative)
```

**What to produce:**
```yaml
name: Operator Assist
slug: operator-assist
health: yellow           # yellow because no tech owner assigned
phase: discovery
owner: TBD              # FLAG FOR REVIEW — no owner assigned
last_updated: "2026-05-01"
vertical: ai4workforce
summary: "Pipeline. AI co-pilot for manufacturing operators. Build planned H2 2026."
pm: Jane Smith
```

**PR "Needs Human Review" section:**
```
- operator-assist: owner field set to "TBD" — no technical owner mentioned in source material
- operator-assist: health set to yellow — no owner is a risk, but not necessarily red
- operator-assist: tech lead not assigned. Build timeline tentative until technical leadership confirmed.
```

## Example: Conflicting information

If two sources disagree:

**Sprint review says:** "Go-live: 30 Jun 2026"
**Status email says:** "Go-live pushed to 15 Jul due to UAT delays"

**Action:**
- Use the MOST RECENT source (check dates)
- Update the field to match the latest info
- Note the conflict in the PR description:
  "go_live date updated from 2026-06-30 to 2026-07-15 based on status email (2026-05-28). Sprint review (2026-05-27) had earlier date."
