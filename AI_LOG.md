# AI Log

## Purpose

This file documents how AI assistance was used, what was accepted or rejected, and which high-risk business rules were manually supervised.
It is intentionally summarized and reviewed, not a raw prompt transcript.

## Tools and workflow used

- AI-assisted planning and staged implementation.
- Automated code generation for repetitive scaffolding (DTOs, component boilerplate, tests, seed script structure).
- Manual human review for business-rule correctness, OpenAPI alignment, and test quality.
- Iterative run/fix loop based on commands:
  - typecheck
  - unit tests
  - integration tests
  - build

## How AI supported SPEC/OpenAPI translation

- Helped transform challenge requirements into backend/frontend implementation tasks.
- Ensured status transitions, damage constraints, and policy behavior matched `docs/SPEC.md` and `docs/openapi.yaml`.
- Highlighted mismatches discovered later (e.g., list response shape, PATCH `minProperties`) and assisted in targeted fixes.

## Backend unit/integration test generation supervision

- AI proposed baseline tests for domain entities and transitions.
- Human review expanded coverage with boundary cases and policy checks:
  - description length `100` fails / `101` passes for high severity finish policy;
  - terminal-state transition rejection;
  - damage management restricted to `PENDING`;
  - damage value validation (`price > 0`, integer `score` in `1..10`).
- Integration tests were kept focused on API + persistence behavior:
  - create claim;
  - damage add/update/delete;
  - returned and persisted totals consistency;
  - transition and validation error shapes.

## Business rule supervision and manual corrections

The following risk-prone behaviors were explicitly checked and corrected where needed:

- `totalAmount` accepted from client input.
- Direct `PENDING -> FINISHED` transition allowed.
- Using `>= 100` instead of `> 100` for high severity finish rule.
- Damage actions allowed outside `PENDING`.
- High-severity finish policy enforced only in frontend.
- Frontend total refreshed only from backend without reactive derivation from current damages.
- `GET /claims` returning damages when OpenAPI expects summaries.
- PATCH empty-body mismatch with OpenAPI `minProperties`.
- Undefined fields in partial updates overwriting existing values.

## Frontend reactive logic supervision

- AI assisted with Angular list/detail screens, typed API service, and reactive forms.
- Human review enforced:
  - `ClaimsApiService` as single HTTP integration point.
  - `derivedTotal` computed from current damages collection.
  - state reconciliation using backend mutation responses.
  - safe error display on failed status/damage actions without inconsistent local state.

## Architecture and pattern decisions with AI support

- Backend layered modular architecture (`controller -> service -> repository`).
- State Machine Pattern for claim status transitions.
- Policy Pattern for high-severity finish rule.
- Repository Pattern for Mongo persistence isolation.
- Angular DI with service-based API access and local reactive component state.

## Final verification commands

```bash
nvm use
docker compose up -d mongo
npm run typecheck
npm test
npm run build:api
npm run build:web
npm run test:unit:cov -w apps/api -- --runInBand
npm run test:integration -w apps/api -- --runInBand
npm run seed -w apps/api
```

## Final verification result snapshot

- `nvm use`: not available in this shell (`nvm: command not found`), existing Node used.
- Root typecheck: passed.
- Root tests: passed.
- API build: passed.
- Web build: passed.
- API unit coverage: statements >95% (latest run: `99.25%`).
- API integration tests: passed.
- Frontend tests: passed (requires Chrome/Karma availability in the execution environment).
- Seed command: passed and inserted 4 sample claims idempotently.

## Human decisions and rejected shortcuts

- Avoided duplicating backend rules in frontend; backend remains authoritative.
- Avoided automatic seed on startup; kept explicit `npm run seed -w apps/api`.
- Avoided adding unrelated features/state libraries outside staged scope.
