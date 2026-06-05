from typing import Literal

from pydantic import BaseModel


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
