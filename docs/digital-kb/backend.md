# Digital KB — Backend Design

## Folder Structure

```
agent/service/agents/digital_kb/
├── __init__.py
├── router.py                   → FastAPI router mounted at /agent/v1/digital-kb
├── git_reader.py               → Clone/pull operations on local repo
├── frontmatter_parser.py       → YAML frontmatter extraction from .md files
├── timeline_parser.py          → timeline.md parsing
├── portfolio_builder.py        → Assembles portfolio response from parsed data
├── models.py                   → Pydantic response models
└── config.py                   → Repo URL, branch, local path, refresh interval
```

## Configuration

```python
# agent/service/agents/digital_kb/config.py

class DigitalKBConfig:
    repo_url: str           # e.g. "git@github.com:org/ops-digital-kb-source.git"
    branch: str = "knowledge"
    local_path: str         # e.g. "/data/digital-kb-source"
    pull_interval_seconds: int = 300  # 5 minutes
```

Loaded from environment variables:
- `DIGITAL_KB_REPO_URL`
- `DIGITAL_KB_BRANCH` (default: knowledge)
- `DIGITAL_KB_LOCAL_PATH`
- `DIGITAL_KB_PULL_INTERVAL` (default: 300)

## Git Reader

```python
# agent/service/agents/digital_kb/git_reader.py

class GitReader:
    """Manages local clone of the digital-kb-source repo."""

    def __init__(self, config: DigitalKBConfig): ...

    async def ensure_cloned(self) -> None:
        """Clone if not exists, pull if exists."""

    async def pull(self) -> str:
        """Pull latest and return current HEAD sha."""

    def get_repo_path(self) -> Path:
        """Return path to local clone."""

    def get_projects_dir(self) -> Path:
        """Return path to projects/ folder."""

    def get_verticals_dir(self) -> Path:
        """Return path to verticals/ folder."""
```

Uses `asyncio.create_subprocess_exec` for git operations. No git library dependency.

## Frontmatter Parser

```python
# agent/service/agents/digital_kb/frontmatter_parser.py

class FrontmatterParser:
    """Extracts YAML frontmatter from markdown files."""

    def parse_state_file(self, file_path: Path) -> ProjectFrontmatter:
        """Read a state.md file, extract and validate frontmatter."""

    def parse_vertical_file(self, file_path: Path) -> VerticalFrontmatter:
        """Read a verticals/*.md file, extract frontmatter."""

    def parse_all_projects(self, projects_dir: Path) -> list[ProjectFrontmatter]:
        """Scan all projects/*/state.md and parse each."""
```

Parsing approach:
1. Read file content
2. Split on `---` delimiters (first two occurrences)
3. Parse YAML between delimiters using `yaml.safe_load`
4. Validate against Pydantic model
5. Throw error if required fields are missing (no fallbacks)

## Timeline Parser

```python
# agent/service/agents/digital_kb/timeline_parser.py

class TimelineParser:
    """Parses timeline.md files into structured entries."""

    def parse(self, file_path: Path) -> list[TimelineEntry]:
        """Parse timeline.md, return list of dated entries."""
```

Parsing approach:
1. Split by `## YYYY-MM-DD` headings
2. Extract date from heading
3. Collect bullet points under each heading
4. Return sorted (most recent first)

## Portfolio Builder

```python
# agent/service/agents/digital_kb/portfolio_builder.py

class PortfolioBuilder:
    """Assembles the full portfolio response from parsed data."""

    def __init__(self, git_reader: GitReader, parser: FrontmatterParser, timeline_parser: TimelineParser): ...

    async def build_portfolio(self) -> PortfolioResponse:
        """Build complete portfolio response."""

    async def build_project_detail(self, slug: str) -> ProjectDetailResponse:
        """Build detail response for a single project."""

    def compute_pulse(self, projects: list[ProjectFrontmatter]) -> PulseData:
        """Compute health summary from project list."""

    def compute_attention(self, projects: list[ProjectFrontmatter]) -> list[AttentionItem]:
        """Derive attention items from blockers, staleness, health."""

    def compute_upcoming_milestones(self, projects: list[ProjectFrontmatter]) -> list[UpcomingMilestone]:
        """Aggregate and sort upcoming milestones across all projects."""

    def compute_freshness(self, last_updated: str) -> str:
        """Return freshness status: fresh | ok | stale | critical."""
```

## Router

```python
# agent/service/agents/digital_kb/router.py

from fastapi import APIRouter

router = APIRouter(prefix="/agent/v1/digital-kb", tags=["digital-kb"])

@router.get("/portfolio")
async def get_portfolio() -> PortfolioResponse:
    """Return full portfolio data."""

@router.get("/portfolio/{project_slug}")
async def get_project(project_slug: str) -> ProjectDetailResponse:
    """Return detail for a single project."""
```

