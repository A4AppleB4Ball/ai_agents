# Multi-User Isolation + Per-Agent Skills — Design Document

> **Status**: Approved design, pending implementation  
> **Author**: Engineering  
> **Date**: 2026-05-21

---

## 1. Problem Statement

The platform currently has no user isolation — all agents and sessions are globally shared. Additionally, agents have no built-in mechanism for attaching domain-specific capabilities (skills). We need:

1. **Per-user scoping** — each user owns their agents, sessions, and workspaces.
2. **Per-agent skills** — each agent can have a distinct set of skills visible to both the model and the user.
3. **Shared skills** — admin-curated skills available to all users.

## 2. Design Principles

- **Filesystem is the source of truth for skills.** No DB duplication.
- **Minimum platform changes.** Leverage the SDK's existing skill discovery via `setting_sources=["project"]`.
- **No speculative abstractions.** No Kind system, no registries, no marketplaces until real demand appears.
- **Back-compatible.** Existing single-user setups continue working without migration friction.

---

## 3. Multi-User Isolation

### 3.1 Identity Flow

```
SSO / Header (X-User-Id)
  └─▶ Auth middleware extracts user_id (default: "admin")
        └─▶ request.state.user_id
              └─▶ Every service/repo call filters by user_id
```

**Middleware**: Add to `register_middleware.py`. Reads `X-User-Id` header, defaults to `"admin"` for development.

**WebSocket**: Extract `user_id` at handshake from headers or query params. Store on `ws.state.user_id`.

### 3.2 Schema Changes

```python
# AAgent — add user_id
class AAgent(BaseModel):
    agent_id: str
    user_id: str = "admin"          # NEW
    name: str
    workspace_path: str
    options: AgentOptions
    ...

# ASession — add user_id (denormalized for fast filtering)
class ASession(BaseModel):
    session_key: str
    agent_id: str
    user_id: str = "admin"          # NEW
    ...
```

**Name uniqueness**: Change from globally unique to per-user unique. Update `validate_agent_name` to accept `user_id`.

### 3.3 Workspace Layout

```
~/.agent-kit/
├── users/
│   ├── admin/
│   │   └── workspace/
│   │       ├── CloudPilot/
│   │       │   ├── AGENTS.md
│   │       │   └── .claude/skills/cloudpilot/  (symlink or direct)
│   │       └── Generic/
│   ├── alice/
│   │   └── workspace/...
│   └── bob/
│       └── workspace/...
└── shared/
    └── skills/                     # admin-curated, read-only for users
        └── cloudpilot/
```

**Path resolution change** (one function):
```python
def get_workspace_base_path(user_id: str = "admin") -> Path:
    base = Path(settings.WORKSPACE_PATH or "~/.agent-kit").expanduser()
    return base / "users" / user_id / "workspace"
```

**One-time migration**: On first boot, if `~/.agent-kit/workspace/` exists (old layout), move contents to `~/.agent-kit/users/admin/workspace/`. Idempotent.

### 3.4 Repository Scoping

All agent repository reads add `user_id` filter. All writes store `user_id`. Admin bypass via `_for(ctx)` wrapper methods that skip user filtering for admin users.

### 3.5 Process Isolation (Future)

Day-one: per-user env scoping. Inject `HOME=<user_workspace>`, scrub inherited AWS/GH credentials, inject only user-bound credentials from a `UserSecrets` config.

Full OS-level isolation (uid switching, containers) is deferred until multi-tenant production use.

---

## 4. Per-Agent Skills

### 4.1 How Skills Work (SDK Mechanism)

The Claude Agent SDK, when given `setting_sources=["project"]`, scans `<cwd>/.claude/skills/*/SKILL.md` at the start of every turn. It parses YAML frontmatter (`name`, `description`) and injects skill descriptions into the system prompt as "Available Skills". The model then decides when to invoke a skill by reading its full `SKILL.md`.

Skills are **not** code plugins. They are instruction bundles (markdown + scripts + assets) that the model follows using its generic built-in tools (Read, Write, Bash, Edit).

### 4.2 Per-Agent Scoping

Each agent's `cwd` is its workspace. Skills placed in `<workspace>/.claude/skills/` are visible only to that agent. This is free — the SDK already scopes discovery to `cwd`.

**Platform change**: Default `setting_sources` to `["project"]` when not explicitly set:
```python
# In AgentManager.build_sdk_options
if agent.options.setting_sources is None:
    sdk_options["setting_sources"] = ["project"]
```

### 4.3 Skill Layering (3 tiers, materialized as symlinks)

