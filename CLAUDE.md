# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

use python 3.13+

## Architecture Overview
**AI Chat Application**: FastAPI backend + Next.js frontend + WebSocket real-time communication + multi-channel messaging
**Core Directories:**
- `agent/` - Python backend (FastAPI, WebSocket, database)
- `agent/service/channel/` - Message channel abstraction layer (WebSocket/Teams)
- `web/src/` - Next.js frontend (React, TypeScript, Zustand)
- `alembic/` - Database migrations
**Tech Stack:**
- Backend: FastAPI + async SQLite + Alembic
- Frontend: Next.js 14 + TypeScript + Tailwind CSS
- Real-time communication: WebSocket
- Message channels: Microsoft Teams (future)
- AI Integration: Claude Agent SDK

## Core API
- `WebSocket /agent/v1/chat/ws` - Real-time chat
- `GET /agent/v1/sessions` - Session management
- `GET /agent/v1/sessions/{id}/messages` - Message history

**Data Flow:** Frontend → WebSocket → FastAPI → AI Model → Response → WebSocket → Frontend

## Configuration
**Backend (.env):**

**Frontend (.env.local):**

## Development Documentation Index
### 📚 Detailed Guides
- **[Frontend API Documentation](web/README.md)** - React components, type definitions and API interfaces
- **[WebSocket Flow](docs/websocket-session-flow.md)** - WebSocket sessions and data flow

### 📖 Technical Documentation
- **[Session Management](docs/guides/sessions.md)** - Session creation, management and message handling
- **[Streaming vs Single Mode](docs/guides/streaming-vs-single-mode.md)** - AI response mode comparison
- **[Custom Tools](docs/guides/custom-tools.md)** - Creating and using custom AI tools
- **[Slash Commands](docs/guides/slash-commands.md)** - Custom slash command development
- **[Skills Guide](docs/guides/skills.md)** - Skill system usage and development
- **[MCP Integration](docs/guides/mcp.md)** - Model Context Protocol integration
- **[Hosting Guide](docs/guides/hosting.md)** - Production deployment and configuration
- **[Permissions Management](docs/guides/permissions.md)** - Permission control and security settings
- **[Structured Outputs](docs/guides/structured-outputs.md)** - AI response formatting
- **[Cost Tracking](docs/guides/cost-tracking.md)** - API call cost monitoring
- **[Todo Tracking](docs/guides/todo-tracking.md)** - Task management and progress tracking
- **[Plugin System](docs/guides/plugins.md)** - Plugin development and management

## Code Patterns
**Backend:** Asynchronous programming, Pydantic models, FastAPI dependency injection, WebSocket
**Frontend:** Zustand state management, custom Hooks, Radix UI + Tailwind, React Markdown

## Development Standards

## Comments in English
- Object-oriented development
- Always respond in English
- Avoid over-engineering, keep code simple and understandable, practical and straightforward
- Pay attention to cyclomatic complexity, maximize code reuse
- Focus on module design, use design patterns when appropriate
- Minimize changes, avoid modifying other modules' code unnecessarily


use python request instead of curl
