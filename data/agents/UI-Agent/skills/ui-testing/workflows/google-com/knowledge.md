# Google Search — Knowledge Base

Accumulated learnings from test runs. Update after each session.

## Known Issues

- **Cookie consent banner**: Appears on first visit in headless mode in EU regions. Must dismiss before interacting with search.
- **CAPTCHA triggers**: Rapid repeated searches from same IP. Space searches >2s apart.
- **Dynamic element IDs**: Google uses auto-generated IDs on many elements — prefer `name`, `aria-label`, and structural selectors over IDs.

## Timing Notes

- Search suggestions dropdown appears ~300ms after typing starts
- Results page renders progressively — wait for `div#search` not just page load
- "People also ask" section loads lazily after initial results

## Selector Stability

- `textarea[name="q"]` — STABLE (years)
- `div#search` — STABLE
- `div#search a h3` — STABLE for organic results
- `input[name="btnK"]` — STABLE
- Snippet selectors (`data-sncf`) change periodically — verify each run
