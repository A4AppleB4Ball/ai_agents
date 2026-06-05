# MCP Tools Reference

This document provides a complete reference for all MCP browser tools available to the UI Testing Agent. These tools are exposed via the MCP Server (`agent/service/browser/mcp_server.py`) and invoked by the Claude Agent SDK during test execution.

## Overview

The tools are namespaced under `mcp__browser_tools__` when called from the agent. The MCP Server runs as a stdio subprocess and forwards tool calls to the backend internal API at `http://localhost:8010/agent/v1/internal/browser/*`.

## Session Management Tools

### browser_open

Open a new browser tab, navigate to a URL, and begin live screencast streaming.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | URL to navigate to (e.g., `https://www.google.com`) |
| `session_name` | string | No | Human-readable name for this browser tab |
| `chat_session_key` | string | No | Chat session key to associate this browser tab with |

**Returns:**
```json
{
  "status": "ok",
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "session_name": "session-1717500000",
  "url": "https://www.google.com"
}
```

**Behavior:**
- Launches browser lazily if not already running
- Creates a new BrowserContext with 1280x720 viewport
- Starts CDP screencast streaming immediately
- Starts CDP event listeners for navigation/load/console events
- Navigates to the URL (waits for `domcontentloaded`)

**Errors:**
- `RuntimeError`: Maximum concurrent sessions reached
- `RuntimeError`: Browser launch failure (missing Chromium, insufficient resources)

**Example:**
```
browser_open(url="https://www.google.com", session_name="google-search-test")
```

---

### browser_navigate

Navigate an existing browser tab to a new URL.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session_id` | string | Yes | The session_id from `browser_open` |
| `url` | string | Yes | URL to navigate to |

**Returns:**
```json
{
  "status": "ok",
  "url": "https://www.google.com/search?q=test"
}
```

**Behavior:**
- Navigates the existing page to the new URL
- Waits for `domcontentloaded` state
- Screencast frames update to show the new page

**Errors:**
- `KeyError`: Session not found (invalid or expired `session_id`)
- `TimeoutError`: Navigation timed out

**Example:**
```
browser_navigate(session_id="abc-123", url="https://www.google.com/search?q=playwright")
```

---

### browser_close

Close a browser tab and stop its screencast stream.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session_id` | string | Yes | The session_id from `browser_open` |

**Returns:**
```json
{
  "status": "ok",
  "session_id": "abc-123",
  "message": "Session closed successfully"
}
```

**Behavior:**
- Stops the ScreencastStream (sends `Page.stopScreencast` to CDP)
- Stops the CDPEventListener
- Closes the BrowserContext (releases all page resources)
- Removes the session from the registry

**Errors:**
- Silent on already-closed sessions (idempotent)

**Example:**
```
browser_close(session_id="abc-123")
```

---

### browser_list

List all active browser sessions/tabs.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| (none) | - | - | - |

**Returns:**
```json
{
  "status": "ok",
  "sessions": [
    {
      "session_id": "abc-123",
      "session_name": "google-search",
      "url": "https://www.google.com",
      "created_at": 1717500000.0,
      "screencast_active": true,
      "idle_seconds": 12
    }
  ],
  "count": 1
}
```

**Behavior:**
- Returns metadata for all sessions currently in the registry
- Does not modify any session state

**Example:**
```
browser_list()
```

---

## Page Interaction Tools

### browser_snapshot

