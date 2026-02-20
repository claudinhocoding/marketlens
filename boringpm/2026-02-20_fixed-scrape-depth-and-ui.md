# Fix Scrape Depth to 5 and Simplify Add Company UI

## Metadata
- Spec File: `2026-02-20_fixed-scrape-depth-and-ui.md`
- Status: `In Progress`
- Owner: `windows95`
- Reviewer Subagent: `reviewer`
- Branch: `feat/fix-scrape-depth-5`
- PR: `TBD`
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
- [ ] Lint passes (`npm run lint`)
- [ ] Build passes (`npm run build`)
- [ ] API smoke tests pass (`API_TEST_URL=https://www.intercom.com API_TEST_TIMEOUT_MS=600000 npm run test:api`)

### Manual Verification
- [ ] Dashboard add-company flow has no depth dropdown.
- [ ] `/api/scrape` still succeeds and returns populated `subPages`.
- [ ] Social profile extraction still returns LinkedIn/Twitter/X/YouTube/Facebook/GitHub when present.

### Evidence
- [ ] Test output attached to PR

## Tasks
```json
[
  {
    "createdTimestamp": "2026-02-20T19:45:00Z",
    "name": "Create spec and issue tracking",
    "description": "Add boringpm spec and create bd issue for fixed-depth scrape change.",
    "status": "pending",
    "completionTimestamp": "",
    "commitHash": ""
  },
  {
    "createdTimestamp": "2026-02-20T19:45:00Z",
    "name": "Remove depth selector and enforce depth 5 on scrape API",
    "description": "Simplify dashboard input and force backend scrape depth to 5.",
    "status": "pending",
    "completionTimestamp": "",
    "commitHash": ""
  },
  {
    "createdTimestamp": "2026-02-20T19:45:00Z",
    "name": "Validate, review, and merge",
    "description": "Run checks, open PR, run reviewer subagent, address comments, and merge.",
    "status": "pending",
    "completionTimestamp": "",
    "commitHash": ""
  }
]
```

## PR Review Comments
- Pending.

## Implementation Notes
- 2026-02-20: Spec initialized for fixed-depth scrape behavior.