## Pydantic Models

```python
# agent/service/agents/digital_kb/models.py

class Blocker(BaseModel):
    description: str
    owner: str
    age_days: int

class Risk(BaseModel):
    level: Literal["high", "medium", "low"]
    description: str

class Milestone(BaseModel):
    what: str
    date: str | None
    status: Literal["done", "active", "upcoming", "proposed", "design", "on-track", "at-risk"]
    progress: int = 0
    description: str | None = None

class KPI(BaseModel):
    label: str
    value: str

class NextMilestone(BaseModel):
    what: str
    date: str
    confidence: Literal["high", "medium", "low"]

class AttentionItem(BaseModel):
    level: Literal["red", "yellow"]
    title: str
    description: str
    project_slug: str

class UpcomingMilestone(BaseModel):
    date: str
    project_name: str
    project_slug: str
    what: str
    description: str | None = None
    status: str

class PulseData(BaseModel):
    total_projects: int
    green: int
    yellow: int
    red: int
    stale: int

class VerticalData(BaseModel):
    slug: str
    name: str
    projects: list[str]

class ProjectSummary(BaseModel):
    name: str
    slug: str
    health: Literal["green", "yellow", "red"]
    phase: Literal["discovery", "development", "production", "sunset"]
    owner: str
    pm: str | None = None
    tech_lead: str | None = None
    vertical: str
    last_updated: str
    summary: str
    accent: str | None = None
    next_milestone: NextMilestone | None = None
    blockers: list[Blocker] = []
    risks: list[Risk] = []
    milestones: list[Milestone] = []
    kpis: list[KPI] = []
    tech_stack: list[str] = []

class StrategyData(BaseModel):
    summary: str
    detail: str
    h2_bets: str

class PortfolioResponse(BaseModel):
    last_synced: str
    commit_sha: str
    pulse: PulseData
    verticals: list[VerticalData]
    projects: list[ProjectSummary]
    strategy: StrategyData | None = None
    attention: list[AttentionItem]
    upcoming_milestones: list[UpcomingMilestone]

class InvestmentRow(BaseModel):
    year: int
    investment: str
    recurring: str | None = None
    cumul_cost: str
    cumul_benefit: str
    net: str

class ModuleInfo(BaseModel):
    name: str
    description: str

class PeopleInfo(BaseModel):
    owner: str | None = None
    pm: str | None = None
    global_po: str | None = None
    product_owner: str | None = None
    tech_lead: str | None = None
    it_pm: str | None = None
    ba: list[str] = []

class DatesInfo(BaseModel):
    programme_start: str | None = None
    current_release: str | None = None
    go_live: str | None = None
    horizon: str | None = None

class TimelineEntry(BaseModel):
    date: str
    entries: list[str]

class ProjectDetailResponse(BaseModel):
    name: str
    slug: str
    health: Literal["green", "yellow", "red"]
    phase: Literal["discovery", "development", "production", "sunset"]
    owner: str
    pm: str | None = None
    tech_lead: str | None = None
    vertical: str
    last_updated: str
    summary: str
    accent: str | None = None
    what_it_is: str | None = None
    current_status: str | None = None
    business_impact: list[str] = []
    dates: DatesInfo | None = None
    people: PeopleInfo | None = None
    next_milestone: NextMilestone | None = None
    blockers: list[Blocker] = []
    risks: list[Risk] = []
    milestones: list[Milestone] = []
    investment: list[InvestmentRow] = []
    kpis: list[KPI] = []
    tech_stack: list[str] = []
    data_sources: list[str] = []
    modules: list[ModuleInfo] = []
    timeline: list[TimelineEntry] = []
```

## Startup & Background Refresh

```python
# In the main FastAPI app startup

@app.on_event("startup")
async def startup_digital_kb():
    git_reader = GitReader(config)
    await git_reader.ensure_cloned()
    # Start background pull task
    asyncio.create_task(periodic_pull(git_reader, config.pull_interval_seconds))

async def periodic_pull(reader: GitReader, interval: int):
    while True:
        await asyncio.sleep(interval)
        await reader.pull()
```

## Caching Strategy

- On startup: parse all projects, cache in memory
- On periodic pull: if HEAD sha changed, re-parse and update cache
- API serves from cache (sub-millisecond response)
- No database needed — cache is the parsed frontmatter data

## Registration

The router is registered in the main FastAPI app:

```python
# agent/main.py or equivalent
from agent.service.agents.digital_kb.router import router as digital_kb_router

app.include_router(digital_kb_router)
```
