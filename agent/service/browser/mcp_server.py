"""
MCP Server for Semantic Browser Tools.

Exposes high-level browser automation tools that the Claude Agent SDK can invoke.
Runs as a stdio subprocess and communicates with the main FastAPI backend via
local HTTP calls to access the shared BrowserManager (same Chromium instance
used for screencast streaming).

Run via: python -m agent.service.browser.mcp_server
"""

import asyncio
import json
import sys
from pathlib import Path

import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

BACKEND_BASE_URL = "http://localhost:8010/agent/v1/internal/browser"

app = Server("browser-semantic-tools")


def _tool_definitions() -> list[Tool]:
    """Define all semantic browser tools."""
    return [
        Tool(
            name="browser_open",
            description=(
                "Open a new browser tab, navigate to a URL, and begin live screencast streaming. "
                "Returns a session_id that must be used for all subsequent browser operations."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "URL to navigate to (e.g., https://www.google.com)",
                    },
                    "session_name": {
                        "type": "string",
                        "description": "Optional human-readable name for this browser tab",
                    },
                    "chat_session_key": {
                        "type": "string",
                        "description": "Chat session key to associate this browser tab with",
                    },
                    "cookies": {
                        "type": "array",
                        "description": "Optional cookies to inject for authenticated access to internal sites",
                        "items": {"type": "object"},
                    },
                    "auth_token": {
                        "type": "string",
                        "description": "Optional Bearer token for Authorization header on all requests",
                    },
                },
                "required": ["url"],
            },
        ),
        Tool(
            name="browser_navigate",
            description="Navigate an existing browser tab to a new URL.",
            inputSchema={
                "type": "object",
                "properties": {
                    "session_id": {
                        "type": "string",
                        "description": "The session_id from browser_open",
                    },
                    "url": {
                        "type": "string",
                        "description": "URL to navigate to",
                    },
                },
                "required": ["session_id", "url"],
            },
        ),
        Tool(
            name="browser_snapshot",
            description=(
                "Get an accessibility tree snapshot of the current page. "
                "Shows all interactive elements with refs that can be used as selectors. "
                "Use this to understand the page structure before clicking or typing."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "session_id": {
                        "type": "string",
                        "description": "The session_id from browser_open",
                    },
                },
                "required": ["session_id"],
            },
        ),
        Tool(
            name="browser_click",
            description=(
                "Click on an element in the browser. Use CSS selectors from browser_snapshot."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "session_id": {
                        "type": "string",
                        "description": "The session_id from browser_open",
                    },
                    "selector": {
                        "type": "string",
                        "description": "CSS selector for the element to click",
                    },
                },
                "required": ["session_id", "selector"],
            },
        ),
        Tool(
            name="browser_type",
            description=(
                "Type text into an input field. Optionally press Enter after typing."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "session_id": {
                        "type": "string",
                        "description": "The session_id from browser_open",
                    },
                    "selector": {
                        "type": "string",
                        "description": "CSS selector for the input field",
                    },
                    "text": {
                        "type": "string",
                        "description": "Text to type into the field",
                    },
                    "submit": {
                        "type": "boolean",
                        "description": "If true, press Enter after typing",
                        "default": False,
                    },
                },
                "required": ["session_id", "selector", "text"],
            },
        ),
        Tool(
            name="browser_press_key",
            description="Press a keyboard key (e.g., Enter, Tab, Escape, ArrowDown).",
            inputSchema={
                "type": "object",
                "properties": {
                    "session_id": {
                        "type": "string",
                        "description": "The session_id from browser_open",
                    },
                    "key": {
                        "type": "string",
                        "description": "Key to press (e.g., Enter, Tab, Escape, ArrowDown, Control+a)",
                    },
                },
                "required": ["session_id", "key"],
            },
        ),
        Tool(
            name="browser_wait_for",
            description=(
                "Wait for a selector to appear or for the page to reach a load state."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "session_id": {
                        "type": "string",
                        "description": "The session_id from browser_open",
                    },
                    "selector": {
                        "type": "string",
                        "description": "CSS selector to wait for (optional if using text)",
                    },
                    "text": {
                        "type": "string",
                        "description": "Text content to wait for on the page",
                    },
                    "timeout_ms": {
                        "type": "integer",
                        "description": "Maximum time to wait in milliseconds (default: 10000)",
                        "default": 10000,
                    },
                },
                "required": ["session_id"],
            },
        ),
        Tool(
            name="browser_evaluate",
            description="Execute a JavaScript expression in the browser and return the result.",
            inputSchema={
                "type": "object",
                "properties": {
                    "session_id": {
                        "type": "string",
                        "description": "The session_id from browser_open",
                    },
                    "expression": {
                        "type": "string",
                        "description": "JavaScript expression to evaluate (e.g., document.title)",
                    },
                },
                "required": ["session_id", "expression"],
            },
        ),
        Tool(
            name="browser_screenshot",
            description="Take a screenshot of the current page and save it to artifacts.",
            inputSchema={
                "type": "object",
                "properties": {
                    "session_id": {
                        "type": "string",
                        "description": "The session_id from browser_open",
                    },
                    "full_page": {
                        "type": "boolean",
                        "description": "If true, capture the full scrollable page",
                        "default": False,
                    },
                },
                "required": ["session_id"],
            },
        ),
        Tool(
            name="browser_console_logs",
            description="Get captured console log messages from the browser.",
            inputSchema={
                "type": "object",
                "properties": {
                    "session_id": {
                        "type": "string",
                        "description": "The session_id from browser_open",
                    },
                    "level": {
                        "type": "string",
                        "description": "Filter by log level: all, error, warning, info",
                        "default": "all",
                    },
                },
                "required": ["session_id"],
            },
        ),
        Tool(
            name="browser_close",
            description="Close a browser tab and stop its screencast stream.",
            inputSchema={
                "type": "object",
                "properties": {
                    "session_id": {
                        "type": "string",
                        "description": "The session_id from browser_open",
                    },
                },
                "required": ["session_id"],
            },
        ),
        Tool(
            name="browser_list",
            description="List all active browser sessions/tabs.",
            inputSchema={
                "type": "object",
                "properties": {},
            },
        ),
        Tool(
            name="record_test_step",
            description=(
                "Record a test step with an auto-screenshot. "
                "Use this during test execution to capture step results."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "session_id": {
                        "type": "string",
                        "description": "The session_id of the browser being tested",
                    },
                    "case_id": {
                        "type": "string",
                        "description": "Test case identifier",
                    },
                    "step_name": {
                        "type": "string",
                        "description": "Name of the test step",
                    },
                    "status": {
                        "type": "string",
                        "enum": ["pass", "fail", "skip"],
                        "description": "Result status of the step",
                    },
                    "description": {
                        "type": "string",
                        "description": "Optional description of what was verified",
                    },
                },
                "required": ["session_id", "case_id", "step_name", "status"],
            },
        ),
        Tool(
            name="finalize_run",
            description=(
                "Finalize a test run and generate an HTML report from recorded steps."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "run_id": {
                        "type": "string",
                        "description": "Unique identifier for the test run",
                    },
                    "summary": {
                        "type": "string",
                        "description": "Optional summary description of the test run",
                    },
                },
                "required": ["run_id"],
            },
        ),
    ]


