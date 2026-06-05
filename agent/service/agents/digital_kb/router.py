import asyncio
import logging

from fastapi import APIRouter, HTTPException

from agent.service.agents.digital_kb.config import DigitalKBConfig
from agent.service.agents.digital_kb.frontmatter_parser import FrontmatterParser
from agent.service.agents.digital_kb.git_reader import GitReader
from agent.service.agents.digital_kb.models import PortfolioResponse, ProjectDetailResponse
from agent.service.agents.digital_kb.portfolio_builder import PortfolioBuilder
from agent.service.agents.digital_kb.timeline_parser import TimelineParser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/digital-kb", tags=["digital-kb"])

# Module-level state
_config: DigitalKBConfig | None = None
_git_reader: GitReader | None = None
_portfolio_builder: PortfolioBuilder | None = None
_cache: dict[str, object] = {}
_background_task: asyncio.Task | None = None


def _initialize() -> None:
    """Initialize config and dependencies. Called on first request or startup."""
    global _config, _git_reader, _portfolio_builder
    if _config is not None:
        return
    _config = DigitalKBConfig()
    _git_reader = GitReader(_config)
    parser = FrontmatterParser()
    timeline_parser = TimelineParser()
    _portfolio_builder = PortfolioBuilder(_git_reader, parser, timeline_parser)


async def startup() -> None:
    """Startup logic: clone/pull repo and start background pull task."""
    global _background_task
    _initialize()
    try:
        await _git_reader.ensure_cloned()
        logger.info("Digital KB repository cloned/updated successfully")
    except RuntimeError as e:
        logger.error(f"Failed to initialize Digital KB repository: {e}")

    _background_task = asyncio.create_task(_periodic_pull())


async def _periodic_pull() -> None:
    """Background task that periodically pulls the repository."""
    while True:
        await asyncio.sleep(_config.pull_interval_seconds)
        try:
            new_sha = await _git_reader.pull()
            # Invalidate cache if sha changed
            if _cache.get("sha") != new_sha:
                _cache.clear()
                _cache["sha"] = new_sha
                logger.info(f"Digital KB updated to {new_sha}")
        except RuntimeError as e:
            logger.error(f"Digital KB periodic pull failed: {e}")


@router.get("/portfolio")
async def get_portfolio() -> PortfolioResponse:
    """Return the full portfolio overview."""
    _initialize()
    if _git_reader is None or _portfolio_builder is None:
        raise HTTPException(status_code=503, detail="Digital KB service not initialized")

    # Check repo availability
    if not _git_reader.get_repo_path().exists():
        raise HTTPException(status_code=503, detail="Digital KB repository unavailable")

    try:
        # Use cache if sha hasn't changed
        cached_sha = _cache.get("sha")
        if cached_sha and "portfolio" in _cache:
            return _cache["portfolio"]

        response = await _portfolio_builder.build_portfolio()
        _cache["sha"] = response.commit_sha
        _cache["portfolio"] = response
        return response
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/portfolio/{project_slug}")
async def get_project(project_slug: str) -> ProjectDetailResponse:
    """Return detailed information for a specific project."""
    _initialize()
    if _git_reader is None or _portfolio_builder is None:
        raise HTTPException(status_code=503, detail="Digital KB service not initialized")

    if not _git_reader.get_repo_path().exists():
        raise HTTPException(status_code=503, detail="Digital KB repository unavailable")

    try:
        # Use cache if available
        cache_key = f"project:{project_slug}"
        cached_sha = _cache.get("sha")
        if cached_sha and cache_key in _cache:
            return _cache[cache_key]

        response = await _portfolio_builder.build_project_detail(project_slug)
        _cache[cache_key] = response
        return response
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Project not found: {project_slug}")
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
