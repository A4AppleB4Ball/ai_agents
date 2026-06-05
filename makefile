TAG ?= dev-latest
IMAGE ?= digital-ai-agents

NEXT_PUBLIC_API_URL ?= http://localhost:8010/agent/v1
NEXT_PUBLIC_WS_URL ?= ws://localhost:8010/agent/v1/chat/ws
NEXT_PUBLIC_DEFAULT_MODEL ?= claude-sonnet-4-6-20250514

.DEFAULT_GOAL := help

.PHONY: help build build-app build-web start stop restart logs clean status dev install init-storage show-storage run-web run-backend up down log reboot reset-data

help: ## Show this help message
	@echo "Digital-AI-Agents - Available commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Storage commands
init-storage: ## Initialize local runtime directories
	mkdir -p logs cache data

show-storage: ## Show local workspace storage location
	@echo "$$(pwd)/data -> mounted to /home/agent/.digital-ai-agents in Docker"

# Development commands
run-web: ## Run frontend in development mode
	cd web && npm run dev

run-backend: ## Run backend in development mode
	python main.py

dev: ## Run both frontend and backend in development mode
	@echo "Starting development servers..."
	@echo "Backend: http://localhost:8010"
	@echo "Frontend: http://localhost:3000"
	@echo "Press Ctrl+C to stop"
	@make -j2 run-web run-backend

install: ## Install all dependencies
	@echo "Installing backend dependencies..."
	pip install -r agent/requirements.txt
	@echo "Installing frontend dependencies..."
	cd web && npm install

# Docker build commands
build: build-app build-web ## Build both backend and frontend Docker images

build-app: ## Build backend Docker image (uses BuildKit)
	DOCKER_BUILDKIT=1 docker build \
		-f deploy/Dockerfile \
		-t $(IMAGE):app-$(TAG) \
		.

build-web: ## Build frontend Docker image (BuildKit disabled — workaround for Next 16 + macOS perm issue)
	DOCKER_BUILDKIT=0 docker build \
		--build-arg NEXT_PUBLIC_API_URL=$(NEXT_PUBLIC_API_URL) \
		--build-arg NEXT_PUBLIC_WS_URL=$(NEXT_PUBLIC_WS_URL) \
		--build-arg NEXT_PUBLIC_DEFAULT_MODEL=$(NEXT_PUBLIC_DEFAULT_MODEL) \
		-t $(IMAGE):web-$(TAG) \
		web/

# Docker compose commands
start: ## Start all services with Docker
	@if ! docker network inspect net >/dev/null 2>&1; then \
		echo "Creating Docker network 'net'..."; \
		docker network create net; \
	fi
	TAG=$(TAG) IMAGE=$(IMAGE) docker compose -f deploy/docker-compose.yml up -d
	@echo ""
	@echo "Digital-AI-Agents is running"
	@echo "Backend:  http://localhost:8010"
	@echo "Frontend: http://localhost:3000"
	@echo "Logs:     make logs"

stop: ## Stop all Docker services
	TAG=$(TAG) IMAGE=$(IMAGE) docker compose -f deploy/docker-compose.yml down

restart: stop start ## Restart all Docker services

logs: ## Show Docker service logs
	TAG=$(TAG) IMAGE=$(IMAGE) docker compose -f deploy/docker-compose.yml logs -f

status: ## Show Docker service status
	TAG=$(TAG) IMAGE=$(IMAGE) docker compose -f deploy/docker-compose.yml ps

clean: ## Clean up Docker resources
	TAG=$(TAG) IMAGE=$(IMAGE) docker compose -f deploy/docker-compose.yml down -v
	docker system prune -f

# Legacy aliases
up: start ## Legacy alias for start
down: stop ## Legacy alias for stop
log: logs ## Legacy alias for logs
reboot: restart ## Legacy alias for restart

# Data management
reset-data: ## Reset local persisted runtime data (WARNING: deletes ./data and ./cache)
	@echo "WARNING: this will delete ./data and ./cache"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo ""; \
		echo "Stopping services..."; \
		TAG=$(TAG) IMAGE=$(IMAGE) docker compose -f deploy/docker-compose.yml down; \
		echo "Removing local data directories..."; \
		rm -rf ./data ./cache; \
		mkdir -p ./data ./cache; \
		echo "Starting services..."; \
		TAG=$(TAG) IMAGE=$(IMAGE) docker compose -f deploy/docker-compose.yml up -d; \
		echo "Data reset complete"; \
	else \
		echo ""; \
		echo "Cancelled"; \
	fi
