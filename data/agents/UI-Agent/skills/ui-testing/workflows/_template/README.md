# Workflow Template

Each workflow is a **folder** representing one product/application to test.

## Folder Structure

```
workflows/
  └── {product-slug}/
      ├── workflow.md          # Main workflow: test cases, priorities, pass criteria
      ├── selectors.md         # Stable CSS/aria selectors for key elements
      ├── test-data.md         # Input data, expected outputs, user credentials (non-secret)
      ├── pages.md             # Page map: URLs, layout descriptions, navigation paths
      ├── references/          # Additional context (screenshots, specs, API docs)
      │   ├── login-flow.md
      │   └── checkout-flow.md
      └── knowledge.md         # Learned quirks, timing issues, known bugs
```

## Naming Convention

Folder name = site hostname with dots replaced by hyphens:
- `google-com` for google.com
- `amazon-com` for amazon.com
- `dev-portal-internal-net` for dev-portal.internal.net

## workflow.md Frontmatter

```yaml
---
site: https://www.example.com
name: Example App
description: What this application does
auth: none | sso | basic | token
preconditions:
  - Any setup required before testing
---
```

## Guidelines

1. Each test case has a unique ID: `tc-NNN`
2. Include explicit selectors in `selectors.md` — the sub-agent uses these
3. Define clear pass/fail criteria for every test case
4. Order by priority (critical first)
5. One action per step — keep steps atomic
6. Include navigation explicitly (never assume the browser state)
7. Note timing-sensitive operations (animations, lazy loading, API calls)
8. If a test depends on another, note the dependency
9. Store large test data sets in `test-data.md` — not inline in workflow.md
10. Update `knowledge.md` after each run with new findings
