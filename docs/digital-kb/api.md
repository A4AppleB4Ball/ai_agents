# Digital KB — API Design

## Endpoints

### GET /agent/v1/digital-kb/portfolio

Returns the full portfolio view: pulse summary, all projects with their frontmatter data, verticals grouping, and computed attention items.

**Response:**

```json
{
  "last_synced": "2026-05-27T14:30:00Z",
  "commit_sha": "abc1234",
  "pulse": {
    "total_projects": 5,
    "green": 3,
    "yellow": 1,
    "red": 1,
    "stale": 1
  },
  "verticals": [
    {
      "slug": "ai4workforce",
      "name": "AI for Workforce",
      "projects": ["rga", "sop-assistant", "operator-assist"]
    },
    {
      "slug": "manufacturing-intelligence",
      "name": "Factory Intelligence",
      "projects": ["mia"]
    },
    {
      "slug": "mct",
      "name": "Manufacturing Control Tower",
      "projects": ["astrid"]
    },
    {
      "slug": "sustainability",
      "name": "Sustainability",
      "projects": []
    }
  ],
  "projects": [
    {
      "name": "RGA",
      "slug": "rga",
      "health": "green",
      "phase": "production",
      "owner": "John Doe",
      "pm": "Jane Smith",
      "tech_lead": "Dev Lead",
      "vertical": "ai4workforce",
      "last_updated": "2026-05-27",
      "summary": "R6 on track for 30 Jun. 6 sites live, expanding to 15+.",
      "accent": "$3-4M target benefit at scale",
      "next_milestone": {
        "what": "Full UAT",
        "date": "2026-06-15",
        "confidence": "high"
      },
      "blockers": [
        {
          "description": "ECS capacity for 100-1000 concurrent users undefined",
          "owner": "Admin",
          "age_days": 12
        }
      ],
      "risks": [
        {
          "level": "high",
          "description": "OCR accuracy on real handwritten docs"
        }
      ],
      "milestones": [
        {
          "what": "SIT begins",
          "date": "2026-06-08",
          "status": "on-track"
        }
      ],
      "kpis": [
        {
          "label": "2026 Investment",
          "value": "$10M"
        }
      ],
      "tech_stack": ["Python 3.12", "FastAPI", "React.js", "Claude (Bedrock)"]
    }
  ],
  "strategy": {
    "summary": "Portfolio is evolving from point solutions to autonomous agents.",
    "detail": "Key pattern: Claude Agent SDK + shared UI + domain-specific skills. Build once, apply across verticals.",
    "h2_bets": "RGA Agentic V1 + Operator Assist + cross-vertical platform play."
  },
  "attention": [
    {
      "level": "red",
      "title": "MIA has gone dark",
      "description": "No status update from Harish. Cannot assess delivery risk.",
      "project_slug": "mia"
    },
    {
      "level": "yellow",
      "title": "RGA scaling path needed",
      "description": "$3-4M case assumes 10-20x growth. Assessment in progress.",
      "project_slug": "rga"
    }
  ],
  "upcoming_milestones": [
    {
      "date": "2026-06-08",
      "project_name": "RGA",
      "project_slug": "rga",
      "what": "SIT begins",
      "description": "System Integration Testing for all V6 features",
      "status": "on-track"
    }
  ]
}
```

### GET /agent/v1/digital-kb/portfolio/{project_slug}

Returns full detail for a single project. Includes everything from the portfolio endpoint for this project PLUS additional fields only relevant at detail level.

**Response:**

