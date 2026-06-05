# Enterprise Test Patterns

## Test Case Structure

Every test case must have:
1. **Unique ID**: `tc-NNN` format (e.g., `tc-001`, `tc-012`)
2. **Name**: Short imperative action phrase
3. **Description**: What is being validated and the expected outcome
4. **Preconditions**: What state must exist before the test starts
5. **Steps**: Numbered sequence of actions
6. **Expected Result**: What constitutes "pass"
7. **Actual Result**: What actually happened (populated during execution)

## Naming Conventions

### Test Case Names
- Use imperative verbs: "Verify", "Validate", "Confirm", "Check"
- Be specific: "Verify login with valid credentials" not "Test login"
- Keep under 60 characters

### Step Descriptions
- Action-oriented: "Click the Submit button"
- Include target element: "Fill email field with test@example.com"
- Note expected outcomes: "Verify success message appears"

## Common Test Patterns

### Authentication Tests
- `tc-001`: Verify SSO login completes successfully
- `tc-002`: Verify session persists after page refresh
- `tc-003`: Verify logout clears session

### Navigation Tests
- `tc-010`: Verify main navigation links are accessible
- `tc-011`: Verify breadcrumb trail accuracy
- `tc-012`: Verify browser back/forward behavior

### Form Tests
- `tc-020`: Verify form submission with valid data
- `tc-021`: Verify form validation errors for required fields
- `tc-022`: Verify form validation errors for invalid formats
- `tc-023`: Verify form reset clears all fields

### Data Display Tests
- `tc-030`: Verify table loads with expected data
- `tc-031`: Verify pagination controls function
- `tc-032`: Verify sort/filter operations
- `tc-033`: Verify search returns relevant results

### Error Handling Tests
- `tc-040`: Verify 404 page for invalid routes
- `tc-041`: Verify error messages for failed operations
- `tc-042`: Verify graceful handling of network errors

### Accessibility Tests
- `tc-050`: Verify keyboard navigation works
- `tc-051`: Verify ARIA labels are present on interactive elements
- `tc-052`: Verify sufficient color contrast

## Pass/Fail Criteria

### Pass
- All expected elements are visible and correctly positioned
- All actions complete without errors
- Page content matches expected values
- No console errors (warnings are acceptable)
- Response time under 5 seconds for page loads

### Fail
- Expected element is missing or not visible
- Action throws an error or times out
- Content does not match expected values
- Critical console errors present
- Page fails to load within 10 seconds

### Skip
- Preconditions cannot be met (e.g., required data not available)
- User explicitly requests skipping
- Feature under test is not deployed in current environment
- Previous dependent test case failed

## Exploratory Testing Approach

When the user requests "test everything" or gives vague instructions:

1. **Start with Critical Paths**: Authentication → Main navigation → Core features
2. **Risk-based Prioritization**: Recently changed features, complex interactions, error-prone areas
3. **Breadth First**: Cover all major pages/features superficially before going deep
4. **Document As You Go**: Every observation becomes a test case

Typical exploratory sequence:
1. Login / Authentication
2. Dashboard / Home page
3. Primary navigation (all top-level routes)
4. Core business functionality (the "happy path")
5. Form submissions and data entry
6. Error states and edge cases
7. Logout and session cleanup

## Test Data Guidelines

- Use realistic but non-sensitive test data
- Never use production credentials
- If the application needs specific test data, ask the user
- For form fields, use clearly fake data: "test.user@example.com", "Test User 123"
- For dates, use future dates to avoid conflicts with existing data

## Timing Standards

| Operation | Expected | Warning | Failure |
|-----------|----------|---------|---------|
| Page load | < 3s | 3-5s | > 5s |
| API response | < 1s | 1-3s | > 3s |
| Animation/transition | < 500ms | 500ms-1s | > 1s |
| Form submission | < 2s | 2-5s | > 5s |
| Search results | < 2s | 2-4s | > 4s |
