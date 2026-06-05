# Architecture

This document describes the detailed architecture of the UI Testing Agent, including all backend and frontend components, data flow, session lifecycle, and deployment model.

## System Overview

```
+---------------------------------------------------------------------+
|                          CLIENT (Browser)                            |
|                                                                     |
|  +--- Chat Panel (Left) ---+   +--- Browser Panel (Right) ------+  |
|  | ChatInterface            |   | SessionTabs                     |  |
|  | Message history          |   | LiveViewport + ActionOverlay    |  |
|  | User input + commands    |   | ReportView                      |  |
|  +----|---------------------+   | RunsHistory                     |  |
|       | Chat WS                 +-----|---------------------------+  |
|       |                               | Browser WS                   |
+-------|-------------------------------|------------------------------+
        |                               |
+-------|-------------------------------|------------------------------+
|       v                               v           BACKEND (FastAPI)  |
|  +--- Chat WebSocket ---+   +--- Browser WebSocket Endpoint ---+    |
|  | /agent/v1/chat/ws     |   | /agent/v1/browser/ws              |    |
|  | Handles AI messages   |   | Pub/sub session subscriptions     |    |
|  +----|------------------+   | Broadcasts frame + action events  |    |
|       |                      +-----|-----------------------------+    |
|       v                            ^                                  |
|  +--- Claude Agent SDK ---+       |                                  |
|  | Multi-turn AI loop      |       |                                  |
|  | Tool dispatch via MCP   |       |                                  |
|  +----|-------------------+       |                                  |
|       |                            |                                  |
|       v (stdio pipe)               |                                  |
|  +--- MCP Server (subprocess) ---+ |                                  |
|  | browser_tools                   | |                                  |
|  | Routes tool calls to Internal  | |                                  |
|  | API via HTTP localhost:8010    | |                                  |
|  +----|---------------------------+ |                                  |
|       |                              |                                  |
|       v (HTTP POST)                  |                                  |
|  +--- Internal Browser API ---+    |                                  |
|  | POST /internal/browser/open  |    |                                  |
|  | POST /internal/browser/click |    |                                  |
|  | POST /internal/browser/type  |    |                                  |
|  | ... (all tool endpoints)     |    |                                  |
|  +----|------------------------+    |                                  |
|       |                              |                                  |
|       v                              |                                  |
|  +--- BrowserManager (singleton) ---|------+                          |
|  | Playwright async API              |      |                          |
|  | -> Creates contexts/pages         |      |                          |
|  | -> Manages ScreencastStreams   ---|------+                          |
|  | -> Manages CDPEventListeners      |                                  |
|  | -> SessionRegistry (auto-cleanup) |                                  |
|  +----|-----------------------------+                                  |
|       |                                                                |
+-------|----------------------------------------------------------------+
        |
        v
+--- Chromium (headless) ---+
| Launched by Playwright     |
| CDP protocol active        |
| Screencast at ~8fps        |
+----------------------------+
```

## Backend Components

### BrowserManager

**File:** `agent/service/browser/browser_manager.py`

Singleton that manages the entire browser lifecycle. Provides two modes of operation:

- **Direct mode:** Launches its own headless Chromium instance using Playwright
- **Attach mode:** Connects to an externally-launched browser via CDP endpoint

Key responsibilities:
- Lazy browser startup (launches on first `create_session` call)
- Session creation with viewport configuration (1280x720)
- Screencast and event listener attachment per session
- Session closure with resource cleanup
- Enforces maximum concurrent session limit (`BROWSER_MAX_SESSIONS`)
- Pushes frame/action events to the WebSocket broadcast callback

### ScreencastStream

**File:** `agent/service/browser/screencast_stream.py`

Manages CDP `Page.startScreencast` for a single session. Receives raw JPEG frame data from the CDP protocol and pushes it through the event callback chain to reach WebSocket subscribers.

Configuration:
- Format: JPEG
- Quality: Configurable via `BROWSER_SCREENCAST_QUALITY` (default: 60)
- Resolution: 1280x720 max
- Frame acknowledgement: Required to keep CDP sending frames

### CDPEventListener

**File:** `agent/service/browser/cdp_event_listener.py`

Subscribes to Playwright page events and emits structured action messages:

| Event | Action Type | Detail |
|-------|-------------|--------|
| `framenavigated` | `navigate` | `{url}` |
| `load` | `page_load` | `{url}` |
| `console` (warning/error) | `console` | `{level, text}` |

These events are pushed to WebSocket subscribers, enabling the frontend ActionOverlay to display real-time feedback.

### MCP Server

**File:** `agent/service/browser/mcp_server.py`

Runs as a stdio subprocess spawned by the Claude Agent SDK. Implements the Model Context Protocol (MCP) server interface:

