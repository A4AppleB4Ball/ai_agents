# Workspace & Data Architecture

## Overview

The application uses a file-based workspace system where each user gets an isolated directory containing their agent workspaces, sessions, and memories. Agent definitions (skills, configurations) are stored separately as shared/global resources.

## Directory Structure

```
data/
├── agents/                        ← AGENTS_DATA_PATH (global, shared)
│   ├── index.json                 ← Agent registry (relative paths)
│   ├── CloudPilot/
│   │   └── skills/
│   │       └── cloudpilot/
│   │           └── SKILL.md
│   └── UI-Agent/
│       └── skills/
│           └── ...
└── workspace/                     ← WORKSPACE_PATH (root for all users)
    └── <user>/                    ← Per-user workspace (from get_current_user())
        ├── CloudPilot/             ← Agent workspace
        │   ├── .claude/
        │   │   ├── settings.json
        │   │   └── skills → <AGENTS_DATA_PATH>/CloudPilot/skills (symlink)
        │   ├── AGENTS.md
        │   ├── USER.md
        │   ├── MEMORY.md
        │   ├── RUNBOOK.md
        │   ├── memory/
        │   └── sessions/
        │       └── <base64_session_key>/
        │           ├── meta.json
        │           └── messages.jsonl
        └── UI-Agent/
            └── ...
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WORKSPACE_PATH` | Root directory for all user workspaces | `<cwd>/data/workspace` |
| `AGENTS_DATA_PATH` | Agent definitions directory (skills, index) | `<cwd>/data/agents` |

## Path Resolution

```
get_workspace_base_path()  → WORKSPACE_PATH (root)
get_current_user()         → "user" (TODO: SSO)
get_user_workspace_path()  → WORKSPACE_PATH/<user>
get_agents_data_path()     → AGENTS_DATA_PATH
```

### index.json stores relative paths

The agent index stores only the workspace directory name (relative to the user workspace):

```json
{
  "agent_id": "cloudpilot",
  "name": "CloudPilot",
  "workspace_path": "CloudPilot"
}
```

At runtime this resolves to: `WORKSPACE_PATH/<user>/CloudPilot`

This makes the index portable across environments (local, Docker, ECS).

## Local Development

No env vars needed — defaults resolve to `<project_root>/data/workspace` and `<project_root>/data/agents`.

```bash
# Optional: override in .env
WORKSPACE_PATH=/path/to/data/workspace
AGENTS_DATA_PATH=/path/to/data/agents
```

## AWS Deployment (ECS + EFS)

### Architecture

```
ALB
 └── ECS Service
      ├── Container: backend (FastAPI)
      └── Container: web (Next.js)

EFS Volume → mounted at /opt/app/data on backend container
```

### ECS Task Definition

```json
{
  "containerDefinitions": [{
    "name": "digital-ai-agents-app",
    "mountPoints": [{
      "sourceVolume": "data-efs",
      "containerPath": "/opt/app/data"
    }],
    "environment": [
      {"name": "WORKSPACE_PATH", "value": "/opt/app/data/workspace"},
      {"name": "AGENTS_DATA_PATH", "value": "/opt/app/data/agents"}
    ]
  }],
  "volumes": [{
    "name": "data-efs",
    "efsVolumeConfiguration": {
      "fileSystemId": "fs-xxxxx",
      "rootDirectory": "/"
    }
  }]
}
```

### Docker Compose (local Docker)

```yaml
environment:
  - WORKSPACE_PATH=/opt/app/data/workspace
  - AGENTS_DATA_PATH=/opt/app/data/agents
volumes:
  - ../data:/opt/app/data
```

### Why EFS

- User workspaces and sessions persist across container restarts and deployments
- Agent definitions (skills) are shared and only need to be synced once
- No database required for session storage
- Supports horizontal scaling (multiple containers reading same EFS)

## Skills Symlink

When an agent workspace is initialized, a symlink is created:

```
<user_workspace>/<agent>/.claude/skills → <AGENTS_DATA_PATH>/<agent>/skills
```

This allows the Claude Agent SDK to discover skills via its native `setting_sources: ["project"]` mechanism while keeping the source-of-truth in the global agents directory.

## User Scoping

Currently `get_current_user()` in `agent/core/config.py` returns a hardcoded `"user"`. When SSO is integrated:

1. Replace `get_current_user()` to extract user from request context (JWT, session cookie)
2. Each user automatically gets their own workspace directory
3. Agent definitions remain shared/global
4. Users see only their own sessions and memories

## Key Source Files

| File | Responsibility |
|------|---------------|
| `agent/core/config.py` | Path resolution functions, `get_current_user()` |
| `agent/service/agent/workspace.py` | AgentWorkspace class, skills symlink, system prompt |
| `agent/service/db/agent_repository.py` | Agent CRUD, relative path storage/resolution |
| `agent/service/db/session_repository.py` | Session discovery across workspace paths |
| `agent/service/storage/file_store.py` | File I/O, path management, legacy migration |
