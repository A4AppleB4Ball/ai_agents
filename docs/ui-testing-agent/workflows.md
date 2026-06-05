# Workflows

Workflows define structured test plans for specific websites. Each workflow is a folder containing all the information the agent needs to test a target application: test cases, selectors, test data, page maps, and accumulated knowledge.

## Folder Structure

Workflows live at:
```
data/agents/UI-Agent/skills/ui-testing/workflows/
```

Each site gets its own folder following this structure:

```
workflows/
  ├── _template/
  │   └── README.md              # Template documentation (this reference)
  │
  └── {product-slug}/
      ├── workflow.md             # Main workflow: test cases, priorities, pass criteria
      ├── selectors.md           # Stable CSS/aria selectors for key elements
      ├── test-data.md           # Input data, expected outputs, timing expectations
      ├── pages.md               # Page map: URLs, layout descriptions, navigation paths
      ├── knowledge.md           # Learned quirks, timing issues, known bugs
      └── references/            # (Optional) Additional context documents
          ├── login-flow.md
          └── checkout-flow.md
```

## Naming Convention

The folder name is derived from the site hostname:

1. Extract the hostname from the URL (e.g., `www.google.com`)
2. Remove the `www.` prefix if present (e.g., `google.com`)
3. Replace dots with hyphens (e.g., `google-com`)

Examples:
| URL | Folder Name |
|-----|-------------|
| `https://www.google.com` | `google-com` |
| `https://amazon.com` | `amazon-com` |
| `https://dev-portal.internal.net` | `dev-portal-internal-net` |
| `https://app.staging.example.io` | `app-staging-example-io` |

## File Reference

### workflow.md

The main test definition file. Contains all test cases organized by priority.

**Frontmatter:**

```yaml
---
site: https://www.google.com
name: Google Search
description: Google Search engine - validates search functionality, result rendering, and navigation
auth: none | sso | basic | token
preconditions:
  - No authentication required
  - Chromium browser session active
---
```

| Field | Type | Description |
|-------|------|-------------|
| `site` | URL | Base URL of the target application |
| `name` | string | Human-readable application name |
| `description` | string | Brief description of what the application does |
| `auth` | enum | Authentication method: `none`, `sso`, `basic`, `token` |
| `preconditions` | list | Setup requirements before testing can begin |

**Test Case Format:**

```markdown
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
```

**Guidelines for test cases:**
- Each test case has a unique ID: `tc-NNN`
- Order by priority: `critical` > `high` > `medium` > `low`
- One action per step (keep steps atomic)
- Include navigation explicitly (never assume browser state)
- Note timing-sensitive operations (animations, lazy loading)
- If a test depends on another, note the dependency explicitly

---

### selectors.md

Stable CSS selectors for key page elements. The agent uses these to interact with the page reliably.

**Format:**

```markdown
# {Site Name} - Selectors

## {Page Name}

| Element | Selector | Notes |
|---------|----------|-------|
| Search input | `textarea[name="q"]` | Main search textarea |
| Search button | `input[name="btnK"]` | "Google Search" button |
| Results container | `div#search` | Main results wrapper |
```

**Selector priority (most stable to least stable):**
1. `[data-testid="..."]` - Test-specific attributes (most stable)
2. `[name="..."]` - HTML name attributes
3. `#elementId` - IDs (stable if not auto-generated)
4. `[aria-label="..."]` - Accessibility labels
5. `tag.className` - Structural selectors (least stable)

**Best practices:**
- Avoid auto-generated IDs (e.g., `#react-root-12345`)
- Prefer attribute selectors over class-based selectors
- Document when selectors are known to be unstable
- Update after each run if selectors fail
- Include notes about why a specific selector was chosen

---

### test-data.md

Input data, expected outputs, and timing expectations.

**Format:**

```markdown
# {Site Name} - Test Data

## Search Queries

| ID | Query | Expected in results |
|----|-------|-------------------|
| q-001 | Playwright browser automation | playwright.dev |
| q-002 | React framework | react.dev |

## Timing Expectations

| Action | Max wait |
|--------|----------|
| Page load | 5s |
| Search results render | 8s |
| Navigation to result | 10s |

## Known Behaviors

- Cookie consent banner appears on first visit in headless mode
  - Accept button selector: `button#L2AGLb`
