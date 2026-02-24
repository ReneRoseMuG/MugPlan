# Abschluss-Log: Env-/Pfadrefactor

## Auftrag
Umsetzung der expliziten Env-/Pfadlogik ohne Fallbacks mit festen Dateinamen:
- `.env.dev`
- `.env.test`
- `.env.prod`

## Umgesetzte Punkte
- `runtimeEnv.ts` nutzt feste Dateinamen und `ENV_FILES_DIR` fuer Dev/Test.
- Keine Datei-Fallbacks (`.env`, `../../shared/.env`) mehr.
- Production laedt intern keine Datei in `runtimeEnv.ts`.
- `npm start` laedt explizit `../../shared/.env.prod` via `node --env-file`.
- `npm run dev` und Test-Skripte setzen explizit `ENV_FILES_DIR=.`
- DB-/Host-Allowlist-Guards auf explizite Listen umgestellt:
- `DB_ALLOWED_DATABASES_<MODE>`
- `DB_ALLOWED_HOSTS_<MODE>`
- CSV-Normalisierung implementiert (trim, leere Eintraege entfernt, hosts lowercase).
- Leere Pflicht-Listen fuehren zu Fail-Fast.
- Guard-Fehler enthalten Modus + DB/Host (ohne Secrets).

## Validierung
- Erfolgreich: `tests/unit/invariants/resetDatabaseGuard.test.ts` (4/4 gruen)
- Hinweis: Testlauf wurde mit temporaeren Env-Variablen fuer neue Pflicht-Keys durchgefuehrt.

## Offene Betriebsaufgabe
- Reale `.env.dev`, `.env.test`, `.env.prod` muessen in der Zielumgebung die neuen Pflicht-Keys enthalten:
- `DB_ALLOWED_DATABASES_DEV|TEST|PROD`
- `DB_ALLOWED_HOSTS_DEV|TEST|PROD`