- Exposes 14 browser tools via `list_tools()`
- Routes tool calls to the backend internal API over HTTP (`http://localhost:8010/agent/v1/internal/browser/*`)
- Returns structured JSON results to the agent
- Uses `httpx.AsyncClient` with 60-second timeout for backend calls

### Internal Browser API (Router)

**File:** `agent/service/browser/router.py`

FastAPI router that exposes:

1. **Browser WebSocket** (`/browser/ws`): Pub/sub endpoint for frame and action streaming
2. **REST endpoints** for the frontend:
   - `GET /ui-testing/sessions` - List active sessions
   - `GET /ui-testing/runs` - List past test runs
   - `GET /ui-testing/runs/{run_id}/report` - Serve HTML report
   - `GET /ui-testing/runs/{run_id}/artifacts/{path}` - Serve screenshots/traces

The WebSocket endpoint implements a subscription model:
- Clients send `{"type": "subscribe", "session_ids": [...]}` to receive frames for specific sessions
- Clients send `{"type": "unsubscribe", "session_ids": [...]}` to stop receiving frames
- Server pushes `{"type": "frame", ...}` and `{"type": "action", ...}` messages

### SessionRegistry

**File:** `agent/service/browser/session_registry.py`

In-memory registry of active `BrowserSession` dataclass instances. Features:

- Add/get/remove/list operations with thread safety
- Activity tracking via `last_activity` timestamp (updated on every `get()` call)
- Background cleanup loop: closes sessions idle longer than `BROWSER_SESSION_TIMEOUT` (default: 600s)
- Serialization to dict for API responses

### SessionStore

**File:** `agent/service/browser/session_store.py`

File-based metadata store mapping browser sessions to chat conversations. Persists to:
```
{workspace}/{user_id}/UI-Agent/.sessions/{session_key_hash}.json
```

Enables the frontend to recover browser sessions when switching between chat conversations.

### Snapshot Engine

**File:** `agent/service/browser/snapshot.py`

Generates accessibility-tree-like snapshots by evaluating a JavaScript function in the page. Extracts:
- Interactive elements (buttons, links, inputs, etc.)
- Landmarks (navigation, main, banner, etc.)
- Element refs (`e1`, `e2`, ...) for use in tool calls
- CSS selectors built from IDs, data-testid, aria-label, name attributes, or structural paths
- ARIA states (focused, disabled, expanded, checked, etc.)

### Report Generator

**File:** `agent/service/browser/report_generator.py`

Generates self-contained HTML reports with:
- Summary bar (total, passed, failed, skipped, duration)
- Per-test-case cards with status, duration, and error details
- Inline base64-encoded screenshots
- Dark theme with mulberry/magenta color scheme
- Companion `report.json` for programmatic access

## Frontend Components

### UIAgentLayout

**File:** `web/src/features/ui-agent/components/ui-agent-layout.tsx`

Top-level split panel layout:
- Left pane: ChatInterface (default 40% width)
- Right pane: BrowserPanel (default 60% width)
- Resizable drag handle (min 30%, max 70%)
- Connects to browser WebSocket on mount
- Passes `sessionKey` to WebSocket hook for chat-aware session switching

### BrowserPanel

**File:** `web/src/features/ui-agent/components/browser-panel.tsx`

Right panel container with three mode tabs:
- **Live**: Shows SessionTabs + LiveViewport (screencast feed)
- **Report**: Shows the latest test report (HTML rendered)
- **History**: Shows past test runs with summaries

Includes a WebSocket connection status indicator.

### LiveViewport

**File:** `web/src/features/ui-agent/components/live-viewport.tsx`

Renders CDP screencast frames as images:
- Uses `useScreencast` hook for throttled rendering via `requestAnimationFrame`
- `BrowserChrome` component shows current URL and loading state
- `ActionOverlay` component shows current action at the bottom
- Empty state with pulsing animation when no session is active

### ActionOverlay

**File:** `web/src/features/ui-agent/components/action-overlay.tsx`

Bottom overlay displaying current browser action:
- Color-coded by action type (click, navigate, input, page_load, scroll, hover)
- Shows action icon, type label, description, and selector
- Animates in/out with framer-motion
- Auto-clears after 2 seconds of inactivity

### SessionTabs

**File:** `web/src/features/ui-agent/components/session-tabs.tsx`

Horizontal tab bar for parallel browser sessions:
- Shows session name and screencast-active indicator (green/gray dot)
- Active tab has mulberry underline with spring animation
- Hidden when only one session exists

### BrowserStore (Zustand)

**File:** `web/src/features/ui-agent/store/browser-store.ts`

State management for the entire browser panel:

```typescript
interface BrowserStoreState {
  sessions: BrowserSessionInfo[];        // Active browser sessions
  activeSessionId: string | null;         // Currently viewed session
  currentFrame: Record<string, string>;   // Latest frame per session (base64)
  currentAction: Record<string, BrowserAction | null>; // Latest action per session
  panelMode: PanelMode;                   // "live" | "report" | "history"
  currentReport: TestReport | null;       // Currently displayed report
  runs: TestRunSummary[];                 // Past test run history
  isConnected: boolean;                   // WebSocket connection status
  chatSessionKey: string | null;          // Current chat session association
}
```

