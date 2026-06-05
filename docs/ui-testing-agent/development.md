# Development

This guide covers how to extend the UI Testing Agent: adding new MCP tools, creating workflow sites, modifying frontend components, testing locally, and debugging common issues.

## Adding New MCP Browser Tools

To add a new browser tool that the agent can invoke:

### Step 1: Define the Tool in the MCP Server

**File:** `agent/service/browser/mcp_server.py`

Add a new `Tool` entry to the `_tool_definitions()` function:

```python
Tool(
    name="browser_scroll",
    description="Scroll the page by a specified amount or to an element.",
    inputSchema={
        "type": "object",
        "properties": {
            "session_id": {
                "type": "string",
                "description": "The session_id from browser_open",
            },
            "direction": {
                "type": "string",
                "enum": ["up", "down"],
                "description": "Scroll direction",
            },
            "amount": {
                "type": "integer",
                "description": "Pixels to scroll (default: 500)",
                "default": 500,
            },
        },
        "required": ["session_id", "direction"],
    },
),
```

### Step 2: Add Dispatch Logic

In the same file, add an `elif` branch to `_dispatch_tool()`:

```python
elif name == "browser_scroll":
    return await _call_backend("/scroll", payload={
        "session_id": arguments["session_id"],
        "direction": arguments["direction"],
        "amount": arguments.get("amount", 500),
    })
```

### Step 3: Implement the Backend Handler

Create or update a handler in `agent/service/browser/tools.py`:

```python
async def handle_browser_scroll(session_id: str, direction: str, amount: int = 500) -> dict:
    """Scroll the page in the specified direction.

    Args:
        session_id: Target browser session.
        direction: "up" or "down".
        amount: Pixels to scroll.

    Returns:
        Dict confirming the scroll action.
    """
    manager = BrowserManager()
    session = manager.registry.get(session_id)

    delta = amount if direction == "down" else -amount
    await session.page.evaluate(f"window.scrollBy(0, {delta})")

    return {
        "status": "ok",
        "direction": direction,
        "amount": amount,
    }
```

### Step 4: Add the Internal API Route

Add the endpoint in the internal router (the router handling `/internal/browser/*` paths):

```python
@internal_router.post("/scroll")
async def browser_scroll(request: BrowserScrollRequest) -> dict:
    return await handle_browser_scroll(
        session_id=request.session_id,
        direction=request.direction,
        amount=request.amount,
    )
```

### Step 5: Register in Agent Config

Add the tool to the `allowed_tools` list in `data/agents/UI-Agent/agent.json`:

```json
"allowed_tools": [
    ...
    "mcp__browser_tools__browser_scroll"
]
```

### Step 6: Update the Skill Documentation

Add the tool to the tool reference table in `data/agents/UI-Agent/skills/ui-testing/SKILL.md`.

---

## Adding New Workflow Sites

### Step 1: Create the Folder

Derive the slug from the hostname:
- `https://app.example.com` -> `app-example-com`

```bash
mkdir -p data/agents/UI-Agent/skills/ui-testing/workflows/app-example-com
```

### Step 2: Create workflow.md

```markdown
---
site: https://app.example.com
name: Example App
description: SaaS application dashboard with user management
auth: sso
preconditions:
  - User authenticated via Azure AD SSO
  - Application deployed to staging environment
---

# Example App Test Workflow

## Test Cases

### tc-001: Dashboard Load
**Goal:** Verify dashboard renders correctly after login
**Priority:** critical

**Steps:**
1. Navigate to `https://app.example.com`
2. Wait for SSO redirect to complete
3. Wait for dashboard selector to appear
4. Verify metric cards are visible
5. Capture screenshot

**Pass criteria:**
- URL contains `/dashboard`
- At least 3 metric cards are visible
- No JavaScript errors in console
```

### Step 3: Document Selectors

Create `selectors.md` by inspecting the application:

```markdown
# Example App - Selectors

## Dashboard

| Element | Selector | Notes |
|---------|----------|-------|
| Metric cards | `[data-testid="metric-card"]` | KPI cards grid |
| Navigation | `nav[aria-label="Main"]` | Side navigation |
| User menu | `button[aria-label="User menu"]` | Profile dropdown |
```

### Step 4: Add Test Data

Create `test-data.md`:

```markdown
# Example App - Test Data

## Timing Expectations

