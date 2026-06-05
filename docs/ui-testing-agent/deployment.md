# Deployment

This document covers environment configuration, Docker setup, ECS deployment considerations, local development, and resource tuning for the UI Testing Agent.

## Environment Variables

All browser-related configuration is managed via environment variables, loaded into the `Settings` class via pydantic-settings.

### Browser Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `BROWSER_HEADLESS` | bool | `true` | Run Chromium in headless mode. Set to `false` for local debugging with visible browser. |
| `BROWSER_MAX_SESSIONS` | int | `5` | Maximum number of concurrent browser sessions allowed. Each session consumes ~200-300MB. |
| `BROWSER_SCREENCAST_FPS` | int | `8` | Target frames per second for CDP screencast. Higher values increase bandwidth. |
| `BROWSER_SCREENCAST_QUALITY` | int | `60` | JPEG quality for screencast frames (1-100). Lower values reduce bandwidth but decrease clarity. |
| `BROWSER_SESSION_TIMEOUT` | int | `600` | Idle session timeout in seconds. Sessions inactive longer than this are auto-closed. |
| `BROWSER_CHROMIUM_ARGS` | string | `--no-sandbox,--disable-dev-shm-usage,--disable-gpu` | Comma-separated Chromium launch arguments. |

### Workspace Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `WORKSPACE_PATH` | string | `./data/workspace` | Base path for user workspace data (reports, sessions, artifacts) |
| `AGENTS_DATA_PATH` | string | `./data/agents` | Path to agent definitions (skills, workflows, configs) |

### Server Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `HOST` | string | `0.0.0.0` | Server bind address |
| `PORT` | int | `8010` | Server port |
| `SERVER_TYPE` | string | `uvicorn` | Server type (`uvicorn` for dev, `gunicorn` for production) |
| `WORKERS` | int | `1` | Number of worker processes. Keep at 1 for browser sessions (singleton BrowserManager). |

### Authentication

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DISABLE_AUTH` | bool | `false` | Disable authentication (for local development only) |
| `SSO_TENANT_ID` | string | `""` | Azure AD tenant ID for SSO |
| `SSO_CLIENT_ID` | string | `""` | Azure AD client ID |

### Frontend Environment

| Variable | Type | Description |
|----------|------|-------------|
| `NEXT_PUBLIC_WS_URL` | string | Chat WebSocket URL (e.g., `ws://localhost:8010/agent/v1/chat/ws`) |
| `NEXT_PUBLIC_API_URL` | string | Backend API base URL (e.g., `http://localhost:8010/agent/v1`) |

The browser WebSocket URL is derived from the chat WS URL by replacing `/chat/ws` with `/browser/ws`.

---

## Docker Setup

### Dockerfile

**File:** `deploy/Dockerfile`

The Dockerfile builds a single image containing:
- Python 3.13.5 runtime
- FastAPI application (installed as wheel)
- Playwright with Chromium browser
- Node.js 22 (for Claude Code CLI)
- GitHub CLI, AWS CLI v2

Key sections for browser support:

```dockerfile
# Install Playwright and Chromium
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/app/browsers
RUN pip install playwright>=1.49.0 && \
    playwright install chromium --with-deps

# Set browser defaults
ENV BROWSER_HEADLESS=true \
    BROWSER_MAX_SESSIONS=5
```

The `playwright install chromium --with-deps` command installs:
- Chromium binary
- System dependencies (libatk, libcups, libdrm, libgbm, libnss, etc.)

### Docker Compose

**File:** `deploy/docker-compose.yml`

Critical settings for the application container:

```yaml
services:
  digital-ai-agents-app:
    shm_size: '2gb'  # Required for Chromium stability
    environment:
      - BROWSER_HEADLESS=true
      - BROWSER_MAX_SESSIONS=5
      - BROWSER_SCREENCAST_FPS=8
      - BROWSER_SCREENCAST_QUALITY=60
      - BROWSER_SESSION_TIMEOUT=600
    volumes:
      - agent-home:/home/agent  # Persistent workspace storage
```

