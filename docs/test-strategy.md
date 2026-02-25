# Test Strategy

## Runtime/Env Contract
- Tests run with `NODE_ENV=test`.
- Test file path is explicit: `../../shared/.env.test`.
- Runtime path resolution is intentionally bound to `process.cwd()`.
- Hard operating rule: always start tests from `root/releases/<instanz>`.
- Missing `.env.test` => fail fast.

## DB Isolation Contract
- Test mode requires:
- `DB_ALLOWED_DATABASES_TEST` (non-empty CSV)
- `DB_ALLOWED_HOSTS_TEST` (non-empty CSV)
- Runtime DB URL must match both allowlists.
- Global DB startup guard enforces this before pool creation.
- Destructive reset/cleanup validates `SELECT DATABASE()`.

## Local and Server Execution
- Local:
- `npm test` -> `cross-env NODE_ENV=test vitest`
- Server release dir:
- `npm test`

## Smoke Checks
- App/test boot fails on missing expected env file.
- App/test boot fails on empty DB/host allowlists.
- Guard blocks wrong DB or wrong host.
- Destructive operations block on SQL identity mismatch.
