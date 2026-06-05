# Google Search — Test Data

## Search Queries

| ID | Query | Expected in results |
|----|-------|-------------------|
| q-001 | Playwright browser automation | playwright.dev |
| q-002 | Playwright documentation | playwright.dev/docs |
| q-003 | OpenAI | openai.com |
| q-004 | React framework | react.dev |

## Timing Expectations

| Action | Max wait |
|--------|----------|
| Page load | 5s |
| Search results render | 8s |
| Navigation to result | 10s |
| Back navigation | 5s |

## Known Behaviors

- Google may show consent/cookie banner on first visit in headless mode
  - Accept button selector: `button#L2AGLb` or `[aria-label="Accept all"]`
- Google may show CAPTCHA if too many requests from same IP
  - If detected: fail the test case with "CAPTCHA detected" error
- Search suggestions appear after ~300ms of typing — wait for them to settle before pressing Enter
