# Claims Management System

## Project overview

Claims Management System is a full-stack monorepo for claim managers to track claims and associated damages.
It enforces status transitions, business policies, and backend-derived totals while providing a minimal Angular UI for list/detail workflows.

## Challenge summary

The challenge is implemented stage-by-stage with Spec-Driven Development and OpenAPI-first design:

- backend domain rules and validation;
- persistence and REST API;
- backend unit/integration testing;
- frontend list/detail views and reactive damage workflows.

## Monorepo structure

```text
.
├── apps/
│   ├── api/        # NestJS backend (domain, REST API, Mongo persistence, tests, seed)
│   └── web/        # Angular frontend (claim list/detail, reactive damage UI)
├── docs/
│   ├── SPEC.md
│   └── openapi.yaml
├── docker-compose.yml
├── AI_LOG.md
└── README.md
```

## Selected stack

- Backend: NestJS + TypeScript + Mongoose
- Frontend: Angular 20 + TypeScript + Reactive Forms
- Database: MongoDB 7
- Testing:
  - Backend unit: Jest
  - Backend integration: Jest + Supertest + mongodb-memory-server
  - Frontend: Karma + Jasmine

## Prerequisites

- Node.js `22.12.0` (required/recommended; aligned with `.nvmrc`)
- npm `>=10`
- Docker + Docker Compose
- `nvm` optional (only needed if you want `nvm use`)

## Environment setup

Copy `apps/api/.env.example` to `apps/api/.env` and adjust as needed.

Required API variables:

- `MONGO_URI`
- `PORT`
- `CORS_ORIGIN`

Seeded demo damages use public Unsplash image URLs, so no frontend asset base URL variable is required.

## MongoDB setup (Docker Compose)

```bash
docker compose up -d mongo
```

## Install dependencies

```bash
npm install
```

## Run backend

```bash
npm run dev:api
```

## Run frontend

```bash
npm run dev:web
```

## Optional seed command

```bash
npm run seed -w apps/api
```

This seeds a small idempotent demo dataset for local review.

## Testing and verification commands

Backend unit coverage:

```bash
npm run test:unit:cov -w apps/api -- --runInBand
```

Backend integration tests:

```bash
npm run test:integration -w apps/api -- --runInBand
```

Frontend checks:

```bash
npm run typecheck -w apps/web
npm run test -w apps/web
npm run build -w apps/web
```

Root verification commands:

If `nvm` is available:

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

If `nvm` is not installed, use Node.js `22.12.0` manually (or through another version manager), then run the same commands except `nvm use`.

## API examples

Create claim:

```bash
curl -X POST http://localhost:3000/claims \
  -H "Content-Type: application/json" \
  -d '{"title":"Front bumper claim","description":"Customer reported vehicle front bumper damage after a parking incident."}'
```

List claims:

```bash
curl http://localhost:3000/claims
```

Get claim detail:

```bash
curl http://localhost:3000/claims/<CLAIM_ID>
```

Add damage:

```bash
curl -X POST http://localhost:3000/claims/<CLAIM_ID>/damages \
  -H "Content-Type: application/json" \
  -d '{"part":"Front bumper","severity":"HIGH","imageUrl":"https://example.com/front-bumper.jpg","price":350.5,"score":7}'
```

Update damage price:

```bash
curl -X PATCH http://localhost:3000/claims/<CLAIM_ID>/damages/<DAMAGE_ID> \
  -H "Content-Type: application/json" \
  -d '{"price":425.75}'
```

Delete damage:

```bash
curl -X DELETE http://localhost:3000/claims/<CLAIM_ID>/damages/<DAMAGE_ID>
```

Transition status:

```bash
curl -X PATCH http://localhost:3000/claims/<CLAIM_ID>/status \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_REVIEW"}'
```

## Technical decisions

- Spec-Driven Development with `docs/SPEC.md` as implementation source.
- OpenAPI-first contract with `docs/openapi.yaml`.
- NestJS Dependency Injection and modular feature architecture.
- Angular Dependency Injection with `HttpClient` via service layer.
- MongoDB persistence through Mongoose.
- Embedded damages inside claim documents.
- Backend-owned `totalAmount` (derived from damages).
- Frontend reactive total derived from current damage collection and reconciled with backend responses.

## Architecture and patterns

- Layered modular backend architecture (`controller -> service -> repository -> persistence`).
- State Machine Pattern for claim status transitions.
- Policy Pattern for high-severity finish rule.
- Repository Pattern isolating MongoDB-specific operations.

## Known limitations

- UI styling is intentionally simple.
- Authentication/authorization are intentionally out of scope.
- Seed command is optional and explicit.
- `mongodb-memory-server` may download a MongoDB binary on first integration test run.

## Documentation references

- Specification: `docs/SPEC.md`
- API contract: `docs/openapi.yaml`
- AI supervision log: `AI_LOG.md`
