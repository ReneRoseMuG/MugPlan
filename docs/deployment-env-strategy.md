# Deployment Env Strategy

## Scope
- Runtime modes: `development`, `test`, `production`
- Fixed env file names only:
- `development` -> `.env.dev`
- `test` -> `.env.test`
- `production` -> `.env.prod`

No env-file fallback is allowed.

## Responsibility Split
- `server/config/runtimeEnv.ts`
- loads exactly `<ENV_FILES_DIR>/.env.dev` for development
- loads exactly `<ENV_FILES_DIR>/.env.test` for test
- loads no file for production
- `package.json`
- `npm start` sets `NODE_ENV=production`
- `npm start` loads `../../shared/.env.prod` via `node --env-file=...`

## Path Rules
- Base directory for development/test files is `ENV_FILES_DIR`.
- If `ENV_FILES_DIR` is unset, `process.cwd()` is used.
- Missing expected file in development/test => fail fast.

## DB Safety Model (mandatory)
- Required variables:
- `DB_ALLOWED_DATABASES_DEV|TEST|PROD`
- `DB_ALLOWED_HOSTS_DEV|TEST|PROD`
- CSV values are normalized (trim, remove empty entries, hosts lowercase).
- Empty mandatory lists are rejected.

For safety checks:
- URL DB name must match allowed DB list.
- URL host must match allowed host list.
- Destructive operations must also validate `SELECT DATABASE()`.

## Startup Commands
- Local:
- `npm run dev` -> `cross-env ENV_FILES_DIR=. NODE_ENV=development ...`
- `npm test` -> `cross-env ENV_FILES_DIR=. NODE_ENV=test ...`
- Server (`root/releases/version01`):
- `ENV_FILES_DIR=../../shared npm run dev`
- `ENV_FILES_DIR=../../shared npm test`
- `npm start` -> `cross-env NODE_ENV=production node --env-file=../../shared/.env.prod dist/index.cjs`