| Action | Max wait |
|--------|----------|
| SSO redirect | 10s |
| Dashboard load | 8s |
| API data fetch | 5s |
```

### Step 5: Create Pages Map

Create `pages.md`:

```markdown
# Example App - Page Map

## Pages

### Dashboard
- **URL:** `https://app.example.com/dashboard`
- **Purpose:** Main overview
- **Key elements:** Metric cards, activity feed, navigation
```

### Step 6: Initialize Knowledge

Create `knowledge.md`:

```markdown
# Example App - Knowledge Base

## Known Issues

(To be updated after first run)

## Timing Notes

(To be updated after first run)
```

### Step 7: Test the Workflow

Start a chat with the UI-Agent and say:
```
Test app.example.com
```

The agent should detect the workflow folder and load the test plan.

---

## Modifying the Frontend Panel

### Adding a New Component to BrowserPanel

1. Create the component file:

```
web/src/features/ui-agent/components/my-new-panel.tsx
```

2. Import and add to the BrowserPanel render logic in `browser-panel.tsx`:

```typescript
import { MyNewPanel } from "@/features/ui-agent/components/my-new-panel";

// In the content area:
{panelMode === "my-mode" && <MyNewPanel />}
```

3. Update the `PanelMode` type in `types/browser.ts`:

```typescript
export type PanelMode = "live" | "report" | "history" | "my-mode";
```

4. Add the tab in `browser-panel.tsx`:

```typescript
const MODE_TABS = [
  ...existing,
  { id: "my-mode", label: "My Mode", icon: SomeIcon },
];
```

### Adding New Store State

Extend the Zustand store in `store/browser-store.ts`:

```typescript
export interface BrowserStoreState {
  // ... existing state
  myNewData: string | null;
  setMyNewData: (data: string | null) => void;
}

// In the create() call:
myNewData: null,
setMyNewData: (data: string | null) => {
  set({ myNewData: data });
},
```

### Handling New WebSocket Message Types

In `hooks/use-browser-websocket.ts`, extend the `onmessage` handler:

```typescript
ws.onmessage = (event: MessageEvent) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    // ... existing cases
    case "my_new_event": {
      // Handle new event type
      setMyNewData(message.data);
      break;
    }
  }
};
```

Also update the `BrowserWsMessage` union type in `types/browser.ts`.

---

## Testing the Browser Service Locally

### Running the MCP Server Standalone

You can test the MCP Server independently:

```bash
# Start the backend first
python -m agent.main

# In another terminal, test the MCP server directly
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | python -m agent.service.browser.mcp_server
```

### Testing Browser Operations via REST

With the backend running and `DISABLE_AUTH=true`:

```python
import requests

# Open a browser session
response = requests.post("http://localhost:8010/agent/v1/internal/browser/open", json={
    "url": "https://www.google.com",
    "session_name": "test-session"
})
session_id = response.json()["session_id"]

# Take a snapshot
response = requests.post("http://localhost:8010/agent/v1/internal/browser/snapshot", json={
    "session_id": session_id
})
print(response.json()["snapshot"])

# Click an element
response = requests.post("http://localhost:8010/agent/v1/internal/browser/click", json={
    "session_id": session_id,
    "selector": "textarea[name='q']"
})

# Close the session
response = requests.post("http://localhost:8010/agent/v1/internal/browser/close", json={
    "session_id": session_id
})
```

### Testing the Browser WebSocket

Using Python:

```python
import asyncio
import json
import websockets

async def test_browser_ws():
    uri = "ws://localhost:8010/agent/v1/browser/ws"
    async with websockets.connect(uri) as ws:
        # Subscribe to a session
        await ws.send(json.dumps({
            "type": "subscribe",
            "session_ids": ["your-session-id"]
        }))

        # Listen for frames
        while True:
            msg = json.loads(await ws.recv())
            if msg["type"] == "frame":
                print(f"Frame received: {len(msg['data'])} bytes")
            elif msg["type"] == "action":
                print(f"Action: {msg['action']} -> {msg['detail']}")