Get an accessibility tree snapshot of the current page.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session_id` | string | Yes | The session_id from `browser_open` |

**Returns:**
```json
{
  "status": "ok",
  "snapshot": "Page: https://www.google.com\nTitle: Google\nElements: 6\n----\n[ref=e1] heading \"Google\" level=1\n[ref=e2] textbox \"Search\" [focused]\n[ref=e3] button \"Google Search\"\n[ref=e4] button \"I'm Feeling Lucky\"\n[ref=e5] link \"Gmail\"\n[ref=e6] link \"Images\""
}
```

**Behavior:**
- Evaluates JavaScript in the page to extract all interactive elements and landmarks
- Assigns sequential refs (`e1`, `e2`, ...) to each element
- Builds CSS selectors for each element using available attributes (id, data-testid, aria-label, name, or structural path)
- Reports ARIA states (focused, disabled, checked, expanded, etc.)
- Skips elements that are not visible (display:none, zero dimensions)

**Important notes:**
- Refs are **ephemeral**: they change between snapshots
- CSS selectors built from IDs/attributes are stable across snapshots
- Use snapshot before every interaction to understand current page state

**Errors:**
- `KeyError`: Session not found
- `RuntimeError`: JavaScript evaluation failure (page crashed or navigating)

**Example:**
```
browser_snapshot(session_id="abc-123")
```

---

### browser_click

Click on an element in the browser.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session_id` | string | Yes | The session_id from `browser_open` |
| `selector` | string | Yes | CSS selector or ref for the element to click |

**Returns:**
```json
{
  "status": "ok",
  "selector": "textarea[name=\"q\"]"
}
```

**Behavior:**
- If the selector is a ref (e.g., `e3`), resolves it to the actual CSS selector by re-running the snapshot JS
- Waits for the element to be visible and enabled
- Scrolls to the element if needed
- Performs a click action
- May trigger navigation, form submission, or other page changes

**Errors:**
- `KeyError`: Session not found
- `ValueError`: Ref not found on page (stale ref from old snapshot)
- `TimeoutError`: Element not found or not clickable within timeout

**Example:**
```
browser_click(session_id="abc-123", selector="e3")
browser_click(session_id="abc-123", selector="button[name='btnK']")
browser_click(session_id="abc-123", selector="#login-btn")
```

---

### browser_type

Type text into an input field with optional form submission.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session_id` | string | Yes | The session_id from `browser_open` |
| `selector` | string | Yes | CSS selector or ref for the input field |
| `text` | string | Yes | Text to type into the field |
| `submit` | boolean | No | If true, press Enter after typing (default: `false`) |

**Returns:**
```json
{
  "status": "ok",
  "selector": "textarea[name=\"q\"]",
  "text": "Playwright browser automation",
  "submitted": true
}
```

**Behavior:**
- Resolves ref to CSS selector if needed
- Clicks the element first to focus it
- Clears any existing value
- Types the text character by character (simulates real keystrokes)
- Optionally presses Enter to submit

**Errors:**
- `KeyError`: Session not found
- `ValueError`: Ref not found on page
- `TimeoutError`: Element not found or not editable

**Example:**
```
browser_type(session_id="abc-123", selector="e2", text="OpenAI ChatGPT", submit=true)
browser_type(session_id="abc-123", selector="input[name='username']", text="admin")
```

---

### browser_press_key

Press a keyboard key or key combination.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session_id` | string | Yes | The session_id from `browser_open` |
| `key` | string | Yes | Key to press (e.g., `Enter`, `Tab`, `Escape`, `ArrowDown`, `Control+a`) |

**Returns:**
```json
{
  "status": "ok",
  "key": "Enter"
}
```

**Behavior:**
- Presses the specified key on the currently focused element
- Supports modifier combinations (e.g., `Control+a`, `Shift+Tab`)
- Uses Playwright key names (same as `KeyboardEvent.key`)

**Common keys:**
- Navigation: `Enter`, `Tab`, `Escape`, `Backspace`, `Delete`
- Arrows: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`
- Modifiers: `Control+a` (select all), `Control+c` (copy), `Control+v` (paste)
- Function keys: `F1` through `F12`

**Errors:**
- `KeyError`: Session not found

**Example:**
```
browser_press_key(session_id="abc-123", key="Enter")
browser_press_key(session_id="abc-123", key="Control+a")
browser_press_key(session_id="abc-123", key="Escape")
```

---

### browser_wait_for

Wait for a selector to appear or for specific text content on the page.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session_id` | string | Yes | The session_id from `browser_open` |
| `selector` | string | No | CSS selector to wait for |
| `text` | string | No | Text content to wait for on the page |
| `timeout_ms` | integer | No | Maximum wait time in milliseconds (default: `10000`) |

