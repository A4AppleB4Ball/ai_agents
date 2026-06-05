import time
import uuid
from pathlib import Path

from agent.core.config import get_user_workspace_path
from agent.service.browser.browser_manager import BrowserManager
from agent.service.browser.report_generator import generate_html_report
from agent.utils.logger import logger


async def handle_browser_session_start(
    url: str, session_name: str | None = None
) -> dict:
    """Start a new browser session navigating to the given URL.

    Args:
        url: The URL to navigate to.
        session_name: Optional human-readable name for the session.

    Returns:
        Dict with session_id, session_name, and url.
    """
    if not session_name:
        session_name = f"session-{int(time.time())}"

    manager = BrowserManager()
    session = await manager.create_session(session_name=session_name, url=url)

    return {
        "status": "ok",
        "session_id": session.session_id,
        "session_name": session.session_name,
        "url": session.url,
    }


async def handle_browser_session_stop(session_id: str) -> dict:
    """Stop and close a browser session.

    Args:
        session_id: The session ID to close.

    Returns:
        Dict confirming closure.
    """
    manager = BrowserManager()
    await manager.close_session(session_id)

    return {
        "status": "ok",
        "session_id": session_id,
        "message": "Session closed successfully",
    }


async def handle_browser_session_list() -> dict:
    """List all active browser sessions.

    Returns:
        Dict with list of active sessions.
    """
    manager = BrowserManager()
    sessions = await manager.list_sessions()

    return {
        "status": "ok",
        "sessions": sessions,
        "count": len(sessions),
    }


async def handle_generate_report(
    run_id: str, test_cases: list, user_id: str
) -> dict:
    """Generate an HTML report for a completed test run.

    Args:
        run_id: Unique identifier for the test run.
        test_cases: List of test case result dicts.
        user_id: The user who owns this test run.

    Returns:
        Dict with the report path and summary.
    """
    workspace_path = Path(get_user_workspace_path())
    run_dir = workspace_path / "ui-testing" / "runs" / run_id
    screenshots_dir = run_dir / "screenshots"
    output_dir = run_dir / "report"

    screenshots_dir.mkdir(parents=True, exist_ok=True)

    report_path = await generate_html_report(
        run_id=run_id,
        test_cases=test_cases,
        screenshots_dir=screenshots_dir,
        output_dir=output_dir,
    )

    total = len(test_cases)
    passed = sum(1 for tc in test_cases if tc.get("status") == "pass")
    failed = sum(1 for tc in test_cases if tc.get("status") == "fail")

    return {
        "status": "ok",
        "run_id": run_id,
        "report_path": str(report_path),
        "summary": {
            "total": total,
            "passed": passed,
            "failed": failed,
        },
    }
