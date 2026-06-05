# digital-ai-agents

An AI agent platform built on the Claude Agent SDK. Provides a FastAPI backend and a Next.js web UI for interactive chat, real-time streaming, and tool-approval workflows.

## Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI, async SQLite, Alembic, Claude Agent SDK |
| Frontend | Next.js 14, TypeScript, Tailwind, Zustand, Radix UI |
| Real-time | WebSocket (`/agent/v1/chat/ws`) |

Python 3.13.5 (via `pyenv shell 3.13`) is the supported runtime.

## Repository layout

```
agent/                     Python backend
  api/                     FastAPI routes
  service/
    channel/               WebSocket message channel implementation
    handler/               Chat + permission handlers
    agent/workspace.py     Per-agent workspace lifecycle (cwd, skills, hooks, prompts)
    agent_manager.py       Agent CRUD + SDK option building
  core/config.py           Settings (env-driven)
data/
  agents/                  Agent definitions + skill source-of-truth
    index.json             List of registered agents
    <AgentName>/
      skills/<skill>/SKILL.md
      hooks/               PreToolUse guard scripts (symlinked into workspace)
      settings.json        SDK settings (permissions, hooks config)
  workspace/<user>/<agent>/   Per-user workspace (cwd for the SDK)
    .claude/
      settings.json        Symlink → data/agents/<AgentName>/settings.json
      skills/              Symlink → data/agents/<AgentName>/skills/
      hooks/               Symlink → data/agents/<AgentName>/hooks/
    AGENTS.md, USER.md, MEMORY.md, RUNBOOK.md
    memory/, sessions/
deploy/                    Container packaging
  Dockerfile               Multi-stage build (app backend)
  docker-compose.yml       Local multi-service dev
  entrypoint.sh            Agent-definition sync + infra repo clone at startup
web/src/                   Next.js frontend
  hooks/agent/             useAgentSession hook (WebSocket + state)
  components/message/      Message rendering + tool approval UI
alembic/                   DB migrations
.github/workflows/
  build-push-ecr.yml       Build, push to ECR, and redeploy ECS
```

## Getting started

```bash
pyenv shell 3.13
cp example.env .env       # fill in ANTHROPIC_AUTH_TOKEN, BASE_URL, MODEL
make install              # backend pip + frontend npm
make dev                  # backend on :8010, frontend on :3000
```

Backend-only or frontend-only:

```bash
make run-backend
make run-web
```

## Configuration

All backend config is read from `.env`. Key variables:

| Var | Purpose |
|---|---|
| `ANTHROPIC_AUTH_TOKEN` / `ANTHROPIC_BASE_URL` / `ANTHROPIC_MODEL` | Claude API credentials and routing |
| `DEFAULT_MODEL` | Fallback model when an agent has none set |
| `HOST` / `PORT` | FastAPI bind address (default `0.0.0.0:8010`) |
| `WORKSPACE_PATH` | Override for per-agent workspace root (default `data/workspace`) |

Frontend config (`web/.env.local`): `NEXT_PUBLIC_WS_URL` for the WebSocket endpoint.

## Core API

| Endpoint | Description |
|---|---|
| `WebSocket /agent/v1/chat/ws` | Real-time chat, tool approvals, streaming events |
| `GET /agent/v1/sessions` | List sessions |
| `GET /agent/v1/sessions/{id}/messages` | Message history for a session |
| `GET /agent/v1/agents` | List agents |
| `GET /agent/v1/agents/{id}/skills` | List skills attached to an agent |

Data flow: `Frontend → WebSocket → FastAPI → Claude Agent SDK → tool calls / streaming response → WebSocket → Frontend`.

## Agents

An **agent** is a configured Claude instance with its own model, system prompt, allowed tools, and skills. Agents are registered in `data/agents/index.json` and their definitions live under `data/agents/<AgentName>/`.

### How `data/agents/` is structured

```
data/agents/
├── index.json                        Registry of all agents
└── <AgentName>/
    ├── settings.json                 SDK settings (hooks, permissions deny list)
    ├── hooks/                        Guard scripts (PreToolUse, etc.)
    │   └── guard_bash.py             Blocks destructive commands
    └── skills/                       Skills attached to this agent
        └── <skill_name>/
            ├── SKILL.md              Skill definition (frontmatter + body)
            ├── references/           On-demand context the skill can read
            └── scripts/              Executable helpers the skill invokes
```

`index.json` is the single source of truth for which agents exist. Each entry looks like:

```json
{
  "agent_id": "76cf152dedea",
  "name": "CloudPilot",
  "workspace_path": "/abs/path/to/data/workspace/<user>/<AgentName>",
  "options": {
    "model": "us.anthropic.claude-sonnet-4-6",
    "permission_mode": "default",
    "allowed_tools": ["Skill"],
    "disallowed_tools": [],
    "include_partial_messages": true,
    "skills_enabled": true,
    "setting_sources": ["user", "project"]
  },
  "created_at": "...",
  "status": "active"
}
```

Notable fields:

