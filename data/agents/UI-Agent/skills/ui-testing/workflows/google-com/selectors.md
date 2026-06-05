# Google Search — Selectors

Stable selectors for Google Search elements. Updated as Google's DOM changes.

## Homepage

| Element | Selector | Notes |
|---------|----------|-------|
| Search input | `textarea[name="q"]` | Main search textarea |
| Search button | `input[name="btnK"]` | "Google Search" button |
| Lucky button | `input[name="btnI"]` | "I'm Feeling Lucky" button |
| Logo | `img[alt="Google"]` | Google logo |

## Search Results Page

| Element | Selector | Notes |
|---------|----------|-------|
| Results container | `div#search` | Main results wrapper |
| Result headings | `div#search a h3` | Individual result titles |
| Result links | `div#search a[href]` | Clickable result URLs |
| Result snippets | `div#search div[data-sncf] span` | Result description text |
| People also ask | `div[data-sgrd]` | Related questions section |
| Next page | `a#pnnext` | Pagination next |
| Search tools | `div#hdtb` | Tools bar (All, Images, Videos, etc.) |
| Result stats | `div#result-stats` | "About X results" text |

## Common Patterns

- Search suggestions dropdown: `ul[role="listbox"] li`
- Knowledge panel (right side): `div.kp-wholepage`
- Image results carousel: `div[data-lpage]`
