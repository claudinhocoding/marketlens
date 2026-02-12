# README Cleanup + API Validation Scripts

## Metadata
- Spec File: `2026-02-12_api-feature-validation-scripts.md`
- Status: `Ready for Review`
- Owner: `itsttm@gmail.com`
- Reviewer Subagent: 
- Branch: `main`
- PR: 
- Last Updated: 2026-02-12

## Problem Statement
The README still references Python backend modules that no longer exist in this repository, which creates onboarding confusion. We also need reliable API-level validation scripts (non-UI) to check whether each major feature endpoint is returning valid responses.

## Proposed Solution
1. Update README architecture/docs to remove Python references and describe the current TypeScript-only implementation.
2. Add API smoke-test scripts that call each core endpoint and assert expected response shapes.
3. Add one command to run all API smoke tests in sequence.

## Build Plan
1. Update `README.md` architecture/setup sections to remove outdated Python mentions.
2. Build a shared Node script utility for API requests + assertion helpers.
3. Add endpoint-specific smoke tests for:
   - `/api/scrape`
   - `/api/extract`
   - `/api/compare` (default + mode variants)
   - `/api/report` (competitive + market overview + assessment)
   - `/api/chat`
4. Add a single all-in-one runner script and npm scripts for each test.
5. Document how to run the scripts and required environment variables.

## Considerations
- These are integration smoke tests that hit live API routes, so they require a running dev server and valid env keys.
- `/api/scrape` and `/api/extract` may take longer due to scraping and LLM extraction latency.
- Tests should fail fast with clear error messages to simplify debugging.
- Avoid changing endpoint logic in this task; focus is validation tooling and docs accuracy.

## Testing Criteria (Required)
### Automated Checks
- [ ] Lint passes (`npm run lint`) *(blocked: Next.js prompted for initial ESLint setup because no ESLint config exists yet)*
- [x] Build/compile passes (`npm run build`)
- [x] API smoke tests run (`npm run test:api`)

### Manual Verification
- [x] README no longer claims Python backend modules exist.
- [x] `npm run test:api:scrape` validates scrape endpoint response shape.
- [x] `npm run test:api:extract` validates extraction endpoint response shape.
- [x] `npm run test:api:compare` validates comparison endpoint response shape for all modes.
- [x] `npm run test:api:report` validates report endpoint response shape for all report types.
- [x] `npm run test:api:chat` validates chat endpoint response shape.

### Evidence
- [x] Test output captured in session notes
- [x] Any failures include endpoint + status + response excerpt

## Tasks
```json
[
  {
    "createdTimestamp": "2026-02-12T20:01:00Z",
    "name": "Remove outdated Python references from README",
    "description": "Update README architecture and setup docs to reflect the TypeScript-only backend implementation.",
    "status": "completed",
    "completionTimestamp": "2026-02-12T20:06:00Z",
    "commitHash": "0d5bf9f"
  },
  {
    "createdTimestamp": "2026-02-12T20:02:00Z",
    "name": "Add API smoke-test scripts for core features",
    "description": "Create endpoint-level scripts and npm commands to validate API responses for scrape, extract, compare, report, and chat.",
    "status": "completed",
    "completionTimestamp": "2026-02-12T20:24:00Z",
    "commitHash": "b5031db"
  }
]
```

## PR Review Comments
- Pending.

## Implementation Notes
- 2026-02-12: Spec initialized.
- 2026-02-12: Updated README to remove outdated Python architecture/setup/module references.
- 2026-02-12: Added API smoke-test suite scripts for scrape, extract, compare, report, and chat routes with response-shape assertions.
- 2026-02-12: Validation run succeeded via `npm run test:api` against local dev server (`npm run dev`).
