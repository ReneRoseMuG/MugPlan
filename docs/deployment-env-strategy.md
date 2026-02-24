# Deployment Env Strategy

## Scope
- This project uses three runtime processes only:
- `test`
- `development`
- `production`

There is no separate runtime mode for pre-release.

## Runtime Environment Source
- `test`: load required file `.env.test` (fail fast if missing).
- `development`: load `../../shared/.env` if present, otherwise `.env`.
- `production`: read from process environment only (no dotenv fallback).

Runtime loading must happen before importing modules with side effects (DB pool, server bootstrap).

## Database Target Policy
- `test` must use a database ending with `_test`.
- `development` must use a database ending with `_dev`.
- `production` must use a database ending with `_production`.

For destructive operations, enforce:
- URL/database-name validation.
- SQL identity check via `SELECT DATABASE()`.

## Admin/Maintenance Endpoint Categories
- `destructive`: reset/purge/seed/truncate/drop style operations.
- `write_non_destructive`: writes without bulk data destruction.
- `sensitive_read`: debug/status/internal or privileged data reads.

### Policy by Runtime Process
- `test`:
- destructive endpoints allowed only with test DB guards.
- `development`:
- destructive endpoints allowed only with dev DB guards.
- `production`:
- destructive endpoints blocked.
- non-destructive and sensitive endpoints require admin authorization and explicit policy.

## Startup Rules
- `npm run dev` -> development process.
- test commands -> test process (`NODE_ENV=test`).
- `npm start` -> production process.
- bind network port from `process.env.PORT`.
