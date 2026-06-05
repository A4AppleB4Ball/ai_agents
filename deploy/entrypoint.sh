#!/bin/bash
set -e

SEED_DIR="/opt/app/seed/agents"
TARGET_DIR="${AGENTS_DATA_PATH:-/home/agent/data/agents}"

echo "[entrypoint] Syncing agent definitions from image to EFS..."
echo "[entrypoint] Source: ${SEED_DIR}"
echo "[entrypoint] Target: ${TARGET_DIR}"

if [ ! -d "${SEED_DIR}" ]; then
    echo "[entrypoint] ERROR: Seed directory not found: ${SEED_DIR}"
    exit 1
fi

mkdir -p "${TARGET_DIR}"

# Sync skills directories (overwrite with latest from image)
for agent_dir in "${SEED_DIR}"/*/; do
    if [ -d "${agent_dir}" ]; then
        agent_name=$(basename "${agent_dir}")
        echo "[entrypoint] Syncing agent: ${agent_name}"
        rm -rf "${TARGET_DIR}/${agent_name}"
        cp -r "${agent_dir}" "${TARGET_DIR}/${agent_name}"
    fi
done

# Always overwrite index.json from image to pick up agent renames/additions
echo "[entrypoint] Updating index.json from image"
cp "${SEED_DIR}/index.json" "${TARGET_DIR}/index.json"

echo "[entrypoint] Agent definitions synced successfully"

# Ensure workspace directory exists
WORKSPACE_DIR="${WORKSPACE_PATH:-/home/agent/data/workspace}"
mkdir -p "${WORKSPACE_DIR}"

# =====================================================
# GitHub CLI auth
# =====================================================
if [ -n "${GH_TOKEN}" ] && [ "${GH_TOKEN}" != "PLACEHOLDER" ]; then
    echo "[entrypoint] Configuring git credentials via GH_TOKEN..."
    gh auth setup-git || echo "[entrypoint] WARNING: gh auth setup-git failed"
    gh auth status || true
else
    echo "[entrypoint] Skipping gh auth (no valid GH_TOKEN)"
fi

# =====================================================
# Clone/pull infra repo
# =====================================================
INFRA_REPO="${DIGITALINFRA_REPO:-}"
INFRA_PATH="${DIGITALINFRA_PATH:-/home/agent/repos/infrastructure}"
INFRA_BRANCH="${DIGITALINFRA_BRANCH:-main}"

if [ -n "${INFRA_REPO}" ] && [ -n "${GH_TOKEN}" ] && [ "${GH_TOKEN}" != "PLACEHOLDER" ]; then
    AUTH_REPO=$(echo "${INFRA_REPO}" | sed "s|https://github.com|https://${GH_TOKEN}@github.com|")
    if [ -d "${INFRA_PATH}/.git" ]; then
        echo "[entrypoint] Pulling latest infra repo at ${INFRA_PATH}..."
        git -C "${INFRA_PATH}" remote set-url origin "${AUTH_REPO}"
        git -C "${INFRA_PATH}" fetch origin "${INFRA_BRANCH}" && \
        git -C "${INFRA_PATH}" checkout "${INFRA_BRANCH}" && \
        git -C "${INFRA_PATH}" pull origin "${INFRA_BRANCH}" || \
        echo "[entrypoint] WARNING: git pull failed, using existing state"
    else
        echo "[entrypoint] Cloning infra repo to ${INFRA_PATH}..."
        mkdir -p "$(dirname "${INFRA_PATH}")"
        git clone --branch "${INFRA_BRANCH}" --single-branch "${AUTH_REPO}" "${INFRA_PATH}" || \
        echo "[entrypoint] WARNING: git clone failed, infra repo not available"
    fi
else
    echo "[entrypoint] Skipping infra repo sync (no valid GH_TOKEN)"
fi

echo "[entrypoint] Starting application..."
exec digital-ai-agents run
