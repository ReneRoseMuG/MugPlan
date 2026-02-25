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
- `server/index.ts`
- applies `TRUST_PROXY` (`false|true|<number>|<express trust proxy string>`)
- defaults to `1` in production and `false` in development/test
- `server/middleware/sessionAuth.ts`
- applies `SESSION_COOKIE_SECURE` (`auto|true|false`)
- defaults to `auto` in production and `false` in development/test
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
- `DB_ALLOWED_PORTS_DEV|TEST|PROD`
- CSV values are normalized (trim, remove empty entries, hosts lowercase).
- Empty mandatory lists are rejected.

For safety checks:
- Global startup guard in `server/db.ts` validates URL target before `createPool(...)`.
- URL DB name must match allowed DB list.
- URL host must match allowed host list.
- URL port must match allowed port list.
- Destructive operations must also validate `SELECT DATABASE()`.
- Concrete DB names may vary per environment/tenant; allowlists are the sole source of truth.

## Reverse-Proxy Session Settings
- `TRUST_PROXY` controls `app.set("trust proxy", ...)`.
- `SESSION_COOKIE_SECURE` controls `express-session` cookie `secure` mode.
- Recommended production baseline:
- `TRUST_PROXY=1`
- `SESSION_COOKIE_SECURE=auto`
- Ensure reverse proxy forwards `X-Forwarded-Proto=https`; otherwise secure session cookies are not issued.

## Startup Commands
- Local:
- `npm run dev` -> `cross-env NODE_ENV=development ...`
- `npm test` -> `cross-env NODE_ENV=test ...`
- Server (`root/releases/version01`):
- `npm run dev`
- `npm test`
- `npm start` -> `cross-env NODE_ENV=production node --env-file=../../shared/.env.prod dist/index.cjs`
