# Test Strategy

## Runtime/Env Contract
- Tests run with `NODE_ENV=test`.
- Test file path is explicit: `<ENV_FILES_DIR>/.env.test`.
- Default base dir is `process.cwd()` when `ENV_FILES_DIR` is unset.
- Missing `.env.test` => fail fast.

## DB Isolation Contract
- Test mode requires:
- `DB_ALLOWED_DATABASES_TEST` (non-empty CSV)
- `DB_ALLOWED_HOSTS_TEST` (non-empty CSV)
- Runtime DB URL must match both allowlists.
- Destructive reset/cleanup validates `SELECT DATABASE()`.

## Local and Server Execution
- Local:
- `npm test` -> `cross-env ENV_FILES_DIR=. NODE_ENV=test vitest`
- Server release dir:
- `ENV_FILES_DIR=../../shared npm test`

## Smoke Checks
- App/test boot fails on missing expected env file.
- App/test boot fails on empty DB/host allowlists.
- Guard blocks wrong DB or wrong host.
- Destructive operations block on SQL identity mismatch.