```
Priority (highest first):
1. Per-agent:   <workspace>/.claude/skills/<skill>/      (direct files)
2. Per-user:    ~/.agent-kit/users/<uid>/skills/<skill>/  (personal library)
3. Shared:      ~/.agent-kit/shared/skills/<skill>/       (admin-curated)
```

At workspace init time, layers 2 and 3 are symlinked into the agent workspace's `.claude/skills/` directory. The SDK sees one flat folder. Our layering is transparent.

```python
def materialize_skills(agent: AAgent):
    skills_dir = Path(agent.workspace_path) / ".claude" / "skills"
    skills_dir.mkdir(parents=True, exist_ok=True)
    # Symlink shared skills
    for src in shared_skills_dir.glob("*/"):
        link = skills_dir / src.name
        if not link.exists():
            link.symlink_to(src, target_is_directory=True)
    # Symlink user skills
    for src in user_skills_dir.glob("*/"):
        link = skills_dir / src.name
        if not link.exists():
            link.symlink_to(src, target_is_directory=True)
```

### 4.4 Single-Skill Preload

When an agent has exactly one skill, append a "primary skill" directive to the system prompt so the model defaults to that skill without needing to pattern-match the description:

```python
skill_dirs = list(skills_dir.glob("*/SKILL.md")) if skills_dir.exists() else []
if len(skill_dirs) == 1:
    info = parse_frontmatter(skill_dirs[0])
    sdk_options["system_prompt"] += (
        f"\n\n## Primary Skill\n"
        f"This agent is dedicated to **{info['name']}**. "
        f"Start every request by reading `.claude/skills/{skill_dirs[0].parent.name}/SKILL.md`."
    )
```

### 4.5 Visibility API

One read-only endpoint, no write API:

```
GET /agents/{agent_id}/skills
→ [{"name": "cloudpilot", "description": "Provision AWS infra via Terraform..."}]
```

Implementation: scan `<workspace>/.claude/skills/*/SKILL.md`, parse frontmatter, return list.

### 4.6 Frontend Visibility

- **Agent header chips**: Show `[cloudpilot]` `[gh-actions]` etc. as small badges.
- **Hover/click chip** → show skill description in tooltip or side panel.
- **No write UI** — skills are filesystem-managed for now.

---

## 5. What We Are NOT Building (Yet)

| Deferred | Rationale |
|---|---|
| `AgentKind` SPI / registry | Skills handle 90% of the use case without platform abstraction |
| Skill marketplace / publishing | No demand signal yet |
| Teams / orgs / RBAC tables | Two scopes (user + shared) cover stated need |
| Per-user quotas / rate limits | Add when abuse appears |
| Skill DB model / migration | Filesystem is the truth; DB duplication invites drift |
| Agent sharing between users | Shared skills is enough; shared agents need a permission model |
| Skill versioning in DB | Optional `version` in SKILL.md frontmatter; let users `git pull` |

---

## 6. Implementation Order

### Phase 1: CloudPilot Skill (no platform changes)
1. Create `.claude/skills/cloudpilot/` with SKILL.md, references/, scripts/, assets/
2. Wire `setting_sources` default to `["project"]` in `build_sdk_options`
3. Add `GET /agents/{id}/skills` endpoint
4. Test: create agent, drop skill in workspace, verify model discovers and uses it

### Phase 2: Multi-User Foundation
1. Add `user_id` to AAgent + ASession schemas (JSON file storage)
2. Auth middleware (X-User-Id header, default "admin")
3. Thread `user_id` through AgentManager → repository → API → WebSocket
4. Per-user workspace path resolution
5. One-time data migration (old layout → users/admin/)

### Phase 3: Skill Materialization
1. Shared skills directory (`~/.agent-kit/shared/skills/`)
2. Per-user skills directory (`~/.agent-kit/users/<uid>/skills/`)
3. Symlink materialization on workspace init
4. Single-skill preload logic

### Phase 4: Frontend Polish
1. X-User-Id header injection in all API calls
2. Skill chips on agent header
3. Skills info in agent detail panel

---

## 7. Migration Notes

- **Existing agents**: Get `user_id="admin"` automatically (JSON default).
- **Existing workspaces**: One-time move from `~/.agent-kit/workspace/*` to `~/.agent-kit/users/admin/workspace/*` on first boot. Idempotent check.
- **Agent name uniqueness**: Relaxed from global to per-user. No conflict risk since all existing agents become admin's.
- **No DB migration needed**: Storage is JSON files; new fields use defaults.
