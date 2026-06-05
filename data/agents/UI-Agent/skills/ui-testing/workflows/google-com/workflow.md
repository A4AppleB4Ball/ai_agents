---
site: https://www.google.com
name: Google Search
description: Google Search engine — validates search functionality, result rendering, and navigation
auth: none
preconditions:
  - No authentication required
  - Chromium browser session active
---

# Google Search Test Workflow

## Test Cases

### tc-001: Basic Search
**Goal:** Validate that a user can perform a basic search query and receive results
**Priority:** critical

**Steps:**
1. Navigate to `https://www.google.com`
2. Wait for search input to be visible
3. Click the search input
4. Type "Playwright browser automation" into the search input
5. Press Enter to submit the search
6. Wait for results page to load
7. Capture screenshot of search results

**Pass criteria:**
- Search results container is visible
- At least one result link is present with a heading
- Page title contains "Playwright browser automation"
- URL contains `search?q=` or `/search?`

### tc-002: Result Validation
**Goal:** Verify that search results contain relevant links and snippets
**Priority:** high

**Steps:**
1. Navigate to `https://www.google.com`
2. Click the search input
3. Type "Playwright browser automation" into the search input
4. Press Enter to submit the search
5. Wait for results page to load
6. Extract all result headings
7. Extract all result snippets
8. Capture screenshot of results

**Pass criteria:**
- At least 5 result links are displayed
- At least one result heading contains "Playwright" (case-insensitive)
- Each result has a visible URL citation
- Results container does not show an error or empty state

### tc-003: Navigation — Click Result and Return
**Goal:** Verify that clicking a search result navigates correctly and back navigation works
**Priority:** high

**Steps:**
1. Navigate to `https://www.google.com`
2. Click the search input
3. Type "Playwright documentation" into the search input
4. Press Enter to submit the search
5. Wait for results page to load
6. Capture screenshot of results page (pre-click state)
7. Click the first result link
8. Wait for navigation to complete (URL should change from google.com)
9. Capture screenshot of destination page
10. Assert the page loaded successfully (no network error, page has content)
11. Navigate back using browser back
12. Wait for Google results page to reload
13. Capture screenshot confirming return to results

**Pass criteria:**
- Clicking the first result navigates away from google.com
- Destination page loads without errors (HTTP 200, page has content)
- Browser back returns to the Google search results page
- After returning, the original search results are still visible