- **`workspace_path`** — absolute path to the per-user workspace; the SDK runs with this as `cwd`.
- **`allowed_tools` / `disallowed_tools`** — bound list of tool names the model may invoke. `"Skill"` enables the SDK's skill-invocation tool.
- **`skills_enabled`** — when true, the workspace lifecycle ensures skills are linked (see below).
- **`setting_sources`** — which Claude settings sources to load. `"project"` means `<cwd>/.claude/`, `"user"` means `~/.claude/`. The SDK uses these to discover skills, hooks, and settings files.
- **`permission_mode`** — `default` requires interactive approval for tools not in `allowed_tools`; `bypassPermissions` skips prompts; `acceptEdits` auto-approves file edits.

### How workspaces are organized

Each agent gets a workspace at `data/workspace/<user>/<AgentName>/`. This is the directory the SDK runs in (`cwd`), and it accumulates per-user state:

```
data/workspace/<user>/<AgentName>/
├── .claude/
│   ├── settings.json     ──symlink──→ data/agents/<AgentName>/settings.json
│   ├── skills            ──symlink──→ data/agents/<AgentName>/skills/
│   └── hooks             ──symlink──→ data/agents/<AgentName>/hooks/
├── AGENTS.md                         Agent identity / boundaries / risk principles
├── USER.md                           User preferences for this agent
├── MEMORY.md                         Long-term memory and decision log
├── RUNBOOK.md                        Workflow notes / common commands
├── memory/                           Dated short-term memory files
└── sessions/                         Per-session SDK artifacts
```

`AGENTS.md`, `USER.md`, `MEMORY.md`, and `RUNBOOK.md` are seeded from templates by `AgentWorkspace.ensure_initialized()` (`agent/service/agent/workspace.py`) on first use. They're then composed into the agent's system prompt at session-start time, so edits take effect on the next session.

The three symlinks (`settings.json`, `skills/`, `hooks/`) are created idempotently at workspace init. Their source-of-truth lives in `data/agents/<AgentName>/` — edits there propagate immediately to all user workspaces without a sync step.

### Skills, hooks, and settings: source-of-truth + symlink

All agent-level configuration lives in **one place** (`data/agents/<AgentName>/`) and is exposed to the SDK via symlinks in the workspace's `.claude/` directory:

| Source | Workspace symlink | Purpose |
|---|---|---|
| `data/agents/<Name>/skills/` | `.claude/skills/` | Skill discovery |
| `data/agents/<Name>/hooks/` | `.claude/hooks/` | PreToolUse guard scripts |
| `data/agents/<Name>/settings.json` | `.claude/settings.json` | Deny lists, hook wiring |

The Claude Agent SDK discovers these from `<cwd>/.claude/` when `setting_sources` includes `"project"`. `AgentWorkspace.ensure_initialized()` creates all three symlinks idempotently — they're only re-created if missing or pointing somewhere else.

Edits to the source-of-truth propagate instantly to every user's workspace.

### Skill file format

`SKILL.md` is markdown with YAML frontmatter:

```markdown
---
name: cloudpilot
description: One-line description Claude uses to decide when to invoke the skill.
---

# Skill body

Instructions, runbook, decision tables. Sub-files (references/, scripts/) are
referenced by relative path and read on demand.
```

When an agent has exactly one skill, `agent_manager.build_sdk_options()` injects a "Primary Skill" directive into the system prompt so the model defaults to it without pattern-matching on the description. Multi-skill agents rely on the SDK's normal skill-routing behavior.

The model invokes skills through the SDK's `Skill` tool by `name`. For that to resolve, `Skill` must be in the agent's `allowed_tools` list **and** the skill must be discoverable via the symlink above.

## Example: Creating a custom agent

Agents are registered in `data/agents/index.json`. Each agent gets its own directory with skills, hooks, and settings. See the included `UI-Agent` and `digital_kb` agents for reference implementations.

### Adding an agent to a user workspace

When a user starts a chat with an agent, the workspace lifecycle:

1. Creates `data/workspace/<user>/<AgentName>/` and seeds `AGENTS.md` / `USER.md` / `MEMORY.md` / `RUNBOOK.md`
2. Creates `.claude/skills`, `.claude/hooks`, `.claude/settings.json` symlinks pointing at `data/agents/<AgentName>/`
3. Builds SDK options with `cwd = workspace path`, `setting_sources = ["user", "project"]`
4. Connects `ClaudeSDKClient`; the SDK discovers skills via the symlinked `.claude/skills/` directory

If skill discovery fails, check that the symlink at `<workspace>/.claude/skills` exists and resolves to `data/agents/<AgentName>/skills/`.

## Tool permissions

When an agent calls a tool that requires approval, the backend emits a `permission_request` WebSocket event with a unique `request_id`. The frontend renders an inline approval prompt under the tool block and sends back a `permission_response` with the same `request_id`.

Multiple permission requests can be in flight simultaneously — for example when Claude calls two tools in parallel. The frontend keeps a `Map<request_id, permission>` so each prompt has independent state; approving one does not collapse the others. See `web/src/hooks/agent/index.ts` (`pendingPermissions`) and `web/src/components/message/content-renderer.tsx` for the matching logic.

