# Testing Reference

Use this reference for any plan that adds, changes, moves, audits, or relies on tests.

## General Rules

- Tests must prove observable behavior.
- Empty tests, placeholder tests, and skips are not implemented coverage.
- Use temp or `.test-runtime` data only.
- Never touch productive SQLite, upload, content, preview, or backup directories in tests.
- During an official test run, document failures and do not make speculative fixes.

## Required Test Coverage By Change Type

- API route: auth guard, validation, success path, relevant 400/401/403/404/409 path, and service effect.
- Versioned update: successful update with returned current `version` and explicit `expectedVersion`; conflict test with stale version.
- Schema/migration: table/column/index/FK/generated-column expectations and dump/truncate integration when applicable.
- Admin workflow: protected route, authorized admin success, non-admin forbidden, edge case such as self-delete or last-admin protection.
- Frontend server state: query key, hook behavior, mutation invalidation, error display through query error conversion.
- E2E: representative browser flow when navigation, auth, critical forms, or cross-page behavior changes.

## Commands

Use the commands defined in the repo, serially:

- `npm run test -w apps/api`
- `npm run test -w apps/web`
- `npm run e2e -w apps/web`

For audit, use lint/build commands available in the repo. Do not add coverage unless the user asks.

## Reporting

Report:

- Command.
- Status.
- Passed, failed, skipped, and blocked counts when available.
- Infrastructure failures separately from test failures.
- Whether failures are test-fixable or production-code issues.