The `shm_size: '2gb'` setting is critical. Chromium uses `/dev/shm` for shared memory, and the default Docker shared memory (64MB) causes crashes under load.

### Building

```bash
# Build both services
docker compose -f deploy/docker-compose.yml build

# Build with custom image tag
IMAGE=my-registry/digital-ai-agents TAG=v1.0.0 docker compose -f deploy/docker-compose.yml build
```

### Running

```bash
# Start services
docker compose -f deploy/docker-compose.yml up -d

# View logs
docker compose -f deploy/docker-compose.yml logs -f digital-ai-agents-app

# Stop services
docker compose -f deploy/docker-compose.yml down
```

---

## ECS Deployment

### Task Definition

Recommended ECS task configuration:

| Setting | Value | Rationale |
|---------|-------|-----------|
| CPU | 2048 (2 vCPU) | Chromium is CPU-intensive during page rendering |
| Memory | 4096 MB | Base app ~500MB + Chromium ~200-300MB per session |
| Shared Memory | 2048 MB | Required for Chromium stability |
| Platform | Linux/AMD64 | Chromium binaries are architecture-specific |

### Container Definition

```json
{
  "name": "digital-ai-agents-app",
  "image": "your-ecr-repo/digital-ai-agents:app-latest",
  "portMappings": [
    { "containerPort": 8010, "protocol": "tcp" }
  ],
  "environment": [
    { "name": "SERVER_TYPE", "value": "gunicorn" },
    { "name": "WORKERS", "value": "1" },
    { "name": "BROWSER_HEADLESS", "value": "true" },
    { "name": "BROWSER_MAX_SESSIONS", "value": "5" },
    { "name": "BROWSER_SESSION_TIMEOUT", "value": "600" },
    { "name": "WORKSPACE_PATH", "value": "/home/agent/data/workspace" },
    { "name": "AGENTS_DATA_PATH", "value": "/home/agent/data/agents" }
  ],
  "linuxParameters": {
    "sharedMemorySize": 2048
  },
  "mountPoints": [
    {
      "sourceVolume": "efs-data",
      "containerPath": "/home/agent/data",
      "readOnly": false
    }
  ],
  "healthCheck": {
    "command": ["CMD-SHELL", "curl -f http://localhost:8010/agent/health || exit 1"],
    "interval": 30,
    "timeout": 5,
    "startPeriod": 10,
    "retries": 3
  }
}
```

### EFS Volumes

Use Amazon EFS for persistent storage:

```json
{
  "volumes": [
    {
      "name": "efs-data",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-xxxxx",
        "rootDirectory": "/digital-ai-agents",
        "transitEncryption": "ENABLED"
      }
    }
  ]
}
```

EFS stores:
- User workspaces (test runs, reports, screenshots)
- Agent definitions and workflows
- Session metadata files

### Scaling Considerations

**Workers:** Keep at `WORKERS=1`. The BrowserManager is a singleton that manages state in-memory. Multiple workers would each have their own browser instance without shared state.

**Horizontal scaling:** Each ECS task handles its own set of browser sessions. Use ALB sticky sessions (WebSocket affinity) to ensure a user's chat and browser WebSocket connections land on the same task.

**Session limits:** With `BROWSER_MAX_SESSIONS=5` and ~300MB per session:
- Memory budget: 500MB (base) + 5 * 300MB (sessions) = 2GB
- Remaining 2GB available for system overhead and peaks
- Adjust `BROWSER_MAX_SESSIONS` based on available memory

### Load Balancer Configuration

For WebSocket support, the ALB target group must be configured with:
- Protocol: HTTP
- Health check path: `/agent/health`
- Stickiness: Enabled (for WebSocket affinity)
- Idle timeout: 300 seconds (browser sessions may be long-lived)

---

## Local Development

### Prerequisites

- Python 3.13+ (via pyenv)
- Node.js 18+ (for frontend)
- Playwright Chromium (installed automatically)

### Backend Setup

```bash
# Install dependencies
pip install -r agent/requirements.txt

# Install Playwright browsers
playwright install chromium

# Set environment
export BROWSER_HEADLESS=true
export DISABLE_AUTH=true

# Run backend
python -m agent.main
```

