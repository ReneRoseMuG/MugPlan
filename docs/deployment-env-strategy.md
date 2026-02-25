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
- loads exactly `../../shared/.env.dev` for development
- loads exactly `../../shared/.env.test` for test
- loads no file for production
- `package.json`
- `npm start` sets `NODE_ENV=production`
- `npm start` loads `../../shared/.env.prod` via `node --env-file=...`

## Path Rules
- Runtime path resolution is intentionally bound to `process.cwd()`.
- Hard operating rule: always start app/test processes from `root/releases/<instanz>`.
- From `root/releases/<instanz>`, the expected files are:
- `../../shared/.env.dev` in development
- `../../shared/.env.test` in test
- `../../shared/.env.prod` in production (`npm start` only)
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
- `npm run dev` -> `cross-env NODE_ENV=development ...`
- `npm test` -> `cross-env NODE_ENV=test ...`
- Server (`root/releases/version01`):
- `npm run dev`
- `npm test`
- `npm start` -> `cross-env NODE_ENV=production node --env-file=../../shared/.env.prod dist/index.cjs`