**Returns:**
```json
{
  "status": "ok",
  "selector": "div#search",
  "waited_ms": 1250
}
```

**Behavior:**
- At least one of `selector` or `text` must be provided
- Waits until the element/text is present in the DOM and visible
- Returns immediately if already present
- Times out with an error if not found within `timeout_ms`

**Errors:**
- `KeyError`: Session not found
- `TimeoutError`: Element/text not found within timeout

**Example:**
```
browser_wait_for(session_id="abc-123", selector="div#search")
browser_wait_for(session_id="abc-123", text="Results", timeout_ms=5000)
browser_wait_for(session_id="abc-123", selector=".dashboard-loaded", timeout_ms=15000)
```

---

### browser_evaluate

Execute a JavaScript expression in the browser and return the result.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session_id` | string | Yes | The session_id from `browser_open` |
| `expression` | string | Yes | JavaScript expression to evaluate |

**Returns:**
```json
{
  "status": "ok",
  "result": "OpenAI ChatGPT - Google Search"
}
```

**Behavior:**
- Evaluates the expression in the page's main frame context
- Returns the evaluated value serialized as JSON
- Can access the full DOM, window, and document objects
- Useful for assertions, data extraction, and page state verification

**Errors:**
- `KeyError`: Session not found
- `RuntimeError`: JavaScript execution error (syntax error, reference error, etc.)

**Example:**
```
browser_evaluate(session_id="abc-123", expression="document.title")
browser_evaluate(session_id="abc-123", expression="document.querySelectorAll('#search .g').length")
browser_evaluate(session_id="abc-123", expression="window.location.href")
browser_evaluate(session_id="abc-123", expression="JSON.stringify(performance.timing)")
```

---

## Evidence and Reporting Tools

### browser_screenshot

Take a screenshot of the current page and save it to artifacts.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session_id` | string | Yes | The session_id from `browser_open` |
| `full_page` | boolean | No | If true, capture the full scrollable page (default: `false`) |

**Returns:**
```json
{
  "status": "ok",
  "path": "data/workspace/user123/ui-testing/runs/run-001/screenshots/screenshot-1717500000.png",
  "size_bytes": 145920
}
```

**Behavior:**
- Captures a PNG screenshot of the current viewport (or full page if `full_page=true`)
- Saves to the workspace artifacts directory
- Returns the file path for reference

**Errors:**
- `KeyError`: Session not found
- `RuntimeError`: Screenshot capture failure (page navigating, browser crashed)

**Example:**
```
browser_screenshot(session_id="abc-123")
browser_screenshot(session_id="abc-123", full_page=true)
```

---

### browser_console_logs

Get captured console log messages from the browser.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session_id` | string | Yes | The session_id from `browser_open` |
| `level` | string | No | Filter by log level: `all`, `error`, `warning`, `info` (default: `all`) |

**Returns:**
```json
{
  "status": "ok",
  "logs": [
    {"level": "error", "text": "Uncaught TypeError: Cannot read property 'x' of null", "timestamp": 1717500000.0},
    {"level": "warning", "text": "Deprecated API usage", "timestamp": 1717500001.0}
  ],
  "count": 2
}
```

**Behavior:**
- Returns console messages captured since the session was created
- Filters by level if specified
- Useful for detecting JavaScript errors that indicate UI failures

**Errors:**
- `KeyError`: Session not found

**Example:**
```
browser_console_logs(session_id="abc-123")
browser_console_logs(session_id="abc-123", level="error")
```

---

### record_test_step

Record a test step with an auto-screenshot for evidence.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session_id` | string | Yes | The session_id of the browser being tested |
| `case_id` | string | Yes | Test case identifier (e.g., `tc-001`) |
| `step_name` | string | Yes | Name of the test step |
| `status` | string | Yes | Result status: `pass`, `fail`, or `skip` |
| `description` | string | No | Optional description of what was verified |