asyncio.run(test_browser_ws())
```

### Running Headed for Visual Debugging

```bash
export BROWSER_HEADLESS=false
python -m agent.main
```

You can then see the actual Chromium browser window as the agent interacts with it. Combined with the screencast in the frontend, this gives dual visibility.

---

## Common Issues and Debugging

### Browser fails to launch

**Symptoms:** `RuntimeError: Browser launch failure` or Playwright timeout on start.

**Causes and fixes:**
1. Missing Chromium dependencies:
   ```bash
   playwright install-deps chromium
   ```
2. Insufficient `/dev/shm` in Docker:
   ```yaml
   shm_size: '2gb'
   ```
3. Missing `--no-sandbox` flag (required in Docker):
   ```env
   BROWSER_CHROMIUM_ARGS=--no-sandbox,--disable-dev-shm-usage,--disable-gpu
   ```

### Screencast frames not arriving

**Symptoms:** Frontend shows "Waiting for browser session..." even though sessions are active.

**Debugging steps:**
1. Check WebSocket connection: Look for green dot in the browser panel header
2. Verify subscription: Open browser DevTools Network tab and inspect WebSocket messages
3. Check backend logs for `"Screencast started for session:"` messages
4. Verify the session_id matches between subscribe message and active sessions

### Session cleanup not working

**Symptoms:** Sessions persist beyond the timeout, or "Maximum concurrent sessions" error appears prematurely.

**Debugging:**
1. Check `BROWSER_SESSION_TIMEOUT` value
2. Verify the cleanup loop is running: look for `"Closing idle session:"` in logs
3. Check if `touch()` is being called inadvertently (keeping sessions alive)
4. Manually close sessions via REST:
   ```python
   requests.post("http://localhost:8010/agent/v1/internal/browser/close", json={"session_id": "..."})
   ```

### MCP Server connection errors

**Symptoms:** Agent tool calls fail with `Backend returned 5XX` errors.

**Debugging:**
1. Ensure backend is running on port 8010
2. Check if the internal browser routes are registered:
   ```bash
   curl http://localhost:8010/agent/v1/internal/browser/list
   ```
3. Verify the MCP Server can reach localhost:8010 (no network isolation issues)
4. Check for `httpx` timeout errors in MCP Server stderr

### Snapshot returns empty

**Symptoms:** `browser_snapshot` returns "(empty page - no interactive elements found)"

**Causes:**
1. Page has not finished loading yet - add `browser_wait_for` before snapshot
2. Page uses Shadow DOM heavily - the snapshot JS only traverses regular DOM
3. Page is displaying an error or blank state
4. JavaScript evaluation failed - check page for CSP restrictions

### WebSocket auto-reconnect loops

**Symptoms:** Frontend rapidly reconnects to WebSocket, showing "Connected"/"Disconnected" oscillation.

**Debugging:**
1. Check backend logs for authentication errors (`Browser WS auth failed`)
2. Verify token is valid and not expired
3. Check if server is overloaded (connection immediately dropped)
4. Look for `4001` close code in DevTools (authentication rejection)

### Report generation fails

**Symptoms:** `finalize_run` returns an error about file system operations.

**Debugging:**
1. Check write permissions on workspace directory
2. Verify the path exists: `{workspace}/ui-testing/runs/`
3. Check disk space
4. Look for `"Error generating report:"` in backend logs

---

## Development Workflow

### Making Changes

1. **Backend changes**: Modify files in `agent/service/browser/`. The server reloads automatically in development mode (uvicorn with reload).

2. **Frontend changes**: Modify files in `web/src/features/ui-agent/`. Next.js hot-reloads automatically.

3. **MCP Server changes**: The MCP Server is spawned fresh for each agent session. Kill the existing agent chat session and start a new one to pick up changes.

4. **Workflow changes**: Workflow files are read at the start of each test run. Changes take effect immediately on the next run.

### Testing Checklist

Before submitting changes:

- [ ] Browser session opens and screencast streams correctly
- [ ] Snapshot returns valid accessibility tree
- [ ] Click/type/navigate actions execute without errors
- [ ] Frontend displays frames in LiveViewport
- [ ] Action overlay appears and auto-clears
- [ ] Session tabs switch correctly
- [ ] Report generates with embedded screenshots
- [ ] Sessions are cleaned up after closure
- [ ] WebSocket reconnects on disconnect
- [ ] `BROWSER_MAX_SESSIONS` limit is enforced

### Log Locations

| Component | Log Location |
|-----------|-------------|
| Backend (dev) | stdout/stderr |
| Backend (Docker) | `docker compose logs digital-ai-agents-app` |
| Frontend (dev) | Browser DevTools Console |
| MCP Server | stderr (piped through agent SDK) |
| Chromium | `browser_console_logs` tool output |