## Data Flow

### Screencast Frame Flow

```
Chromium Page Change
    -> CDP "Page.screencastFrame" event
    -> ScreencastStream._handle_frame()
    -> ScreencastStream._on_frame callback (BrowserManager._push_event)
    -> BrowserWSConnectionManager.broadcast()
    -> WebSocket.send_text() to subscribed clients
    -> useBrowserWebSocket.onmessage handler
    -> browserStore.setFrame(sessionId, data)
    -> useScreencast hook (requestAnimationFrame throttle)
    -> LiveViewport <img> element update
```

### Tool Call Flow

```
Claude Agent SDK (tool call: browser_click)
    -> MCP Server stdio pipe
    -> _dispatch_tool("browser_click", {session_id, selector})
    -> httpx.post("http://localhost:8010/agent/v1/internal/browser/click")
    -> Internal API handler
    -> BrowserManager.registry.get(session_id)
    -> page.click(selector)
    -> CDP generates new screencast frames (visible in viewport)
    -> Returns result JSON to MCP Server
    -> MCP Server returns TextContent to Claude Agent SDK
```

## Session Lifecycle

### Creation

1. Agent calls `browser_open(url, session_name)`
2. MCP Server POSTs to `/internal/browser/open`
3. BrowserManager checks session limit
4. Creates new BrowserContext with 1280x720 viewport
5. Creates new Page and CDPSession
6. Starts ScreencastStream (subscribes to `Page.screencastFrame`)
7. Starts CDPEventListener (subscribes to page events)
8. Navigates to URL
9. Registers in SessionRegistry
10. Returns `{session_id, session_name, url}`

### Active Use

- Each `registry.get(session_id)` call updates `last_activity`
- Screencast frames flow continuously at ~8fps
- Actions emit events visible in the frontend overlay
- Snapshot calls evaluate JS in the page for accessibility tree

### Closure

1. Agent calls `browser_close(session_id)`
2. ScreencastStream stopped (sends `Page.stopScreencast` to CDP)
3. CDPEventListener stopped (removes page event listeners)
4. BrowserContext closed (closes the tab)
5. Session removed from registry

### Crash Recovery

- SessionRegistry runs a background cleanup loop every 60 seconds
- Sessions idle longer than `BROWSER_SESSION_TIMEOUT` (default: 600s) are force-closed
- If the Chromium process crashes, Playwright raises exceptions on next operation
- The frontend detects WebSocket disconnection and auto-reconnects with exponential backoff (1s -> 30s max)

## Multi-Chat and Multi-Tab Model

The system supports multiple browser tabs per chat session and session isolation across chats:

```
Chat A ─── browser_open("google.com")  ─── Session abc-123
       └── browser_open("github.com")  ─── Session def-456

Chat B ─── browser_open("example.com") ─── Session ghi-789
```

- `BrowserSessionStore` persists session-to-chat mappings on disk
- When the user switches chats, the frontend:
  1. Unsubscribes from the old chat's session IDs
  2. Fetches active sessions for the new chat via REST
  3. Subscribes to the new session IDs on the browser WebSocket
- Each session has independent screencast and event streams
- The `chatSessionKey` in the Zustand store resets sessions on chat switch

## Deployment Model

### Docker

Single container for the backend (Python + Chromium):
- Base image: `python:3.13.5-slim`
- Playwright and Chromium installed at build time
- `shm_size: 2gb` required for Chromium stability
- Environment variables control browser behavior

### ECS (Production)

```
+--- ECS Task -------------------------------------------+
|  Container: digital-ai-agents-app                      |
|  CPU: 2 vCPU  |  Memory: 4GB  |  shm: 2GB            |
|                                                        |
|  +-- FastAPI (uvicorn/gunicorn) ---+                  |
|  |   Port 8010                      |                  |
|  |   Browser WS + Chat WS          |                  |
|  +-----|----------------------------+                  |
|        |                                               |
|  +-----|--- Chromium (headless) ---+                  |
|  |     Managed by Playwright        |                  |
|  |     Max 5 concurrent sessions    |                  |
|  +----------------------------------+                  |
|                                                        |
|  Volumes:                                              |
|  - EFS: /home/agent/data (workspace, agents, runs)    |
|  - tmpfs: /dev/shm (2GB for Chromium)                 |
+-------------------------------------------------------+
```

Key ECS considerations:
- Chromium requires `/dev/shm` with sufficient size (2GB recommended)
- Sessions consume ~200-300MB each; budget memory for max sessions
- EFS provides persistent storage for reports and workspace data
- Health check: `curl -f http://localhost:8010/agent/health`