async def _call_backend(endpoint: str, method: str = "POST", payload: dict = None) -> dict:
    """Call the backend internal browser API endpoint.

    Args:
        endpoint: Path relative to the internal browser API base (e.g., '/open').
        method: HTTP method (POST or GET).
        payload: JSON body for POST requests.

    Returns:
        Parsed JSON response dict.

    Raises:
        RuntimeError: If the backend returns an error.
    """
    import os
    url = f"{BACKEND_BASE_URL}{endpoint}"
    headers = {}
    user_email = os.environ.get("BROWSER_MCP_USER_EMAIL", "")
    if user_email:
        headers["X-User-Email"] = user_email

    async with httpx.AsyncClient(timeout=60.0) as client:
        if method == "GET":
            response = await client.get(url, headers=headers)
        else:
            response = await client.post(url, json=payload or {}, headers=headers)

        if response.status_code != 200:
            error_detail = response.text
            raise RuntimeError(
                f"Backend returned {response.status_code} for {endpoint}: {error_detail}"
            )

        return response.json()


@app.list_tools()
async def list_tools() -> list[Tool]:
    return _tool_definitions()


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Route tool calls to the appropriate backend endpoint."""
    result = await _dispatch_tool(name, arguments)
    return [TextContent(type="text", text=json.dumps(result, indent=2))]


async def _dispatch_tool(name: str, arguments: dict) -> dict:
    """Dispatch a tool call to the backend internal API."""
    if name == "browser_open":
        payload = {
            "url": arguments["url"],
            "session_name": arguments.get("session_name"),
            "chat_session_key": arguments.get("chat_session_key"),
        }
        if arguments.get("cookies"):
            payload["cookies"] = arguments["cookies"]
        if arguments.get("auth_token"):
            payload["auth_token"] = arguments["auth_token"]
        return await _call_backend("/open", payload=payload)

    elif name == "browser_navigate":
        return await _call_backend("/navigate", payload={
            "session_id": arguments["session_id"],
            "url": arguments["url"],
        })

    elif name == "browser_snapshot":
        return await _call_backend("/snapshot", payload={
            "session_id": arguments["session_id"],
        })

    elif name == "browser_click":
        return await _call_backend("/click", payload={
            "session_id": arguments["session_id"],
            "selector": arguments["selector"],
        })

    elif name == "browser_type":
        return await _call_backend("/type", payload={
            "session_id": arguments["session_id"],
            "selector": arguments["selector"],
            "text": arguments["text"],
            "submit": arguments.get("submit", False),
        })

    elif name == "browser_press_key":
        return await _call_backend("/press_key", payload={
            "session_id": arguments["session_id"],
            "key": arguments["key"],
        })

    elif name == "browser_wait_for":
        return await _call_backend("/wait_for", payload={
            "session_id": arguments["session_id"],
            "selector": arguments.get("selector"),
            "text": arguments.get("text"),
            "timeout_ms": arguments.get("timeout_ms", 10000),
        })

    elif name == "browser_evaluate":
        return await _call_backend("/evaluate", payload={
            "session_id": arguments["session_id"],
            "expression": arguments["expression"],
        })

    elif name == "browser_screenshot":
        return await _call_backend("/screenshot", payload={
            "session_id": arguments["session_id"],
            "full_page": arguments.get("full_page", False),
        })

    elif name == "browser_console_logs":
        session_id = arguments["session_id"]
        level = arguments.get("level", "all")
        return await _call_backend(
            f"/console/{session_id}?level={level}", method="GET"
        )

    elif name == "browser_close":
        return await _call_backend("/close", payload={
            "session_id": arguments["session_id"],
        })

    elif name == "browser_list":
        return await _call_backend("/list", method="GET")

    elif name == "record_test_step":
        return await _call_backend("/record_test_step", payload={
            "session_id": arguments["session_id"],
            "case_id": arguments["case_id"],
            "step_name": arguments["step_name"],
            "status": arguments["status"],
            "description": arguments.get("description"),
        })

    elif name == "finalize_run":
        return await _call_backend("/finalize_run", payload={
            "run_id": arguments["run_id"],
            "summary": arguments.get("summary"),
        })

    else:
        raise ValueError(f"Unknown tool: {name}")


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
