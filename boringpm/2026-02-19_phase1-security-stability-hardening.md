# Phase 1: Security + Stability Hardening

## Metadata
- Spec File: `2026-02-19_phase1-security-stability-hardening.md`
- Status: `In Progress`
- Owner: `windows95`
- Reviewer Subagent: `reviewer`
- Branch: `feat/refactor-security-stability-phase1`
- PR: `TBD`
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
- [ ] Lint passes (`npm run lint`)
- [ ] Build passes (`npm run build`)
- [ ] API smoke tests pass (`API_TEST_URL=https://example.com npm run test:api`)

### Manual Verification
- [ ] API requests without valid session/auth are rejected with `401`.
- [ ] Repeated requests beyond limits return `429` with retry metadata.
- [ ] Dashboard/compare/reports/agent still function after guest bootstrap.
- [ ] LLM-backed endpoints still return valid structured responses after parser refactor.

### Evidence
- [ ] Test outputs attached to PR
- [ ] 401/429 examples attached to PR

## Tasks
```json
[
  {
    "createdTimestamp": "2026-02-19T20:00:00Z",
    "name": "Create bd epic and linked hardening issues",
    "description": "Create one epic issue and small dependency-linked issues for each implementation task in this spec.",
    "status": "completed",
    "completionTimestamp": "2026-02-19T19:57:00Z",
    "commitHash": "54f2d8d"
  },
  {
    "createdTimestamp": "2026-02-19T20:00:00Z",
    "name": "Add explicit InstantDB permissions + guest auth bootstrap",
    "description": "Define non-empty permission rules and add app-level guest sign-in bootstrap so authenticated rules don't break UX.",
    "status": "pending",
    "completionTimestamp": "",
    "commitHash": ""
  },
  {
    "createdTimestamp": "2026-02-19T20:00:00Z",
    "name": "Add shared API auth/session guard",
    "description": "Create reusable API guard utility and enforce it across scrape/extract/compare/report/chat endpoints.",
    "status": "pending",
    "completionTimestamp": "",
    "commitHash": ""
  },
  {
    "createdTimestamp": "2026-02-19T20:00:00Z",
    "name": "Add rate limiting to protected endpoints",
    "description": "Introduce a shared limiter and apply endpoint-specific budgets with 429 responses.",
    "status": "pending",
    "completionTimestamp": "",
    "commitHash": ""
  },
  {
    "createdTimestamp": "2026-02-19T20:00:00Z",
    "name": "Configure ESLint and CI quality gate",
    "description": "Set up eslint config and CI workflow to run lint and build checks automatically.",
    "status": "pending",
    "completionTimestamp": "",
    "commitHash": ""
  },
  {
    "createdTimestamp": "2026-02-19T20:00:00Z",
    "name": "Centralize Claude client + strict schema parsing",
    "description": "Refactor AI modules to use shared LLM helpers and zod-backed JSON parsing guards.",
    "status": "pending",
    "completionTimestamp": "",
    "commitHash": ""
  },
  {
    "createdTimestamp": "2026-02-19T20:00:00Z",
    "name": "Run validation, open PR, and complete review workflow",
    "description": "Run required checks, update spec, open PR linked to spec, request subagent review, address comments, and merge.",
    "status": "pending",
    "completionTimestamp": "",
    "commitHash": ""
  }
]
```

## PR Review Comments
- Pending.

## Implementation Notes
- 2026-02-19: Initialized Phase 1 hardening spec for security/stability refactor PR.
- 2026-02-19: Created bd epic `marketlens-1` with linked tasks `marketlens-2` through `marketlens-7`.
