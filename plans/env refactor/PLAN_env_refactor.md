# Verbindlich geschärfter Gesamtplan: Explizite Env-/Pfadlogik ohne Fallbacks

## Kurzfassung
- Feste, exklusive Dateinamen: `.env.dev`, `.env.test`, `.env.prod`.
- Keine Datei-Fallbacks, keine „shared bevorzugt, sonst lokal“-Logik.
- Dev/Test-Dateipfad nur über `ENV_FILES_DIR` + festen Dateinamen.
- Production-Datei wird ausschließlich über `npm start` per `node --env-file=../../shared/.env.prod` geladen.
- DB-/Host-Sicherheitsmodell mit verpflichtenden Allowlisten und robuster CSV-Normalisierung.

## Zielregeln (verbindlich)
- `development` nutzt nur `.env.dev`.
- `test` nutzt nur `.env.test`.
- `production` nutzt nur `.env.prod`.
- Fehlende erwartete Datei in Dev/Test führt zu Fail-Fast mit klarer Fehlermeldung.
- Keine Nutzung von `.env`, `../../shared/.env`, `.env.production` oder sonstigen Fallback-Dateien.

## Verantwortlichkeiten
- `runtimeEnv.ts`:
- `development`: lädt genau `<ENV_FILES_DIR>/.env.dev`
- `test`: lädt genau `<ENV_FILES_DIR>/.env.test`
- `production`: lädt intern keine Datei
- `package.json`:
- `npm start` setzt `NODE_ENV=production`
- `npm start` lädt explizit `../../shared/.env.prod` per `--env-file`

## Pfadsteuerung Dev/Test
- Basisordner ist `ENV_FILES_DIR`.
- Falls `ENV_FILES_DIR` nicht gesetzt ist, ist der technische Default `process.cwd()`.
- Keine Sonderfall-Magie für leeren String.
- Keine Dateinamens-Fallbacks.

## Scripts (explizit)
- `dev`: `cross-env ENV_FILES_DIR=. NODE_ENV=development tsx server/index.ts`
- `test`: `cross-env ENV_FILES_DIR=. NODE_ENV=test vitest`
- `test:run`: `cross-env ENV_FILES_DIR=. NODE_ENV=test vitest run`
- `test:unit`: `cross-env ENV_FILES_DIR=. NODE_ENV=test vitest run tests/unit`
- `test:integration`: `cross-env ENV_FILES_DIR=. NODE_ENV=test vitest run -c vitest.integration.config.ts tests/integration`
- `start`: `cross-env NODE_ENV=production node --env-file=../../shared/.env.prod dist/index.cjs`

## Betriebsbeispiele ohne Symlink (verbindlich testbar)
- Lokal:
- `npm run dev` lädt `./.env.dev`
- `npm test` lädt `./.env.test`
- optional explizit gleichwertig: `ENV_FILES_DIR=. npm run dev`, `ENV_FILES_DIR=. npm test`
- Server im Release-Ordner:
- `ENV_FILES_DIR=../../shared npm run dev` lädt `../../shared/.env.dev`
- `ENV_FILES_DIR=../../shared npm test` lädt `../../shared/.env.test`
- `npm start` lädt `../../shared/.env.prod`

## Sicherheitsmodell DB/Host-Allowlist (Pflicht)
- Pflichtvariablen je Modus:
- `DB_ALLOWED_DATABASES_DEV|TEST|PROD`
- `DB_ALLOWED_HOSTS_DEV|TEST|PROD`
- Parsing/Normalisierung:
- CSV trimmen
- leere Einträge entfernen
- Hosts optional lowercase normalisieren
- leere Pflichtlisten => Fehler
- Guard-Prüfung:
- URL-DB-Name muss in erlaubter DB-Liste liegen
- URL-Host muss in erlaubter Host-Liste liegen
- vor destruktiven Aktionen zusätzlich `SELECT DATABASE()`-Identitätscheck
- Fehlertexte:
- enthalten aktiven Modus + geprüften DB-Namen/Host
- enthalten keine Secrets/Credentials

## Wichtige Änderungen an Interfaces/Typen
- `RuntimeConfig` ergänzen:
- `envFilesDir: string`
- `envFilePath?: string` (nur Dev/Test)
- `allowedDatabases: string[]`
- `allowedHosts: string[]`
- Guard-API umstellen:
- suffixbasierte Funktion entfernen
- neue zielbasierte Funktion mit Allowlisten und normalisierten Werten

## Umsetzungsphasen
- Phase 1:
- `runtimeEnv.ts` auf feste Dateinamen + `ENV_FILES_DIR` umstellen
- Datei-Fallbacks vollständig entfernen
- klare Fail-Fast-Fehler einbauen
- Phase 2:
- `package.json` Scripts explizit setzen (`ENV_FILES_DIR=.` für Dev/Test, `--env-file` für Start)
- Phase 3:
- DB-/Host-Guards auf Allowlisten umstellen, CSV-Normalisierung + Pflichtlisten
- destruktive Pfade mit SQL-Identity absichern
- Phase 4:
- Doku synchronisieren (`docs/deployment-env-strategy.md`, `docs/test-strategy.md`, `.env.example`)
- Smokechecks/Abnahmekriterien finalisieren

## Testfälle und Abnahmekriterien
- Runtime:
- Dev/Test schlagen fehl, wenn erwartete Datei fehlt
- Production lädt intern keine Datei
- Pfadauflösung folgt exakt `ENV_FILES_DIR`
- Scripts:
- Dev/Test enthalten explizit `ENV_FILES_DIR=.`
- Start enthält explizit `--env-file=../../shared/.env.prod`
- Guard:
- erlaubt bei passender DB+Host
- blockiert bei falscher DB oder falschem Host
- blockiert bei leeren Pflicht-Allowlisten
- destruktive Operation blockiert bei SQL-Identity-Mismatch
- Betriebs-Smoketests:
- lokal: `npm run dev`, `npm test`
- server: `ENV_FILES_DIR=../../shared npm run dev`, `ENV_FILES_DIR=../../shared npm test`, `npm start`

## Annahmen
- Node-Laufzeit unterstützt `--env-file`.
- Serverstruktur entspricht `root/releases/version01` und `root/shared`.
- Keine Symlink-Abhängigkeit wird eingeführt.
