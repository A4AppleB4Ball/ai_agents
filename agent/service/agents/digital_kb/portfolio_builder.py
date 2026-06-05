from datetime import datetime, timezone
from pathlib import Path

from agent.service.agents.digital_kb.frontmatter_parser import FrontmatterParser
from agent.service.agents.digital_kb.git_reader import GitReader
from agent.service.agents.digital_kb.models import (
    AttentionItem,
    Blocker,
    DatesInfo,
    InvestmentRow,
    KPI,
    Milestone,
    ModuleInfo,
    NextMilestone,
    PeopleInfo,
    PortfolioResponse,
    ProjectDetailResponse,
    ProjectSummary,
    PulseData,
    Risk,
    StrategyData,
    UpcomingMilestone,
    VerticalData,
)
from agent.service.agents.digital_kb.timeline_parser import TimelineParser


class PortfolioBuilder:
    """Builds portfolio and project detail responses from parsed data."""

    def __init__(
        self,
        git_reader: GitReader,
        parser: FrontmatterParser,
        timeline_parser: TimelineParser,
    ) -> None:
        self._git_reader = git_reader
        self._parser = parser
        self._timeline_parser = timeline_parser

    async def build_portfolio(self) -> PortfolioResponse:
        """Build the full portfolio response."""
        sha = await self._git_reader.pull()
        projects_dir = self._git_reader.get_projects_dir()
        verticals_dir = self._git_reader.get_verticals_dir()

        raw_projects = self._parser.parse_all_projects(projects_dir)
        verticals = self._build_verticals(verticals_dir, raw_projects)
        pulse = self.compute_pulse(raw_projects)
        attention = self.compute_attention(raw_projects)
        upcoming = self.compute_upcoming_milestones(raw_projects)
        strategy = self._build_strategy()
        projects = [self._build_project_summary(p) for p in raw_projects]

        return PortfolioResponse(
            last_synced=datetime.now(timezone.utc).isoformat(),
            commit_sha=sha,
            pulse=pulse,
            verticals=verticals,
            projects=projects,
            strategy=strategy,
            attention=attention,
            upcoming_milestones=upcoming,
        )

    async def build_project_detail(self, slug: str) -> ProjectDetailResponse:
        """Build a detailed project response for a specific slug."""
        projects_dir = self._git_reader.get_projects_dir()
        file_path = projects_dir / f"{slug}.md"
        if not file_path.exists():
            raise FileNotFoundError(f"Project not found: {slug}")

        data = self._parser.parse_state_file(file_path)
        data["what_it_is"] = self._parser.extract_body_section(file_path, "What it is")
        data["current_status"] = self._parser.extract_body_section(file_path, "Current status")

        # Parse timeline if it exists
        timeline_path = self._git_reader.get_repo_path() / "timelines" / f"{slug}.md"
        timeline = self._timeline_parser.parse(timeline_path)

        return ProjectDetailResponse(
            name=data["name"],
            slug=data["slug"],
            health=data["health"],
            phase=data["phase"],
            owner=data["owner"],
            pm=data.get("pm"),
            tech_lead=data.get("tech_lead"),
            vertical=data["vertical"],
            last_updated=str(data["last_updated"]),
            summary=data["summary"],
            accent=data.get("accent"),
            what_it_is=data.get("what_it_is"),
            current_status=data.get("current_status"),
            business_impact=data.get("business_impact", []),
            dates=self._build_dates(data.get("dates")),
            people=self._build_people(data.get("people")),
            next_milestone=self._build_next_milestone(data.get("next_milestone")),
            blockers=[Blocker(**b) for b in data.get("blockers", [])],
            risks=[Risk(**r) for r in data.get("risks", [])],
            milestones=[Milestone(**m) for m in data.get("milestones", [])],
            investment=[InvestmentRow(**i) for i in data.get("investment", [])],
            kpis=[KPI(**k) for k in data.get("kpis", [])],
            tech_stack=data.get("tech_stack", []),
            data_sources=data.get("data_sources", []),
            modules=[ModuleInfo(**m) for m in data.get("modules", [])],
            timeline=timeline,
        )

    def compute_pulse(self, projects: list[dict]) -> PulseData:
        """Compute pulse summary counts from projects."""
        green = 0
        yellow = 0
        red = 0
        stale = 0

        for p in projects:
            health = p.get("health")
            if health == "green":
                green += 1
            elif health == "yellow":
                yellow += 1
            elif health == "red":
                red += 1

            freshness = self.compute_freshness(str(p.get("last_updated", "")))
            if freshness in ("stale", "critical"):
                stale += 1

        return PulseData(
            total_projects=len(projects),
            green=green,
            yellow=yellow,
            red=red,
            stale=stale,
        )

    def compute_attention(self, projects: list[dict]) -> list[AttentionItem]:
        """Compute attention items from manual flags, staleness, and blockers."""
        items: list[AttentionItem] = []

        for p in projects:
            slug = p.get("slug", "")
            name = p.get("name", "")

            # Manual attention field
            for att in p.get("attention", []):
                items.append(AttentionItem(
                    level=att.get("level", "yellow"),
                    title=att.get("title", name),
                    description=att.get("description", ""),
                    project_slug=slug,
                ))

            # Computed: staleness > 15 days
            freshness = self.compute_freshness(str(p.get("last_updated", "")))
            if freshness in ("stale", "critical"):
                items.append(AttentionItem(
                    level="yellow" if freshness == "stale" else "red",
                    title=f"{name} - stale update",
                    description=f"Last updated: {p.get('last_updated')}",
                    project_slug=slug,
                ))

            # Computed: blockers present
            blockers = p.get("blockers", [])
            if blockers:
                items.append(AttentionItem(
                    level="red",
                    title=f"{name} - has blockers",
                    description=f"{len(blockers)} active blocker(s)",
                    project_slug=slug,
                ))

        return items

    def compute_upcoming_milestones(self, projects: list[dict]) -> list[UpcomingMilestone]:
        """Extract upcoming milestones across all projects, sorted by date."""
        upcoming: list[UpcomingMilestone] = []

        for p in projects:
            slug = p.get("slug", "")
            name = p.get("name", "")
            for m in p.get("milestones", []):
                if m.get("status") in ("active", "upcoming", "on-track"):
                    if m.get("date"):
                        upcoming.append(UpcomingMilestone(
                            date=str(m["date"]),
                            project_name=name,
                            project_slug=slug,
                            what=m["what"],
                            description=m.get("description"),
                            status=m["status"],
                        ))

        upcoming.sort(key=lambda u: u.date)
        return upcoming

    def compute_freshness(self, last_updated: str) -> str:
        """Compute freshness category based on days since last update."""
        try:
            updated_date = datetime.strptime(last_updated, "%Y-%m-%d").replace(
                tzinfo=timezone.utc
            )
        except (ValueError, TypeError):
            return "critical"

        days = (datetime.now(timezone.utc) - updated_date).days

        if days <= 7:
            return "fresh"
        elif days <= 14:
            return "ok"
        elif days <= 30:
            return "stale"
        else:
            return "critical"

    def _build_verticals(
        self, verticals_dir: Path, raw_projects: list[dict]
    ) -> list[VerticalData]:
        """Build vertical data from vertical files or project data."""
        verticals_path = verticals_dir
        verticals: list[VerticalData] = []

        if verticals_path.exists():
            for file_path in sorted(verticals_path.glob("*.md")):
                data = self._parser.parse_vertical_file(file_path)
                slug = data["slug"]
                name = data["name"]
                project_slugs = [
                    p["slug"] for p in raw_projects if p.get("vertical") == slug
                ]
                verticals.append(VerticalData(
                    slug=slug, name=name, projects=project_slugs
                ))
        else:
            # Build verticals from project data
            vertical_map: dict[str, list[str]] = {}
            for p in raw_projects:
                v = p.get("vertical", "unknown")
                vertical_map.setdefault(v, []).append(p["slug"])
            for slug, project_slugs in sorted(vertical_map.items()):
                verticals.append(VerticalData(
                    slug=slug, name=slug, projects=project_slugs
                ))

        return verticals

    def _build_strategy(self) -> StrategyData | None:
        """Build strategy data from strategy file if it exists."""
        strategy_path = self._git_reader.get_repo_path() / "strategy.md"
        if not strategy_path.exists():
            return None

        try:
            data = self._parser.parse_state_file(strategy_path)
            return StrategyData(
                summary=data.get("summary", ""),
                detail=data.get("detail", ""),
                h2_bets=data.get("h2_bets", ""),
            )
        except (ValueError, KeyError):
            return None

    def _build_project_summary(self, data: dict) -> ProjectSummary:
        """Build a ProjectSummary from raw project data."""
        return ProjectSummary(
            name=data["name"],
            slug=data["slug"],
            health=data["health"],
            phase=data["phase"],
            owner=data["owner"],
            pm=data.get("pm"),
            tech_lead=data.get("tech_lead"),
            vertical=data["vertical"],
            last_updated=str(data["last_updated"]),
            summary=data["summary"],
            accent=data.get("accent"),
            next_milestone=self._build_next_milestone(data.get("next_milestone")),
            blockers=[Blocker(**b) for b in data.get("blockers", [])],
            risks=[Risk(**r) for r in data.get("risks", [])],
            milestones=[Milestone(**m) for m in data.get("milestones", [])],
            kpis=[KPI(**k) for k in data.get("kpis", [])],
            tech_stack=data.get("tech_stack", []),
        )

    def _build_next_milestone(self, data: dict | None) -> NextMilestone | None:
        """Build NextMilestone from raw dict."""
        if not data:
            return None
        return NextMilestone(
            what=data["what"],
            date=str(data["date"]),
            confidence=data["confidence"],
        )

    def _build_dates(self, data: dict | None) -> DatesInfo | None:
        """Build DatesInfo from raw dict."""
        if not data:
            return None
        return DatesInfo(
            programme_start=data.get("programme_start"),
            current_release=data.get("current_release"),
            go_live=data.get("go_live"),
            horizon=data.get("horizon"),
        )

    def _build_people(self, data: dict | None) -> PeopleInfo | None:
        """Build PeopleInfo from raw dict."""
        if not data:
            return None
        return PeopleInfo(
            owner=data.get("owner"),
            pm=data.get("pm"),
            global_po=data.get("global_po"),
            product_owner=data.get("product_owner"),
            tech_lead=data.get("tech_lead"),
            it_pm=data.get("it_pm"),
            ba=data.get("ba", []),
        )
