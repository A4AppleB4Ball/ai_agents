# Agent UI Frontend Interface

> 🔧 Agent UI Frontend Interface Documentation - Includes APIs, type definitions, component usage and other frontend development guides

---

## 🏗️ Architecture Overview

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **State Management**: Zustand + Persist
- **Styling**: Tailwind CSS + Radix UI
- **Components**: React + TypeScript
- **Real-time Communication**: WebSocket

### Project Structure
```
src/
├── app/                  # Next.js page routing
├── components/           # UI component library
├── hooks/               # Custom hooks
├── lib/                 # Utility functions
├── store/              # State management
├── types/               # Type definitions
└── utils/               # Utility functions
```

---

## 🔌 API Interface

### Basic Configuration

```typescript
// API Base URL
const AGENT_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010/agent/v1';

// WebSocket Configuration
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8010/agent/v1/chat/ws';
```

### API Response Types

```typescript
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  request_id?: string;
}
```

### Session API

```typescript
// Get all sessions
const getSessions = async (): Promise<Session[]> => {
  const response = await fetch(`${AGENT_API_BASE_URL}/sessions`);
  return response.json().then(res => res.data.map(transformApiSession));
};

// Get session messages
const getSessionMessages = async (agentId: string): Promise<Message[]> => {
  const response = await fetch(`${AGENT_API_BASE_URL}/sessions/${agentId}/messages`);
  return response.json().then(res => res.data);
};

// Update session title
const updateSessionTitle = async (agentId: string, title: string): Promise<{ success: boolean }> => {
  const response = await fetch(`${AGENT_API_BASE_URL}/sessions/${agentId}/title`, {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  return response.json().then(res => res.data);
};

// Delete session
const deleteSession = async (agentId: string): Promise<{ success: boolean }> => {
  const response = await fetch(`${AGENT_API_BASE_URL}/sessions/${agentId}`, {
    method: 'DELETE',
  });
  return response.json().then(res => res.data);
};
```

---

## 🛠️ Development Standards


### Directory Structure

```
src/
├── app/                 # Page routing (grouped by feature)
│   ├── page.tsx
│   ├── dashboard/
│   └── settings/
├── components/          # UI components (grouped by type)
│   ├── ui/              # Basic UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── modal.tsx
│   ├── message/         # Message-related components
│   │   ├── message-item.tsx
│   │   ├── message-avatar.tsx
│   │   └── message-actions.tsx
│   └── chat/           # Chat-related components
├── hooks/              # Custom hooks (grouped by feature)
│   ├── agent/
│   └── websocket/
├── lib/                # Utility functions (grouped by purpose)
│   ├── utils/
│   ├── api/
│   └── websocket/
├── store/             # State management (grouped by module)
│   ├── session/
│   ├── settings/
│   └── index.ts
└── types/             # Type definitions (grouped by module)
    ├── message/
    ├── session/
    └── index.ts
```

*🎯 Make AI smarter, make interactions more natural*