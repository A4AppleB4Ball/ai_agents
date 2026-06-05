# Browser service module for UI Testing Agent
# Manages headless Chromium via Playwright, CDP screencast, and event listening

from agent.service.browser.browser_manager import BrowserManager
from agent.service.browser.session_registry import BrowserSession, SessionRegistry
from agent.service.browser.session_store import BrowserSessionStore

__all__ = ["BrowserManager", "BrowserSession", "SessionRegistry", "BrowserSessionStore"]
