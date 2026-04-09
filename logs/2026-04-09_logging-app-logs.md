# Auftrag: Logging-System auf `app-logs/`

## Zweck

Umbau des zentralen Server-Loggings von einer einzelnen Root-Datei `server.log` auf ein dediziertes Laufzeit-Logverzeichnis `app-logs/` mit getrennten Dateien fuer Tageslogs, Fehlerlogs und Auth-Logs.

## Scope

- Logger-Dateiausgabe in `server/lib/logger.ts` erweitert
- Auth-Logging in `server/controllers/authController.ts` ergaenzt
- ENV-Beispiel und Ignore-Regeln fuer `app-logs/` angepasst
- Unit-Tests fuer Logger-Dateisystemverhalten und Auth-Controller-Logging ergaenzt
- Test-Matrix aktualisiert

## Technische Entscheidungen

- Default-Logverzeichnis ist `./app-logs`, aufgeloest relativ zu `process.cwd()`
- Jeder Logeintrag geht in das datierte Tageslog `YYYY-MM-DD.log`
- `ERROR`-Eintraege werden zusaetzlich in `error.log` geschrieben
- Auth-Ereignisse werden ueber `logAuth(...)` zusaetzlich in `auth.log` geschrieben
- `LOG_DIR` bleibt bewusst optional und wird direkt in `logger.ts` gelesen; `runtimeEnv.ts` wurde nicht erweitert
- Logger-Tests laufen gegen ein echtes Temp-Dateisystem unter `os.tmpdir()`

## Betroffene Dateien

- `server/lib/logger.ts`
- `server/controllers/authController.ts`
- `.env.example`
- `.gitignore`
- `app-logs/.gitkeep`
- `tests/unit/logger.test.ts`
- `tests/unit/auth/authController.logging.test.ts`
- `docs/TEST_MATRIX.md`

## Hinweise zum Testen

Gezielt ausgefuehrt:

- `npx vitest run --config vitest.workspace.ts --project unit tests/unit/logger.test.ts`
- `npx vitest run --config vitest.workspace.ts --project unit tests/unit/logger.test.ts tests/unit/auth/authController.logging.test.ts`
- `npx tsc --noEmit`

Die Logger-Tests pruefen echte Dateianlage und Dateiinhalte in einem isolierten Temp-Verzeichnis. Die Controller-Tests pruefen die `logAuth`-Verdrahtung fuer Login-, 2FA-, Schnelllogin- und Logout-Pfade.

## Bekannte Einschraenkungen

- Kein voller Audit und kein voller Testlauf wurden im Rahmen dieses Logs ausgefuehrt
- Keine Integrationstests fuer Auth-Routen oder App-Startup mit realem Dev-Server