**Returns:**
```json
{
  "status": "ok",
  "case_id": "tc-001",
  "step_name": "Clicked search button",
  "step_status": "pass",
  "screenshot": "screenshots/tc-001-step-3-1717500000.png"
}
```

**Behavior:**
- Automatically captures a screenshot at the moment of recording
- Associates the step with the given `case_id` for report grouping
- Accumulates results for the test run (used by `finalize_run`)
- Stores screenshots in the run's artifacts directory

**Errors:**
- `KeyError`: Session not found

**Example:**
```
record_test_step(
    session_id="abc-123",
    case_id="tc-001",
    step_name="Search results loaded",
    status="pass",
    description="Found 10 results matching the query"
)

record_test_step(
    session_id="abc-123",
    case_id="tc-002",
    step_name="Verify result count >= 5",
    status="fail",
    description="Expected at least 5 results, found 0"
)
```

---

### finalize_run

Finalize a test run and generate an HTML report from recorded steps.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `run_id` | string | Yes | Unique identifier for the test run |
| `summary` | string | No | Optional summary description of the test run |

**Returns:**
```json
{
  "status": "ok",
  "run_id": "run-001",
  "report_path": "data/workspace/user123/ui-testing/runs/run-001/report/report.html",
  "summary": {
    "total": 3,
    "passed": 2,
    "failed": 1
  }
}
```

**Behavior:**
- Collects all recorded test steps for the given `run_id`
- Generates a self-contained HTML report with:
  - Summary bar (total, passed, failed, skipped, duration)
  - Per-test-case result cards
  - Inline screenshots (base64 encoded)
  - Error details for failed steps
- Also generates a `report.json` for programmatic access
- Outputs files to `{workspace}/ui-testing/runs/{run_id}/report/`

**Errors:**
- `RuntimeError`: Report generation failure (file system error)

**Example:**
```
finalize_run(run_id="run-001", summary="Google Search regression suite")
```

---

## Session Management Patterns

### Single Session Workflow

The most common pattern for sequential testing:

```
session_id = browser_open(url="https://target.com", session_name="test")
browser_snapshot(session_id)
browser_click(session_id, selector="...")
browser_wait_for(session_id, selector="...")
record_test_step(session_id, case_id="tc-001", step_name="...", status="pass")
browser_close(session_id)
finalize_run(run_id="run-001")
```

### Multi-Session Workflow

For testing multiple sites or parallel flows:

```
session_a = browser_open(url="https://site-a.com", session_name="site-a")
session_b = browser_open(url="https://site-b.com", session_name="site-b")

browser_snapshot(session_a)
browser_click(session_a, selector="...")

browser_snapshot(session_b)
browser_type(session_b, selector="...", text="...")

browser_close(session_a)
browser_close(session_b)
```

### Error Recovery Pattern

When an action fails, capture evidence and continue:

```
try:
    browser_click(session_id, selector="#nonexistent")
except:
    record_test_step(session_id, case_id="tc-001", step_name="Click submit", status="fail")
    browser_screenshot(session_id)  # Capture state for debugging
    browser_console_logs(session_id, level="error")  # Check for JS errors
```

## Timeout Configuration

The MCP Server uses a 60-second HTTP timeout for backend calls. Individual tool timeouts:

| Tool | Default Timeout | Configurable |
|------|----------------|--------------|
| `browser_open` | 30s (navigation) | No |
| `browser_navigate` | 30s (navigation) | No |
| `browser_wait_for` | 10000ms | Yes (`timeout_ms` parameter) |
| `browser_click` | 30s (element wait) | No |
| `browser_type` | 30s (element wait) | No |
| `browser_evaluate` | 30s | No |
| `browser_screenshot` | 30s | No |
