# Fix Scrape Depth to 5 and Simplify Add Company UI

## Metadata
- Spec File: `2026-02-20_fixed-scrape-depth-and-ui.md`
- Status: `Ready for Review`
- Owner: `windows95`
- Reviewer Subagent: `reviewer`
- Branch: `feat/fix-scrape-depth-5`
- PR: `https://github.com/claudinhocoding/marketlens/pull/3`
- Last Updated: 2026-02-20

## Problem Statement
The dashboard currently lets users choose scrape depth 1-5. Product direction is to always run the deepest crawl level for better coverage, so the depth selector should be removed and the backend should enforce depth 5 regardless of client input.

## Proposed Solution
- Remove depth state and selector from the add-company UI.
- Update `/api/scrape` to always call the scraper with depth 5.
- Keep API request shape compatible (ignore any optional depth client sends).

## Build Plan
1. Create and track this change in boringpm + bd.
2. Update dashboard UI to remove depth selection.
3. Enforce depth 5 server-side in `src/app/api/scrape/route.ts`.
4. Run lint/build/API smoke tests.
5. Open PR, run reviewer subagent, fix findings, merge.

## Considerations
- Keep behavior consistent for any external/script callers still passing `depth`.
- Always-on depth 5 increases scrape runtime; this is intentional for quality.
- No schema migration needed.

## Testing Criteria (Required)
### Automated Checks
- [x] Lint passes (`npm run lint`)
- [x] Build passes (`npm run build`)
- [x] API smoke tests pass (`API_TEST_URL=https://www.intercom.com API_TEST_TIMEOUT_MS=600000 npm run test:api`)

### Manual Verification
- [x] Dashboard add-company flow has no depth dropdown.
- [x] `/api/scrape` still succeeds and returns populated `subPages`.
- [x] Social profile extraction still returns LinkedIn/Twitter/X/YouTube/Facebook/GitHub when present.

### Evidence
- [x] Test output attached to PR

## Tasks
```json
[
  {
    "createdTimestamp": "2026-02-20T19:45:00Z",
    "name": "Create spec and issue tracking",
    "description": "Add boringpm spec and create bd issue for fixed-depth scrape change.",
    "status": "completed",
    "completionTimestamp": "2026-02-20T02:39:00Z",
    "commitHash": "829fc56"
  },
  {
    "createdTimestamp": "2026-02-20T19:45:00Z",
    "name": "Remove depth selector and enforce depth 5 on scrape API",
    "description": "Simplify dashboard input and force backend scrape depth to 5.",
    "status": "completed",
    "completionTimestamp": "2026-02-20T02:41:00Z",
    "commitHash": "9a6b4ed"
  },
  {
    "createdTimestamp": "2026-02-20T19:45:00Z",
    "name": "Validate, review, and merge",
    "description": "Run checks, open PR, run reviewer subagent, address comments, and merge.",
    "status": "in_progress",
    "completionTimestamp": "",
    "commitHash": ""
  }
]
```

## PR Review Comments
- [NON-BLOCKING] Avoid duplicated depth policy literals; centralize depth constant.
- [NON-BLOCKING] Add crawl wall-clock budget handling to reduce timeout risk on deep crawls.
- [APPROVAL] Final reviewer pass: approved with no critical blockers.

## Implementation Notes
- 2026-02-20: Spec initialized for fixed-depth scrape behavior.
- 2026-02-20: Removed depth dropdown from dashboard and forced depth policy for `/api/scrape` and `/api/extract`.
- 2026-02-20: Added `DEFAULT_SCRAPE_DEPTH` and crawl budget enforcement (`MARKETLENS_SCRAPE_BUDGET_MS`) with partial-result truncation metadata.
- 2026-02-20: Social profile extraction remains link-pattern based for LinkedIn, Twitter/X, YouTube, Facebook, and GitHub.
- 2026-02-20: Validation completed with lint, build, and full API smoke run.
