# UI Testing Agent

The UI Testing Agent is a browser-based automated testing system that combines an AI agent with live browser control. It allows users to define, execute, and observe UI tests in real time through a chat interface, while watching the browser operate in a live viewport.

## What It Does

- Opens headless Chromium browser sessions on demand
- Streams live browser activity (screenshots at ~8fps) to the frontend via WebSocket
- Provides semantic MCP browser tools for the AI agent to control the browser (click, type, navigate, evaluate JavaScript, etc.)
- Loads structured workflow definitions per target site (selectors, test data, page maps)
- Executes test cases step by step, recording pass/fail results with auto-screenshots
- Generates detailed HTML reports with embedded evidence

## Architecture Overview

```
+----------------------------------------------------------+
|  FRONTEND (Next.js)                                      |
|                                                          |
|  +--- Chat Panel ---+   +--- Browser Panel ----------+  |
|  | Chat messages     |   | Live Viewport (screencast) |  |
|  | AI responses      |   | Session Tabs               |  |
|  | User commands     |   | Action Overlay             |  |
|  +-------------------+   | Report View / Runs History |  |
|                          +-----------------------------+  |
+-----|--Chat WS---|------------|--Browser WS----|----------+
      |            |            |                |
+-----|--Chat WS---|------------|--Browser WS----|----------+
|  BACKEND (FastAPI)                                        |
|                                                           |
|  +--- Chat Handler ---+   +--- Browser Router --------+  |
|  | Claude Agent SDK    |   | WebSocket /browser/ws     |  |
|  | Session manager     |   | REST /ui-testing/*        |  |
|  +---------|----------+   +---------|----------------+  |
|            |                        |                    |
|  +---------|----------+   +---------|----------------+  |
|  | MCP Server (stdio)  |   | BrowserManager             |  |
|  | browser_tools        |---|  -> Playwright             |  |
|  +---------------------+   |  -> ScreencastStream        |  |
|                             |  -> CDPEventListener        |  |
|                             |  -> SessionRegistry         |  |
|                             +------|---------------------+  |
|                                    |                        |
+------------------------------------|-----------------------+
                                     |
                              +------|------+
                              |  Chromium   |
                              |  (headless) |
                              +-------------+
```

## End-to-End Flow

1. **User sends a message** in the chat panel (e.g., "Test google.com")
2. **Chat WebSocket** delivers the message to the backend Claude Agent SDK
3. **Agent plans** the test run by loading the workflow file for the target site
4. **Agent calls MCP tools** (`browser_open`, `browser_snapshot`, `browser_click`, etc.)
5. **MCP Server** forwards tool calls to the backend internal API via HTTP
6. **BrowserManager** executes actions using Playwright against headless Chromium
7. **CDP Screencast** streams JPEG frames at ~8fps back through the Browser WebSocket
8. **Frontend renders** frames in the LiveViewport component in real time
9. **Agent records test steps** with `record_test_step` (auto-captures screenshots)
10. **Agent finalizes** the run with `finalize_run`, generating an HTML report
11. **User views** report in the Report tab of the browser panel

## Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| BrowserManager | `agent/service/browser/browser_manager.py` | Manages Playwright sessions and screencast |
| ScreencastStream | `agent/service/browser/screencast_stream.py` | CDP screencast frame streaming |
| CDPEventListener | `agent/service/browser/cdp_event_listener.py` | Emits navigation/load/console events |
| MCP Server | `agent/service/browser/mcp_server.py` | Exposes browser tools to Claude Agent SDK |
| Browser Router | `agent/service/browser/router.py` | WebSocket and REST endpoints |
| SessionRegistry | `agent/service/browser/session_registry.py` | Tracks active sessions with auto-cleanup |
| SessionStore | `agent/service/browser/session_store.py` | Maps browser sessions to chat sessions |
| Snapshot | `agent/service/browser/snapshot.py` | Accessibility tree extraction |
| ReportGenerator | `agent/service/browser/report_generator.py` | HTML report generation |
| UIAgentLayout | `web/src/features/ui-agent/components/ui-agent-layout.tsx` | Split panel layout |
| BrowserPanel | `web/src/features/ui-agent/components/browser-panel.tsx` | Right panel with mode tabs |
| LiveViewport | `web/src/features/ui-agent/components/live-viewport.tsx` | Screencast frame renderer |
| BrowserStore | `web/src/features/ui-agent/store/browser-store.ts` | Zustand state management |
| Agent Config | `data/agents/UI-Agent/agent.json` | Agent definition and MCP config |
| Skill Definition | `data/agents/UI-Agent/skills/ui-testing/SKILL.md` | Agent behavior instructions |
| Workflows | `data/agents/UI-Agent/skills/ui-testing/workflows/` | Per-site test definitions |

## Documentation Index

- [Architecture](./architecture.md) - Detailed system architecture, data flow, and deployment model
- [MCP Tools Reference](./mcp-tools-reference.md) - Complete reference for all browser tools
- [Workflows](./workflows.md) - How to create and manage test workflow definitions
- [Frontend](./frontend.md) - Frontend components, state management, and WebSocket protocol
- [Deployment](./deployment.md) - Environment variables, Docker setup, and ECS considerations
- [Development](./development.md) - Developer guide for extending the system