- CAPTCHA triggers if too many requests from same IP
  - If detected: fail the test case with "CAPTCHA detected" error
```

**Purpose:**
- Separates test data from test logic (workflow.md stays focused on flow)
- Makes it easy to add new data sets without modifying test cases
- Documents timing expectations for `browser_wait_for` timeouts
- Captures known behavioral quirks that affect test execution

---

### pages.md

Page map describing application structure and navigation paths.

**Format:**

```markdown
# {Site Name} - Page Map

## Pages

### Homepage
- **URL:** `https://www.google.com`
- **Purpose:** Search entry point
- **Key elements:** Search textarea, Search button, I'm Feeling Lucky button
- **Navigation:** Submit search -> Results page

### Search Results
- **URL:** `https://www.google.com/search?q={query}`
- **Purpose:** Display search results
- **Key elements:** Results list, headings, snippets, pagination
- **Navigation:** Click result -> External page; Click "Next" -> Page 2

## Navigation Flow

Homepage -> [submit search] -> Results Page
Results Page -> [click result] -> External Page
Results Page -> [click "Next"] -> Results Page (page 2)
External Page -> [browser back] -> Results Page
```

**Purpose:**
- Gives the agent a mental model of the application structure
- Defines URL patterns for validation in pass criteria
- Maps navigation paths for multi-page test flows
- Identifies key elements per page for quick reference

---

### knowledge.md

Accumulated learnings from test runs. Updated after each session with new findings.

**Format:**

```markdown
# {Site Name} - Knowledge Base

## Known Issues

- **Cookie consent banner**: Appears on first visit in headless mode in EU regions.
  Must dismiss before interacting with search.
- **CAPTCHA triggers**: Rapid repeated searches from same IP.
  Space searches >2s apart.

## Timing Notes

- Search suggestions dropdown appears ~300ms after typing starts
- Results page renders progressively - wait for `div#search` not just page load

## Selector Stability

- `textarea[name="q"]` - STABLE (years)
- `div#search` - STABLE
- Snippet selectors (`data-sncf`) change periodically - verify each run
```

**Purpose:**
- Prevents repeating the same mistakes across runs
- Documents timing-sensitive operations and appropriate waits
- Tracks selector stability over time
- Records workarounds for known issues

---

## How the Agent Loads Workflows

When the agent receives a test request, it follows this process:

### Phase 0: Workflow Resolution

1. **URL provided** (e.g., "Test google.com"):
   - Extract hostname: `www.google.com`
   - Remove `www.`: `google.com`
   - Convert to slug: `google-com`
   - Look for: `workflows/google-com/workflow.md`

2. **Workflow found**:
   - Read `workflow.md` (test cases and flow)
   - Read `selectors.md` (stable element selectors)
   - Read `test-data.md` (input data and expected outputs)
   - Read `pages.md` (page map and navigation)
   - Read `knowledge.md` (quirks and timing issues)
   - Present test plan to user for confirmation

3. **No workflow found**:
   - Inform user: "No saved workflow for this site."
   - Ask what flows/features to test
   - Execute based on user instructions
   - After successful run, offer to save as a new workflow

### Phase 1: Test Planning

The agent parses all `tc-NNN` entries from the workflow and presents:

```
Test Plan for Google Search:
  tc-001: Basic Search [critical]
  tc-002: Result Validation [high]
  tc-003: Navigation - Click Result and Return [high]
Ready to execute? (yes/no/modify)
```

### Phase 2: Execution

During execution, the agent:
- Uses selectors from `selectors.md` for stable element targeting
- References `test-data.md` for input values and timing expectations
- Follows navigation paths from `pages.md`
- Applies workarounds from `knowledge.md`

---

## Example Walkthrough: Google Search

The `google-com` workflow demonstrates a complete workflow implementation.

### Folder Contents

```
workflows/google-com/
  ├── workflow.md      # 3 test cases (search, validation, navigation)
  ├── selectors.md     # Homepage + Results page selectors
  ├── test-data.md     # Search queries, timing expectations
  ├── pages.md         # Homepage, Results, Image Results pages
  └── knowledge.md     # Cookie banner, CAPTCHA, selector stability
