# Test Strategy

## Runtime and Environment
- Test runs must execute with `NODE_ENV=test`.
- `.env.test` is mandatory and must be loaded at startup.
- Missing `.env.test` or missing required DB URL fails fast.

## Database Isolation
- Test process must only target database names ending with `_test`.
- Before destructive reset/cleanup, verify:
- DB target by URL/name policy.
- active SQL database identity via `SELECT DATABASE()`.

## Process Chain in Server Environment
1. Install and prepare the app.
2. Run automated tests in test process.
3. Run visual/manual checks in development process.
4. Start final production process with `npm start`.

Each step must have explicit env source, DB target, and active guard policy.

## Smoke Checks
- App starts from target directory.
- App binds to `process.env.PORT`.
- Effective DB identity can be verified without logging secrets.
- Test process uses only test DB.
- Development process uses only dev DB.
- Production start (`npm start`) uses only production DB.
- Destructive admin/maintenance endpoints follow runtime policy.
