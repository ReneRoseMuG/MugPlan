# Zielbild: Projektkonfiguration (kurz)

## Laufmodi
- `development`
- `test`
- `production`

## Env-Dateien (fest, exklusiv)
- Development: `.env.dev`
- Test: `.env.test`
- Production: `.env.prod`

Keine Fallback-Dateien, keine automatische Ausweichlogik.

## Ladeverhalten
- `runtimeEnv.ts`
- `development` -> `<ENV_FILES_DIR>/.env.dev`
- `test` -> `<ENV_FILES_DIR>/.env.test`
- `production` -> laedt intern keine Datei
- `package.json`
- `npm start` -> `NODE_ENV=production` + `node --env-file=../../shared/.env.prod`

## Pfadmodell
- Basis fuer Dev/Test: `ENV_FILES_DIR`
- Falls nicht gesetzt: `process.cwd()`
- Empfohlene Standardskripte:
- `npm run dev` mit `ENV_FILES_DIR=.`
- `npm test` mit `ENV_FILES_DIR=.`

## Sicherheitsmodell
- Pflicht pro Modus:
- `DB_ALLOWED_DATABASES_<MODE>`
- `DB_ALLOWED_HOSTS_<MODE>`
- Zugriff nur erlaubt, wenn URL-DB + URL-Host in den passenden Allowlists enthalten sind.
- Vor destruktiven Aktionen: zusaetzlicher SQL-Check (`SELECT DATABASE()`).

## Serverbetrieb (ohne Symlink)
- Release-Ordner `root/releases/version01`:
- `ENV_FILES_DIR=../../shared npm run dev` -> laedt `../../shared/.env.dev`
- `ENV_FILES_DIR=../../shared npm test` -> laedt `../../shared/.env.test`
- `npm start` -> laedt `../../shared/.env.prod`