```

### Test Execution Flow

```
1. Agent reads workflow.md -> Finds 3 test cases (tc-001, tc-002, tc-003)
2. Agent presents plan to user -> User confirms "yes"
3. Agent reads selectors.md -> Knows `textarea[name="q"]` for search input
4. Agent reads knowledge.md -> Knows to wait for `div#search` not just page load
5. Agent reads test-data.md -> Uses "Playwright browser automation" as query

Execution:
  browser_open(url="https://www.google.com", session_name="tc-001")
  browser_snapshot(session_id)  -> sees search input [e2]
  browser_click(session_id, selector='textarea[name="q"]')
  browser_type(session_id, selector='textarea[name="q"]', text="Playwright browser automation", submit=true)
  browser_wait_for(session_id, selector="div#search", timeout_ms=8000)
  browser_evaluate(session_id, expression="document.querySelectorAll('div#search a h3').length")
  record_test_step(session_id, case_id="tc-001", step_name="Results displayed", status="pass")
  ...
  finalize_run(run_id="run-001")
  browser_close(session_id)
```

---

## Creating a New Workflow

### Step 1: Create the Folder

```
workflows/{slug}/
```

### Step 2: Write workflow.md

Start with the frontmatter, then define test cases:

```markdown
---
site: https://your-app.com
name: Your Application
description: What it does
auth: sso
preconditions:
  - User must be authenticated via SSO
  - Application must be in "staging" environment
---

# Your Application Test Workflow

## Test Cases

### tc-001: Login and Dashboard Load
**Goal:** Verify successful authentication and dashboard rendering
**Priority:** critical

**Steps:**
1. Navigate to `https://your-app.com`
2. Wait for SSO redirect
3. Complete SSO authentication
4. Wait for dashboard to load
5. Verify key metrics are displayed

**Pass criteria:**
- Dashboard URL matches expected pattern
- At least one metric card is visible
- No JavaScript errors in console
```

### Step 3: Document Selectors

Inspect the application and document stable selectors:

```markdown
# Your Application - Selectors

## Login Page

| Element | Selector | Notes |
|---------|----------|-------|
| Username | `input[name="email"]` | Email input field |
| Password | `input[name="password"]` | Password field |
| Submit | `button[type="submit"]` | Login button |

## Dashboard

| Element | Selector | Notes |
|---------|----------|-------|
| Metrics grid | `[data-testid="metrics-grid"]` | Main KPI cards |
| User avatar | `button[aria-label="User menu"]` | Profile dropdown trigger |
```

### Step 4: Add Test Data

```markdown
# Your Application - Test Data

## Users

| ID | Email | Role | Notes |
|----|-------|------|-------|
| u-001 | test@example.com | admin | Full access |
| u-002 | viewer@example.com | viewer | Read-only |

## Expected Values

| Metric | Minimum | Maximum |
|--------|---------|---------|
| Active users | 1 | N/A |
| Uptime | 99.0% | 100% |
```

### Step 5: Map Pages

```markdown
# Your Application - Page Map

## Pages

### Login
- **URL:** `https://your-app.com/login`
- **Purpose:** Authentication entry point
- **Navigation:** Submit credentials -> Dashboard

### Dashboard
- **URL:** `https://your-app.com/dashboard`
- **Purpose:** Main overview with KPIs
- **Navigation:** Click metric -> Detail view
```

### Step 6: Initialize Knowledge

```markdown
# Your Application - Knowledge Base

## Known Issues

(To be updated after first test run)

## Timing Notes

(To be updated after first test run)

## Selector Stability

(To be updated after first test run)
```

---

## Workflow Maintenance

### After Each Run

1. **Update knowledge.md** with new findings:
   - Timing issues discovered
   - Selector changes
   - New edge cases
   - Workarounds applied

2. **Update selectors.md** if any selectors broke:
   - Document the old selector that failed
   - Document the new selector that works
   - Note whether it was a one-off change or a pattern

3. **Update test-data.md** if expected values changed:
   - New timing expectations based on observed performance
   - Updated expected content

### Periodic Review

- Check selector stability monthly
- Remove test cases for deprecated features
- Add test cases for new features
- Review and prune knowledge.md (remove resolved issues)
