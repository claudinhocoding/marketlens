# MarketLens Feature Completion + Product Hardening

## Metadata
- Spec File: `2026-02-12_marketing-analysis-feature-completion.md`
- Status: `In Progress`
- Owner: `itsttm@gmail.com`
- Reviewer Subagent: `reviewer`
- Branch: `feat/marketing-analysis-completion`
- PR: 
- Last Updated: 2026-02-12

## Problem Statement
MarketLens has strong foundations, but several core product gaps prevent it from behaving like a feature-complete marketing analysis platform. The biggest gaps are: mismatched report types between UI/API, missing ingestion for modeled entities (blog posts/events), non-idempotent extraction that causes duplicate records, weak baseline-company selection for gap analysis, and poor user feedback when API actions fail.

## Proposed Solution
Deliver a focused feature-completion pass that:
1. Aligns and expands report generation contracts.
2. Extends extraction and persistence to populate missing intelligence entities.
3. Makes ingestion idempotent for re-scrape/re-extract flows.
4. Adds explicit “my company” controls and baseline selection for comparison analysis.
5. Improves user-facing error handling and API parsing resilience.
6. Validates the implementation with build + API smoke tests using a real-world website target.

## Build Plan
1. Implement report type parity across frontend + backend (`competitive_assessment`, `feature_gap`, `market_positioning`, `market_overview`) with dedicated generation logic.
2. Extend extraction module to support blog posts + events and persist these in scrape/extract API routes.
3. Refactor scrape/extract persistence paths to avoid duplicate linked intelligence records on repeated runs.
4. Add explicit primary company workflow (`is_mine` toggles + compare baseline selector and API support for `myCompanyId`).
5. Improve action-level error handling in key UI flows and harden JSON parsing in compare/report/chat routes.
6. Expand API smoke tests for new report modes and run the full suite with a real target URL.

## Considerations
- Keep implementation simple and incremental; avoid large architectural rewrites.
- Maintain compatibility with current InstantDB schema (no migration required for this scope).
- Ensure idempotent replace logic doesn’t delete the company root entity.
- Avoid long synchronous operations in UI by surfacing progress/errors clearly.
- Real-data tests are network and LLM dependent; include explicit evidence in notes.

## Testing Criteria (Required)
### Automated Checks
- [ ] Build passes (`npm run build`)
- [ ] API smoke tests pass (`API_TEST_URL=https://www.intercom.com npm run test:api`)
- [ ] Report suite validates new report modes (`npm run test:api:report`)

### Manual Verification
- [ ] Reports page exposes only implemented report types and each generates distinct content.
- [ ] Re-running scrape/extract on the same company does not create duplicate feature/pricing/marketing/product/blog/event/contact records.
- [ ] Company can be marked/unmarked as “Your Company”, and compare baseline selection influences gap analysis.
- [ ] Dashboard/compare/reports/insights actions show visible errors on failed API responses.

### Evidence
- [ ] Test output captured in session notes
- [ ] API validation includes real-world target URL

## Tasks
```json
[
  {
    "createdTimestamp": "2026-02-13T01:24:00Z",
    "name": "Align and expand report type contract",
    "description": "Implement feature_gap + market_positioning report generation backend support and align Reports UI options with supported report modes.",
    "status": "completed",
    "completionTimestamp": "2026-02-13T01:29:00Z",
    "commitHash": "98dd9af"
  },
  {
    "createdTimestamp": "2026-02-13T01:24:00Z",
    "name": "Extend extraction coverage and persistence",
    "description": "Add blog post and events extraction, and persist these entities in scrape/extract flows.",
    "status": "pending",
    "completionTimestamp": "",
    "commitHash": ""
  },
  {
    "createdTimestamp": "2026-02-13T01:24:00Z",
    "name": "Make ingestion idempotent for existing companies",
    "description": "Refactor scrape/extract write paths so repeated runs replace existing linked intel instead of duplicating records.",
    "status": "pending",
    "completionTimestamp": "",
    "commitHash": ""
  },
  {
    "createdTimestamp": "2026-02-13T01:24:00Z",
    "name": "Add primary company workflow for comparisons",
    "description": "Add UI controls for is_mine and compare baseline selector; wire compare API to accept myCompanyId.",
    "status": "pending",
    "completionTimestamp": "",
    "commitHash": ""
  },
  {
    "createdTimestamp": "2026-02-13T01:24:00Z",
    "name": "Improve resilience, UX errors, and validation coverage",
    "description": "Add explicit API error handling across key UI actions, harden server-side parsing, extend smoke tests, and run full validation with real data.",
    "status": "pending",
    "completionTimestamp": "",
    "commitHash": ""
  }
]
```

## PR Review Comments
- Pending.

## Implementation Notes
- 2026-02-12: Ran planner/scout/reviewer subagents to identify release gaps and prioritize implementation.
- 2026-02-12: Started feature-completion implementation branch and initialized BoringPM spec.
- 2026-02-12: Completed report contract parity by implementing feature gap + market positioning generators and exposing market overview in Reports UI.
