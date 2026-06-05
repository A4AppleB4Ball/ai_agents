import asyncio
import json
import time
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel

from agent.api.auth.dependencies import get_current_user_from_request, verify_token
from agent.core.config import (
    _current_user_email,
    get_current_user,
    get_user_workspace_path,
    get_workspace_base_path,
    settings,
)
from agent.service.browser.browser_manager import BrowserManager
from agent.service.browser.report_generator import generate_html_report
from agent.service.browser.session_store import BrowserSessionStore
from agent.service.browser.snapshot import get_element_selector, page_snapshot
from agent.utils.logger import logger

router = APIRouter()

# Singleton session store for chat-to-browser mappings
_session_store = BrowserSessionStore()

# Console log buffer: session_id -> list of {level, text, timestamp}
_console_logs: dict[str, list[dict]] = {}

# Test run step tracking: case_id -> list of step dicts
_test_run_steps: dict[str, list[dict]] = {}


class BrowserWSConnectionManager:
    """Manages WebSocket connections and their session subscriptions for browser streaming."""

    def __init__(self) -> None:
        self._subscriptions: dict[WebSocket, set[str]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._subscriptions[websocket] = set()

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._subscriptions.pop(websocket, None)

    async def subscribe(self, websocket: WebSocket, session_ids: list[str]) -> None:
        async with self._lock:
            if websocket in self._subscriptions:
                self._subscriptions[websocket].update(session_ids)

    async def unsubscribe(self, websocket: WebSocket, session_ids: list[str]) -> None:
        async with self._lock:
            if websocket in self._subscriptions:
                self._subscriptions[websocket].difference_update(session_ids)

    async def broadcast(self, message: dict) -> None:
        """Broadcast a message to all WebSocket clients subscribed to the message's session_id."""
        session_id = message.get("session_id")
        if not session_id:
            return

        async with self._lock:
            targets = [
                ws
                for ws, subs in self._subscriptions.items()
                if session_id in subs
            ]

        payload = json.dumps(message)
        disconnected = []
        for ws in targets:
            try:
                await ws.send_text(payload)
            except Exception:
                disconnected.append(ws)

        if disconnected:
            async with self._lock:
                for ws in disconnected:
                    self._subscriptions.pop(ws, None)

    async def broadcast_all(self, message: dict) -> None:
        """Broadcast a message to ALL connected WebSocket clients regardless of subscription."""
        async with self._lock:
            targets = list(self._subscriptions.keys())

        payload = json.dumps(message)
        disconnected = []
        for ws in targets:
            try:
                await ws.send_text(payload)
            except Exception:
                disconnected.append(ws)

        if disconnected:
            async with self._lock:
                for ws in disconnected:
                    self._subscriptions.pop(ws, None)


# Singleton connection manager
_ws_manager = BrowserWSConnectionManager()


def _get_browser_manager() -> BrowserManager:
    """Get the BrowserManager singleton and wire the event callback."""
    manager = BrowserManager()
    manager.set_event_callback(_ws_manager.broadcast)
    return manager


def _is_internal_url(url: str) -> bool:
    """Check if a URL is an internal/corporate site that needs SSO auth."""
    internal_domains = settings.BROWSER_INTERNAL_DOMAINS.split(",") if settings.BROWSER_INTERNAL_DOMAINS else []
    for domain in internal_domains:
        domain = domain.strip()
        if domain and domain in url:
            return True
    return False


def _setup_console_capture(session_id: str, page) -> None:
    """Set up console message capturing for a browser session."""
    _console_logs[session_id] = []

    def on_console(msg):
        _console_logs.setdefault(session_id, []).append({
            "level": msg.type,
            "text": msg.text,
            "timestamp": time.time(),
        })

    page.on("console", on_console)


async def _emit_action_event(session_id: str, action: str, detail: dict) -> None:
    """Emit an action event to WebSocket subscribers for frontend overlay."""
    message = {
        "type": "action",
        "session_id": session_id,
        "action": action,
        "detail": detail,
        "timestamp": time.time(),
    }
    await _ws_manager.broadcast(message)


async def _auto_screenshot(session_id: str, manager: BrowserManager) -> Optional[str]:
    """Take an automatic screenshot after a visual action. Returns relative path or None."""
    try:
        session = manager.registry.get(session_id)
        workspace_path = Path(get_user_workspace_path())
        screenshots_dir = workspace_path / "UI-Agent" / "screenshots"
        screenshots_dir.mkdir(parents=True, exist_ok=True)

        filename = f"{session_id}_{int(time.time() * 1000)}.png"
        filepath = screenshots_dir / filename
        await session.page.screenshot(path=str(filepath))
        return f"UI-Agent/screenshots/{filename}"
    except Exception as e:
        logger.error(f"Auto-screenshot failed for session {session_id}: {e}")
        return None


def _get_session_page(session_id: str):
    """Get the page object for a session_id. Raises HTTPException if not found."""
    manager = BrowserManager()
    try:
        session = manager.registry.get(session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")
    return session.page, session


async def _resolve_selector(page, selector: str) -> str:
    """Resolve a ref (e.g., 'e5') or CSS selector to a usable CSS selector."""
    if selector.startswith("e") and selector[1:].isdigit():
        return await get_element_selector(page, selector)
    return selector


# =========================================================================
# WebSocket endpoint for browser streaming
# =========================================================================


@router.websocket("/browser/ws")
async def browser_ws(websocket: WebSocket) -> None:
    """WebSocket endpoint for streaming browser screencast frames and action events.

    Client messages:
        {"type": "subscribe", "session_ids": ["tab-001", ...]}
        {"type": "unsubscribe", "session_ids": ["tab-001", ...]}

    Server pushes:
        {"type": "frame", "session_id": "...", "data": "<base64>", "timestamp": ...}
        {"type": "action", "session_id": "...", "action": "...", "detail": {...}, "timestamp": ...}
    """
    if settings.DISABLE_AUTH:
        _current_user_email.set("dev@local")
    else:
        token = websocket.query_params.get("token")
        if not token:
            await websocket.close(code=4001, reason="Missing authentication token")
            return
        try:
            user = await verify_token(token)
            _current_user_email.set(user.email)
            # Store the token for browser sessions to access internal sites
            from agent.service.browser.token_store import store_token
            await store_token(user.email, token)
        except Exception as e:
            logger.error(f"Browser WS auth failed: {e}")
            await websocket.close(code=4001, reason="Authentication failed")
            return

    _get_browser_manager()

    await _ws_manager.connect(websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_text(
                    json.dumps({"type": "error", "message": "Invalid JSON"})
                )
                continue

            msg_type = msg.get("type")
            session_ids = msg.get("session_ids", [])

            if msg_type == "subscribe":
                await _ws_manager.subscribe(websocket, session_ids)
                await websocket.send_text(
                    json.dumps({"type": "subscribed", "session_ids": session_ids})
                )
            elif msg_type == "unsubscribe":
                await _ws_manager.unsubscribe(websocket, session_ids)
                await websocket.send_text(
                    json.dumps({"type": "unsubscribed", "session_ids": session_ids})
                )
            else:
                await websocket.send_text(
                    json.dumps({"type": "error", "message": f"Unknown message type: {msg_type}"})
                )
    except WebSocketDisconnect:
        logger.info("Browser WebSocket client disconnected")
    except Exception as e:
        logger.error(f"Browser WebSocket error: {e}")
    finally:
        await _ws_manager.disconnect(websocket)


# =========================================================================
# Public REST endpoints (require auth)
# =========================================================================


@router.get("/ui-testing/sessions")
async def list_browser_sessions(
    user=Depends(get_current_user_from_request),
) -> dict:
    """List all active browser sessions."""
    manager = BrowserManager()
    sessions = await manager.list_sessions()
    return {"sessions": sessions, "count": len(sessions)}


@router.get("/ui-testing/chat-sessions/{session_key:path}")
async def get_chat_browser_sessions(
    session_key: str,
    user=Depends(get_current_user_from_request),
) -> dict:
    """Get active browser sessions for a specific chat session."""
    user_id = get_current_user()
    sessions = await _session_store.get_sessions(user_id, session_key)

    # Filter to only sessions that are still active in the browser manager
    manager = BrowserManager()
    active_ids = {s["session_id"] for s in await manager.list_sessions()}

    live_sessions = []
    for s in sessions:
        if s["tab_id"] in active_ids:
            live_sessions.append({
                "session_id": s["tab_id"],
                "session_name": s["session_name"],
                "url": s["url"],
                "created_at": s["created_at"],
            })

    return {"sessions": live_sessions, "count": len(live_sessions)}


@router.get("/ui-testing/runs")
async def list_test_runs(
    user=Depends(get_current_user_from_request),
) -> dict:
    """List past test runs for the authenticated user."""
    workspace_path = Path(get_user_workspace_path())
    runs_dir = workspace_path / "ui-testing" / "runs"

    if not runs_dir.exists():
        return {"runs": [], "count": 0}

    runs = []
    for run_dir in sorted(runs_dir.iterdir(), reverse=True):
        if not run_dir.is_dir():
            continue
        report_json = run_dir / "report" / "report.json"
        if report_json.exists():
            try:
                data = json.loads(report_json.read_text(encoding="utf-8"))
                runs.append(
                    {
                        "run_id": run_dir.name,
                        "summary": data.get("summary"),
                        "generated_at": data.get("generated_at"),
                    }
                )
            except (json.JSONDecodeError, OSError) as e:
                logger.error(f"Error reading report for run {run_dir.name}: {e}")

    return {"runs": runs, "count": len(runs)}


@router.get("/ui-testing/runs/{run_id}/report")
async def get_test_run_report(
    run_id: str,
    user=Depends(get_current_user_from_request),
) -> HTMLResponse:
    """Serve the HTML report for a specific test run."""
    workspace_path = Path(get_user_workspace_path())
    report_path = workspace_path / "ui-testing" / "runs" / run_id / "report" / "report.html"

    if not report_path.exists():
        raise HTTPException(status_code=404, detail=f"Report not found for run: {run_id}")

    html_content = report_path.read_text(encoding="utf-8")
    return HTMLResponse(content=html_content)


@router.get("/ui-testing/runs/{run_id}/artifacts/{path:path}")
async def get_test_run_artifact(
    run_id: str,
    path: str,
    user=Depends(get_current_user_from_request),
) -> FileResponse:
    """Serve screenshots/traces artifacts for a test run."""
    workspace_path = Path(get_user_workspace_path())
    artifact_path = workspace_path / "ui-testing" / "runs" / run_id / path

    resolved = artifact_path.resolve()
    allowed_base = (workspace_path / "ui-testing" / "runs" / run_id).resolve()
    if not str(resolved).startswith(str(allowed_base)):
        raise HTTPException(status_code=403, detail="Access denied")

    if not artifact_path.exists():
        raise HTTPException(status_code=404, detail=f"Artifact not found: {path}")

    return FileResponse(path=str(artifact_path))


# =========================================================================
# Internal Browser API endpoints (localhost only)
# Called by the MCP server subprocess via HTTP to interact with the shared
# BrowserManager (same Chromium instance used for screencast streaming).
# =========================================================================


async def _verify_internal_request(request: Request) -> None:
    """Reject requests that don't originate from localhost."""
    client_host = request.client.host if request.client else None
    if client_host not in ("127.0.0.1", "::1", "localhost"):
        raise HTTPException(status_code=403, detail="Internal endpoints are localhost-only")


async def _set_user_from_header(request: Request) -> None:
    """Extract user identity from X-User-Email header (set by MCP subprocess)."""
    user_email = request.headers.get("X-User-Email")
    if user_email:
        _current_user_email.set(user_email)


class BrowserOpenRequest(BaseModel):
    url: str
    session_name: Optional[str] = None
    chat_session_key: Optional[str] = None
    cookies: Optional[list[dict]] = None
    storage_state: Optional[dict] = None
    auth_token: Optional[str] = None


class BrowserNavigateRequest(BaseModel):
    session_id: str
    url: str


class BrowserSnapshotRequest(BaseModel):
    session_id: str


class BrowserClickRequest(BaseModel):
    session_id: str
    selector: str


class BrowserTypeRequest(BaseModel):
    session_id: str
    selector: str
    text: str
    submit: bool = False


class BrowserPressKeyRequest(BaseModel):
    session_id: str
    key: str


class BrowserWaitForRequest(BaseModel):
    session_id: str
    selector: Optional[str] = None
    text: Optional[str] = None
    timeout_ms: int = 10000


class BrowserEvaluateRequest(BaseModel):
    session_id: str
    expression: str


class BrowserScreenshotRequest(BaseModel):
    session_id: str
    full_page: bool = False


class BrowserCloseRequest(BaseModel):
    session_id: str


class RecordTestStepRequest(BaseModel):
    session_id: str
    case_id: str
    step_name: str
    status: str
    description: Optional[str] = None


class FinalizeRunRequest(BaseModel):
    run_id: str
    summary: Optional[str] = None


@router.post("/internal/browser/open", dependencies=[Depends(_verify_internal_request), Depends(_set_user_from_header)])
async def internal_browser_open(req: BrowserOpenRequest) -> dict:
    """Open a new browser session, navigate to URL, start screencast."""
    manager = _get_browser_manager()
    session_name = req.session_name or f"session-{uuid.uuid4().hex[:8]}"

    # Enforce per-chat session limit with LRU eviction
    if req.chat_session_key:
        user_id = get_current_user()
        existing = await _session_store.get_sessions(user_id, req.chat_session_key)
        if len(existing) >= settings.BROWSER_MAX_SESSIONS_PER_CHAT:
            oldest = existing[0]
            logger.info(
                f"Per-chat limit ({settings.BROWSER_MAX_SESSIONS_PER_CHAT}) reached, "
                f"evicting oldest session: {oldest['tab_id']}"
            )
            await manager.close_session(oldest["tab_id"])
            await _session_store.remove_session(user_id, req.chat_session_key, oldest["tab_id"])
            _console_logs.pop(oldest["tab_id"], None)

    # Auto-inject user's auth token for internal sites if not explicitly provided
    auth_token = req.auth_token
    if not auth_token and _is_internal_url(req.url):
        from agent.service.browser.auth_provider import get_user_auth_token
        auth_token = await get_user_auth_token()

    session = await manager.create_session(
        session_name,
        req.url,
        cookies=req.cookies,
        storage_state=req.storage_state,
        auth_token=auth_token,
    )

    # Set up console log capture for this session
    _setup_console_capture(session.session_id, session.page)

    # Register session in chat metadata store
    if req.chat_session_key:
        user_id = get_current_user()
        await _session_store.add_session(
            user_id=user_id,
            chat_session_key=req.chat_session_key,
            tab_id=session.session_id,
            session_name=session_name,
            url=req.url,
        )

    # Notify ALL connected frontend clients about the new session
    await _ws_manager.broadcast_all({
        "type": "session_started",
        "session_id": session.session_id,
        "session_name": session_name,
        "url": req.url,
        "created_at": session.created_at,
        "screencast_active": True,
    })

    return {
        "session_id": session.session_id,
        "session_name": session_name,
        "url": req.url,
    }


@router.post("/internal/browser/navigate", dependencies=[Depends(_verify_internal_request), Depends(_set_user_from_header)])
async def internal_browser_navigate(req: BrowserNavigateRequest) -> dict:
    """Navigate a session to a new URL."""
    page, session = _get_session_page(req.session_id)
    manager = _get_browser_manager()

    await page.goto(req.url, wait_until="domcontentloaded")
    session.url = req.url
    session.touch()

    await _emit_action_event(req.session_id, "browser_navigate", {"url": req.url})
    await _auto_screenshot(req.session_id, manager)

    title = await page.title()
    return {"url": req.url, "title": title}


@router.post("/internal/browser/snapshot", dependencies=[Depends(_verify_internal_request), Depends(_set_user_from_header)])
async def internal_browser_snapshot(req: BrowserSnapshotRequest) -> dict:
    """Get accessibility tree snapshot of the page with element refs."""
    page, session = _get_session_page(req.session_id)
    session.touch()

    snapshot_text = await page_snapshot(page)
    return {"snapshot": snapshot_text}


@router.post("/internal/browser/click")
async def internal_browser_click(req: BrowserClickRequest) -> dict:
    """Click an element identified by CSS selector or element ref."""
    page, session = _get_session_page(req.session_id)
    manager = _get_browser_manager()

    selector = await _resolve_selector(page, req.selector)
    await page.click(selector, timeout=10000)
    session.touch()

    await _emit_action_event(req.session_id, "browser_click", {"selector": req.selector})
    await _auto_screenshot(req.session_id, manager)

    return {"clicked": req.selector, "url_after": page.url}


@router.post("/internal/browser/type")
async def internal_browser_type(req: BrowserTypeRequest) -> dict:
    """Type text into an input field."""
    page, session = _get_session_page(req.session_id)
    manager = _get_browser_manager()

    selector = await _resolve_selector(page, req.selector)
    await page.fill(selector, req.text, timeout=10000)
    session.touch()

    if req.submit:
        await page.press(selector, "Enter")
        await page.wait_for_load_state("domcontentloaded", timeout=5000)

    await _emit_action_event(req.session_id, "browser_type", {
        "selector": req.selector,
        "text": req.text,
        "submit": req.submit,
    })
    await _auto_screenshot(req.session_id, manager)

    return {"typed": req.text, "into": req.selector, "submitted": req.submit}


@router.post("/internal/browser/press_key")
async def internal_browser_press_key(req: BrowserPressKeyRequest) -> dict:
    """Press a keyboard key."""
    page, session = _get_session_page(req.session_id)
    session.touch()

    await page.keyboard.press(req.key)

    await _emit_action_event(req.session_id, "browser_press_key", {"key": req.key})

    return {"key": req.key}


@router.post("/internal/browser/wait_for")
async def internal_browser_wait_for(req: BrowserWaitForRequest) -> dict:
    """Wait for a selector or text to appear on the page."""
    page, session = _get_session_page(req.session_id)
    session.touch()

    found = False
    timed_out = False

    try:
        if req.selector:
            resolved = await _resolve_selector(page, req.selector)
            await page.wait_for_selector(resolved, timeout=req.timeout_ms, state="visible")
            found = True
        elif req.text:
            await page.wait_for_function(
                f"document.body.innerText.includes({json.dumps(req.text)})",
                timeout=req.timeout_ms,
            )
            found = True
        else:
            await page.wait_for_load_state("networkidle", timeout=req.timeout_ms)
            found = True
    except Exception as e:
        if "Timeout" in type(e).__name__ or "timeout" in str(e).lower():
            timed_out = True
        else:
            raise HTTPException(status_code=500, detail=f"Wait failed: {e}")

    return {"found": found, "timeout": timed_out}


@router.post("/internal/browser/evaluate")
async def internal_browser_evaluate(req: BrowserEvaluateRequest) -> dict:
    """Evaluate JavaScript in the page context."""
    page, session = _get_session_page(req.session_id)
    session.touch()

    result = await page.evaluate(req.expression)
    return {"result": result}


@router.post("/internal/browser/screenshot")
async def internal_browser_screenshot(req: BrowserScreenshotRequest) -> dict:
    """Take a screenshot and save to workspace artifacts."""
    page, session = _get_session_page(req.session_id)
    session.touch()

    workspace_base = Path(get_workspace_base_path())
    user_id = get_current_user()
    screenshots_dir = workspace_base / user_id / "UI-Agent" / "screenshots"
    screenshots_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{req.session_id}_{int(time.time() * 1000)}.png"
    filepath = screenshots_dir / filename

    await page.screenshot(path=str(filepath), full_page=req.full_page)

    size_bytes = filepath.stat().st_size
    relative_path = f"{user_id}/UI-Agent/screenshots/{filename}"

    return {
        "path": relative_path,
        "size_bytes": size_bytes,
    }


@router.get("/internal/browser/console/{session_id}", dependencies=[Depends(_verify_internal_request), Depends(_set_user_from_header)])
async def internal_browser_console_logs(
    session_id: str,
    level: str = Query(default="all"),
) -> dict:
    """Get captured console log messages for a session."""
    logs = _console_logs.get(session_id, [])

    if level != "all":
        logs = [log for log in logs if log["level"] == level]

    return {"logs": logs, "count": len(logs)}


@router.post("/internal/browser/close")
async def internal_browser_close(req: BrowserCloseRequest) -> dict:
    """Close a browser session and stop screencast."""
    manager = _get_browser_manager()
    await manager.close_session(req.session_id)

    # Clean up console logs
    _console_logs.pop(req.session_id, None)

    # Notify ALL frontend clients about session closure
    await _ws_manager.broadcast_all({
        "type": "session_closed",
        "session_id": req.session_id,
    })

    return {"closed": req.session_id}


@router.get("/internal/browser/list")
async def internal_browser_list() -> dict:
    """List all active browser sessions."""
    manager = BrowserManager()
    sessions = await manager.list_sessions()
    return {"sessions": sessions, "count": len(sessions)}


@router.post("/internal/browser/record_test_step")
async def internal_record_test_step(req: RecordTestStepRequest) -> dict:
    """Record a test step with auto-screenshot."""
    page, session = _get_session_page(req.session_id)
    session.touch()

    # Take screenshot for this step
    workspace_base = Path(get_workspace_base_path())
    user_id = get_current_user()
    screenshots_dir = workspace_base / user_id / "UI-Agent" / "runs" / req.case_id / "screenshots"
    screenshots_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{req.step_name.replace(' ', '_')}_{int(time.time() * 1000)}.png"
    filepath = screenshots_dir / filename
    await page.screenshot(path=str(filepath))

    # Record step in memory
    step_data = {
        "case_id": req.case_id,
        "step_name": req.step_name,
        "status": req.status,
        "description": req.description,
        "screenshot": filename,
        "timestamp": time.time(),
    }
    _test_run_steps.setdefault(req.case_id, []).append(step_data)

    await _emit_action_event(req.session_id, "record_test_step", {
        "case_id": req.case_id,
        "step_name": req.step_name,
        "status": req.status,
    })

    relative_path = f"{user_id}/UI-Agent/runs/{req.case_id}/screenshots/{filename}"
    return {
        "recorded": True,
        "screenshot_path": relative_path,
    }


@router.post("/internal/browser/finalize_run")
async def internal_finalize_run(req: FinalizeRunRequest) -> dict:
    """Finalize a test run and generate HTML report from recorded steps."""
    workspace_base = Path(get_workspace_base_path())
    user_id = get_current_user()
    run_dir = workspace_base / user_id / "ui-testing" / "runs" / req.run_id
    screenshots_dir = run_dir / "screenshots"
    output_dir = run_dir / "report"
    screenshots_dir.mkdir(parents=True, exist_ok=True)

    # Build test_cases from recorded steps
    case_results: dict[str, dict] = {}
    for case_id, steps in _test_run_steps.items():
        case_results[case_id] = {
            "id": case_id,
            "name": case_id,
            "status": "pass",
            "steps": steps,
            "duration_ms": 0,
        }
        for step in steps:
            if step["status"] == "fail":
                case_results[case_id]["status"] = "fail"
                break

    test_cases = list(case_results.values())

    if not test_cases:
        test_cases = [{
            "id": req.run_id,
            "name": req.run_id,
            "status": "skip",
            "steps": [],
            "duration_ms": 0,
        }]

    report_path = await generate_html_report(
        run_id=req.run_id,
        test_cases=test_cases,
        screenshots_dir=screenshots_dir,
        output_dir=output_dir,
    )

    total = len(test_cases)
    passed = sum(1 for tc in test_cases if tc.get("status") == "pass")
    failed = sum(1 for tc in test_cases if tc.get("status") == "fail")
    skipped = sum(1 for tc in test_cases if tc.get("status") == "skip")

    # Clean up in-memory steps after finalization
    _test_run_steps.clear()

    relative_report = str(report_path.relative_to(workspace_base))
    return {
        "report_path": relative_report,
        "summary": {
            "total": total,
            "pass": passed,
            "fail": failed,
            "skip": skipped,
        },
    }