```json
{
  "name": "RGA",
  "slug": "rga",
  "health": "green",
  "phase": "production",
  "owner": "John Doe",
  "pm": "Jane Smith",
  "tech_lead": "Dev Lead",
  "vertical": "ai4workforce",
  "last_updated": "2026-05-27",
  "summary": "R6 on track for 30 Jun. 6 sites live, expanding to 15+.",
  "accent": "$3-4M target benefit at scale",
  "what_it_is": "Automates generation of standardized quality/validation reports for manufacturing sites. Replaces 4-8 hours of manual author time per report.",
  "current_status": "V6 development in final stretch. Template wizard shipped to UAT (18-22 May). OCR handwriting extraction dev complete.",
  "business_impact": [
    "Target benefit: $3-4M annual productivity gains at full scale",
    "Time saved: 2-4 hours per report",
    "Site coverage: 6 active → 15+ target (H2 2026)",
    "Reports generated: 67 total (25 real end-user)"
  ],
  "dates": {
    "programme_start": "2024-09",
    "current_release": "Apr–Jun 2026",
    "go_live": "2026-06-30",
    "horizon": "2024–2032"
  },
  "people": {
    "owner": "John Doe",
    "pm": "Jane Smith",
    "global_po": "Aaron Dimech",
    "product_owner": "Bhagyalaxmi Murali",
    "tech_lead": "Dev Lead",
    "it_pm": "Saquib Sayed",
    "ba": ["Anna Ng (agentic)", "Angelino Go (IT)"]
  },
  "next_milestone": {
    "what": "Full UAT",
    "date": "2026-06-15",
    "confidence": "high"
  },
  "blockers": [
    {
      "description": "ECS capacity for 100-1000 concurrent users undefined",
      "owner": "Admin",
      "age_days": 12
    },
    {
      "description": "No automated testing framework",
      "owner": "Dev Lead",
      "age_days": 30
    }
  ],
  "risks": [
    {
      "level": "high",
      "description": "OCR accuracy on real handwritten MtV cleaning docs"
    },
    {
      "level": "medium",
      "description": "Multi-language extraction untested"
    },
    {
      "level": "medium",
      "description": "R6 scope is largest ever — risk of slip past 30 Jun"
    },
    {
      "level": "low",
      "description": "Adoption flat — $3-4M case requires 10-20x scale"
    }
  ],
  "milestones": [
    {
      "what": "V1–V5: MVP → Template Creator",
      "date": "2024-09 – 2026-03",
      "status": "done",
      "progress": 100
    },
    {
      "what": "V6 Interim UAT — Template Wizard + User Groups",
      "date": "2026-05-18 – 2026-05-22",
      "status": "done",
      "progress": 100
    },
    {
      "what": "V6 — OCR Handwriting Extraction",
      "date": null,
      "status": "active",
      "progress": 75,
      "description": "Dev complete, validating with templates"
    },
    {
      "what": "V6 — QAA Clause Bank POC",
      "date": "2026-06-12",
      "status": "active",
      "progress": 50,
      "description": "Design ongoing, demo 12 Jun"
    },
    {
      "what": "V6 — Full SIT",
      "date": "2026-06-08 – 2026-06-12",
      "status": "upcoming",
      "progress": 0
    },
    {
      "what": "V6 — Full UAT",
      "date": "2026-06-15 – 2026-06-24",
      "status": "upcoming",
      "progress": 0
    },
    {
      "what": "V6 — Production Go-Live",
      "date": "2026-06-30",
      "status": "upcoming",
      "progress": 0
    },
    {
      "what": "V7 — Agentic V1 (Guided Report Setup)",
      "date": "Q3 2026",
      "status": "proposed",
      "progress": 0,
      "description": "#1 user-requested feature"
    }
  ],
  "investment": [
    { "year": 2024, "investment": "$5M", "recurring": null, "cumul_cost": "$5M", "cumul_benefit": "$0", "net": "-$5M" },
    { "year": 2025, "investment": "$5M", "recurring": "$1M", "cumul_cost": "$11M", "cumul_benefit": "$9M", "net": "-$2M" },
    { "year": 2026, "investment": "$10M", "recurring": "$1M", "cumul_cost": "$22M", "cumul_benefit": "$21M", "net": "-$1M" },
    { "year": 2028, "investment": "$10M", "recurring": "$1M", "cumul_cost": "$54M", "cumul_benefit": "$58M", "net": "+$5M" },
    { "year": 2032, "investment": "Declining", "recurring": null, "cumul_cost": "$69M", "cumul_benefit": "$129M", "net": "+$61M" }
  ],
  "kpis": [
    { "label": "2026 Investment", "value": "$10M" },
    { "label": "Cumulative Benefit (2026)", "value": "$21M" },
    { "label": "Net Positive Year", "value": "2028" },
    { "label": "Total Benefit (2032)", "value": "$129M" }
  ],
  "tech_stack": [
    "Python 3.12", "FastAPI", "React.js", "Claude (Bedrock)",
    "LangChain 0.3.7", "OpenSearch Serverless", "DynamoDB (15 tables)",
    "S3", "AWS Textract (OCR)", "ECS Fargate", "Azure AD (OAuth/JWT)", "CodePipeline"
  ],
  "data_sources": [
    "Source docs: PQR, SOP, Validation protocols (PDF, DOCX, Excel, CSV)",
    "Templates: Word templates + Excel extraction rules",
    "Vector store: OpenSearch Serverless (per-product KBs)"
  ],
  "modules": [
    { "name": "OCR / Handwriting", "description": "AWS Textract pipeline for handwritten + printed content" },
    { "name": "RAG Pipeline", "description": "Bedrock Knowledge Bases with per-product isolation" },
    { "name": "Template Extraction Engine", "description": "Configurable per-placeholder extraction rules" },
    { "name": "Multi-language Processing", "description": "LLM extraction on Swedish, Portuguese, Spanish" },
    { "name": "Eval Harness", "description": "Accuracy benchmarking framework (in development)" },
    { "name": "Document Classification", "description": "Automated doc-type tagging for intake" }
  ],
  "timeline": [
    { "date": "2026-05-27", "entries": ["Template wizard shipped to UAT", "User groups feature complete"] },
    { "date": "2026-05-20", "entries": ["OCR dev complete", "QAA Clause Bank design started"] }
  ]
}
```

## Strategy Data Source

The `strategy` field in the portfolio response is extracted from `org/strategy.md` frontmatter:

```yaml
---
summary: "Portfolio is evolving from point solutions to autonomous agents."
detail: "Key pattern: Claude Agent SDK + shared UI + domain-specific skills."
h2_bets: "RGA Agentic V1 + Operator Assist + cross-vertical platform play."
---
```

## Attention Items Computation

Attention items come from two sources (merged, deduplicated):
1. **Manual** — `attention` field in project frontmatter (explicitly flagged by humans)
2. **Computed** — derived by portfolio builder from staleness (>15 days) and unowned blockers

Manual items take priority. Computed items are added if no manual item covers the same concern.

## Freshness Computation

Freshness is computed at read time from `last_updated` fields:

| Days Stale | Status |
|-----------|--------|
| 0-7 | fresh |
| 8-14 | ok |
| 15-30 | stale |
| 30+ | critical |

The `pulse.stale` count and `attention` items are derived from this.

## Error Responses

```json
{
  "detail": "Project not found: {slug}"
}
```
HTTP 404 when project slug doesn't match any folder in `projects/`.

```json
{
  "detail": "Repository unavailable"
}
```
HTTP 503 when local clone is missing or git pull fails.