The approval UI shows `tool_input.description` as a plain-English summary when present (e.g. for `Bash`); otherwise it falls back to `Execute <ToolName>`. A "Show details" toggle expands the full tool input as JSON.

The backend's permission handler (`agent/service/channel/websocket_channel.py:InteractivePermissionStrategy`) waits up to 60 seconds for a response; if the user doesn't respond, it auto-denies with a timeout message.

## Message transport

`agent/service/channel/` abstracts message transport behind `MessageChannel`, `MessageSender`, and `PermissionStrategy`. The current implementation is `WebSocketChannel` (`websocket_channel.py`), backed by `InteractivePermissionStrategy` — the strategy emits `permission_request` events over the WebSocket and waits for the user to allow or deny in the UI before the SDK proceeds.

## Development conventions

- Object-oriented backend; module-scoped abstractions over inline procedures.
- All imports use the project root as the package root — never relative imports.
- Comments and documentation in English.
- Throw on invalid state — don't add silent fallbacks.
- Keep modules small and reusable; mind cyclomatic complexity.
- Don't modify another module's code to satisfy a local change.

## Deployment

### Architecture

```
GitHub Actions (Build & Push to ECR)
  → Docker build (app: deploy/Dockerfile, web: web/)
  → Push to ECR: <YOUR_ACCOUNT>.dkr.ecr.<REGION>.amazonaws.com/digital-ai-agents/{app,web}
  → ECS force-redeploy (rolling update)

ECS Cluster: digital-ai-agents-<env>-ecs
  ├── Service: digital-ai-agents-<env>-app   (FastAPI backend)
  └── Service: digital-ai-agents-<env>-web   (Next.js frontend)
```

### Triggering a deploy

Deployments are triggered manually via GitHub Actions workflow dispatch:

```bash
gh workflow run "Build & Push to ECR" --ref main \
  --field environment=dev \
  --field services=both
```

| Input | Options | Default |
|---|---|---|
| `environment` | `dev`, `preprod`, `prod` | required |
| `services` | `app`, `web`, `both` | `both` |

The workflow:
1. Checks out the repo at the specified ref
2. Assumes the environment-specific AWS IAM role (OIDC)
3. Logs into ECR
4. Builds and pushes Docker images with a tag: `<env>-<timestamp>-<short-sha>`
5. Forces a new ECS deployment (rolling replacement — no downtime)

### Image tagging

Images are dual-tagged:
- `<env>-<YYYYMMDD>-<HHMMSS>-<git-sha>` — immutable, for auditing
- `<env>-latest` — mutable, used by ECS task definitions

### Container startup (entrypoint.sh)

On boot, the app container:
1. Syncs agent definitions from `/opt/app/seed/agents` (baked in image) to EFS-backed `$AGENTS_DATA_PATH`
2. Seeds `index.json` only on first deploy (preserves user-registered agents)
3. Starts the FastAPI server via `digital-ai-agents run`

### Environment variables (runtime)

| Var | Purpose |
|---|---|
| `GH_TOKEN` | GitHub PAT for workflow dispatch (optional) |
| `AGENTS_DATA_PATH` | EFS mount for agent definitions (default: `/home/agent/data/agents`) |
| `WORKSPACE_PATH` | EFS mount for user workspaces (default: `/home/agent/data/workspace`) |

### Runner

CI runs on GitHub Actions (configure your own runner if needed).

## Security

### Agent sandboxing

Each agent runs within a workspace scoped to a single user. The Claude Agent SDK enforces tool permissions via `settings.json` at the workspace level.

**Three layers of protection:**

1. **LLM-level** — `SKILL.md` safety boundaries instruct the model not to perform destructive operations.
2. **SDK deny list** — `data/agents/<Name>/settings.json` declares `permissions.deny` patterns that the SDK refuses to execute.
3. **PreToolUse hook** — `data/agents/<Name>/hooks/guard_bash.py` parses compound Bash commands (splitting on `&&`, `||`, `;`, `|`, subshells) and denies any segment matching destructive patterns (`rm`, `git reset`, `aws delete-*`, etc.).

The hook is the strongest enforcement: it runs before tool execution and cannot be bypassed by prompt injection or creative command chaining.

**What's blocked (CloudPilot):**
- Filesystem: `rm`, `rmdir`, `shred`, `truncate`, `chmod`, `chown`, `find -delete`
- Git: `reset`, `clean`, `checkout --`, `restore`, `branch -D`, `push --force`, `rebase`, `filter-branch`
- AWS: `s3 rm`, `s3api delete-*`, `ecr batch-delete-image`, `kms schedule-key-deletion`, `iam delete-*`, `rds delete-*`, `ec2 terminate-instances`

## Make targets

```
make help              List all targets
make install           Install backend + frontend deps
make dev               Run backend + frontend together
make run-backend       Backend only
make run-web           Frontend only
make init-storage      Create logs/, cache/, data/ if missing
```

Dinesh GANDHI
