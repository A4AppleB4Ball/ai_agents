ARG FROM_IMAGE_NAME=python:3.13.5-slim

FROM ${FROM_IMAGE_NAME} AS builder

LABEL authors="Amit"
LABEL description="Digital-AI-Agents Backend"

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl git && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /opt/app

COPY agent/requirements.txt ./requirements.txt

RUN pip install --upgrade pip && \
    pip install -r requirements.txt

FROM builder AS package-builder

COPY pyproject.toml MANIFEST.in ./
COPY agent ./agent

RUN pip install build wheel && \
    python -m build --wheel


FROM builder

# Install gh CLI, Node.js (for Claude Code CLI), and AWS CLI v2
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      -o /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      > /etc/apt/sources.list.d/github-cli.list && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get update && \
    apt-get install -y --no-install-recommends gh nodejs unzip && \
    rm -rf /var/lib/apt/lists/* && \
    curl "https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip" -o /tmp/awscliv2.zip && \
    unzip -q /tmp/awscliv2.zip -d /tmp && \
    /tmp/aws/install && \
    rm -rf /tmp/aws /tmp/awscliv2.zip

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

RUN groupadd --gid 1001 agent && \
    useradd --uid 1001 --gid agent --shell /bin/bash --create-home agent

WORKDIR /opt/app

COPY --from=package-builder /opt/app/dist/*.whl /tmp/

RUN pip install /tmp/*.whl --no-deps --force-reinstall && \
    rm -rf /tmp/*

# Install Playwright and Chromium for UI testing
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/app/browsers
RUN pip install playwright>=1.49.0 && \
    playwright install chromium --with-deps

ENV BROWSER_HEADLESS=true \
    BROWSER_CHANNEL="" \
    BROWSER_MAX_SESSIONS=5

# Bake agent definitions (skills, index) into the image for EFS sync at startup
COPY --chown=agent:agent data/agents /opt/app/seed/agents

COPY --chown=agent:agent deploy/entrypoint.sh /opt/app/entrypoint.sh
RUN chmod +x /opt/app/entrypoint.sh

RUN chown -R agent:agent /opt/app
USER agent

EXPOSE 8010

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8010/agent/health || exit 1

CMD ["/opt/app/entrypoint.sh"]
