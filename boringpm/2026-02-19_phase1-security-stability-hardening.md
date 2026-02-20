# Phase 1: Security + Stability Hardening

## Metadata
- Spec File: `2026-02-19_phase1-security-stability-hardening.md`
- Status: `Ready for Review`
- Owner: `windows95`
- Reviewer Subagent: `reviewer`
- Branch: `feat/refactor-security-stability-phase1`
- PR: `https://github.com/claudinhocoding/marketlens/pull/2`
- Last Updated: 2026-02-19

## Problem Statement
MarketLens currently has three critical hardening gaps:
1. InstantDB permissions are empty.
2. API endpoints are callable without session/auth guards and without abuse throttling.
3. Linting/CI and LLM output parsing are inconsistent, increasing regression risk.

These issues create production risk (open write paths, scrape/LLM abuse, and brittle parsing behavior).

## Proposed Solution
Implement a focused Phase 1 hardening pass that:
- sets explicit InstantDB permission rules,
- adds session/auth guard + rate limiting in all API routes,
- configures lint + CI quality gates,
- centralizes Claude requests with strict JSON schema validation.

## Build Plan
1. Initialize tracking issues in `bd` (epic + dependency-linked tasks).
2. Add explicit InstantDB permissions and guest auth bootstrap to preserve client UX.
3. Implement shared API guard utilities and apply to all route handlers.
4. Add route-level rate limiting controls using a shared limiter.
5. Configure ESLint and CI checks.
6. Introduce shared LLM client + schema parsing utilities and refactor extraction/analysis/report/chat modules.
7. Run full validation, update spec, open PR, request subagent review, address findings, and merge.

## Considerations
- Keep guest-mode UX functional while requiring authenticated Instant sessions.
- Avoid breaking existing API smoke tests by adding test-safe auth bypass controls.
- Rate limiting is in-memory in this phase (per-instance); distributed limiter can follow in phase 2.
- Preserve backward compatibility of current response contracts.

## Testing Criteria (Required)
### Automated Checks
- [x] Lint passes (`npm run lint`)
- [x] Build passes (`npm run build`)
- [x] API smoke tests pass (`API_TEST_URL=https://www.intercom.com API_TEST_TIMEOUT_MS=600000 npm run test:api`)

### Manual Verification
- [x] API requests without valid session/auth are rejected with `401`.
- [x] Repeated requests beyond limits return `429` with retry metadata.
- [x] Dashboard/compare/reports/agent still function after guest bootstrap and auth headers are attached via `postApiJson`.
- [x] LLM-backed endpoints return valid structured responses after shared parser refactor and array parsing fix.

### Evidence
- [x] Test outputs attached to PR
- [x] 401/429 examples attached to PR

## Tasks
```json
[
  {
    "createdTimestamp": "2026-02-19T20:00:00Z",
    "name": "Create bd epic and linked hardening issues",
    "description": "Create one epic issue and small dependency-linked issues for each implementation task in this spec.",
    "status": "completed",
    "completionTimestamp": "2026-02-19T19:58:00Z",
    "commitHash": "622818f"
  },
  {
    "createdTimestamp": "2026-02-19T20:00:00Z",
    "name": "Add explicit InstantDB permissions + guest auth bootstrap",
    "description": "Define non-empty permission rules and add app-level guest sign-in bootstrap so authenticated rules don't break UX.",
    "status": "completed",
    "completionTimestamp": "2026-02-19T20:01:00Z",
    "commitHash": "ba05fd8"
  },
  {
    "createdTimestamp": "2026-02-19T20:00:00Z",
    "name": "Add shared API auth/session guard",
    "description": "Create reusable API guard utility and enforce it across scrape/extract/compare/report/chat endpoints.",
    "status": "completed",
    "completionTimestamp": "2026-02-19T20:05:00Z",
    "commitHash": "5b1ff90"
  },
  {
    "createdTimestamp": "2026-02-19T20:00:00Z",
    "name": "Add rate limiting to protected endpoints",
    "description": "Introduce a shared limiter and apply endpoint-specific budgets with 429 responses.",
    "status": "completed",
    "completionTimestamp": "2026-02-19T21:00:00Z",
    "commitHash": "f96c57c"
  },
  {
    "createdTimestamp": "2026-02-19T20:00:00Z",
    "name": "Configure ESLint and CI quality gate",
    "description": "Set up eslint config and CI workflow to run lint and build checks automatically.",
    "status": "completed",
    "completionTimestamp": "2026-02-19T20:10:00Z",
    "commitHash": "88e4ff3"
  },
  {
    "createdTimestamp": "2026-02-19T20:00:00Z",
    "name": "Centralize Claude client + strict schema parsing",
    "description": "Refactor AI modules to use shared LLM helpers and zod-backed JSON parsing guards.",
    "status": "completed",
    "completionTimestamp": "2026-02-19T21:05:00Z",
    "commitHash": "6c18b54"
  },
  {
    "createdTimestamp": "2026-02-19T20:00:00Z",
    "name": "Run validation, open PR, and complete review workflow",
    "description": "Run required checks, update spec, open PR linked to spec, request subagent review, address comments, and merge.",
    "status": "in_progress",
    "completionTimestamp": "",
    "commitHash": ""
  }
]
```

## PR Review Comments
- [BLOCKING] Ownership/IDOR gaps in API writes and permissive auth model for guest sessions.
- [BLOCKING] SSRF hardening gaps (redirect handling, IPv6 mapped addresses, DNS pinning robustness).
- [BLOCKING] Pre-auth throttling missing before token verification.
- [NON-BLOCKING] Report target fallback semantics, env documentation, and transactional consistency follow-ups.
- [APPROVAL] Reviewer subagent final pass at current HEAD reported no release-blocking defects.

## Implementation Notes
- 2026-02-19: Initialized Phase 1 hardening spec for security/stability refactor PR.
- 2026-02-19: Created bd epic `marketlens-1` with linked tasks `marketlens-2` through `marketlens-7`.
- 2026-02-19: Opened PR `#2` and iterated through multiple reviewer subagent rounds until blocker set was cleared.
- 2026-02-19: Added owner-scoped schema fields (`owner_id`) + indexes, strict permission rules, and owner-filtered API query scoping.
- 2026-02-19: Added URL safety validator, redirect-hop validation, pinned DNS lookups, and multi-address fetch retries in scraper.
- 2026-02-19: Added pre-auth + post-auth endpoint rate limiting and guest identity safety guards.
- 2026-02-19: Added `scripts/backfill-owner-id.mjs` and executed it against configured app to migrate legacy null-owner rows.
- 2026-02-19: Validation evidence captured:
  - `npm run lint` ✅
  - `npm run build` ✅
  - `API_TEST_URL=https://www.intercom.com API_TEST_TIMEOUT_MS=600000 npm run test:api` ✅
  - Manual checks: unauthenticated `/api/chat` => `401`; burst `/api/scrape` => `429` on request 7.