### Frontend Setup

```bash
cd web

# Install dependencies
npm install

# Set environment
echo "NEXT_PUBLIC_WS_URL=ws://localhost:8010/agent/v1/chat/ws" > .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8010/agent/v1" >> .env.local

# Run frontend
npm run dev
```

### Visible Browser (Mac/Linux)

For debugging, run Chromium in headed (visible) mode:

```bash
export BROWSER_HEADLESS=false
python -m agent.main
```

This opens a visible Chromium window. You can watch the browser interact in real time alongside the screencast in the frontend.

### WSL Notes

On Windows Subsystem for Linux:
- Install Chromium dependencies: `playwright install-deps chromium`
- Use `--no-sandbox` in Chromium args (included by default)
- If display issues occur, ensure `BROWSER_HEADLESS=true`

---

## Health Checks

The application exposes a health endpoint:

```
GET /agent/health
```

Returns `200 OK` when the server is running.

The Docker health check runs every 30 seconds:
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8010/agent/health || exit 1
```

For browser-specific health, you can check the session count:
```
GET /agent/v1/ui-testing/sessions
```

Returns `{"sessions": [...], "count": N}` indicating active browser sessions.

---

## Resource Limits and Tuning

### Memory

| Component | Memory Usage |
|-----------|-------------|
| FastAPI application | ~200-500MB |
| Chromium process (idle) | ~100MB |
| Chromium per tab (active) | ~200-300MB |
| Screencast buffering | ~10-20MB per session |

**Formula:** `Total = Base(500MB) + Chromium(100MB) + Sessions(N * 300MB)`

For `BROWSER_MAX_SESSIONS=5`: ~2.1GB total

### CPU

| Operation | CPU Impact |
|-----------|-----------|
| Page navigation/rendering | High (burst) |
| Screencast frame encoding | Medium (continuous) |
| Idle session | Low |
| Snapshot (JS eval) | Low-Medium (single burst) |

Recommended: 2 vCPU minimum for responsive interaction.

### Bandwidth

Screencast frame sizes at different quality levels:

| Quality | Avg Frame Size | Bandwidth at 8fps |
|---------|---------------|-------------------|
| 40 | ~15KB | ~120 KB/s per session |
| 60 (default) | ~25KB | ~200 KB/s per session |
| 80 | ~45KB | ~360 KB/s per session |

With 5 concurrent sessions at default quality: ~1 MB/s total bandwidth.

### Tuning Recommendations

**Low bandwidth environment:**
```env
BROWSER_SCREENCAST_QUALITY=40
BROWSER_SCREENCAST_FPS=5
```

**High quality requirement:**
```env
BROWSER_SCREENCAST_QUALITY=80
BROWSER_SCREENCAST_FPS=12
```

**Memory constrained:**
```env
BROWSER_MAX_SESSIONS=2
BROWSER_SESSION_TIMEOUT=300
```

**High concurrency:**
```env
BROWSER_MAX_SESSIONS=10
# Requires: 4GB+ memory, 4 vCPU
BROWSER_SCREENCAST_QUALITY=40
```

### Chromium Launch Arguments

The `BROWSER_CHROMIUM_ARGS` variable controls Chromium behavior. Default arguments:

| Argument | Purpose |
|----------|---------|
| `--no-sandbox` | Required in Docker containers (no kernel sandbox) |
| `--disable-dev-shm-usage` | Use /tmp instead of /dev/shm for writing (prevents OOM in small shm) |
| `--disable-gpu` | Disable GPU acceleration (not available in most server environments) |

Additional arguments for specific environments:

```env
# Reduce memory usage
BROWSER_CHROMIUM_ARGS=--no-sandbox,--disable-dev-shm-usage,--disable-gpu,--disable-extensions,--disable-background-timer-throttling

# Enable for sites requiring specific features
BROWSER_CHROMIUM_ARGS=--no-sandbox,--disable-dev-shm-usage,--disable-gpu,--enable-features=NetworkService
```
