# MS-64 — Browser Test Parallelisierung

Datum: 10.06.26
Branch: `feature/ms64-test-parallelisierung`
Auftragsklasse: 5 (mehrschichtige Änderung über mehrere Schichten)

## Zweck

Die automatisierten Tests sollen deutlich schneller laufen, ohne Aussagekraft und Isolation
zu verlieren. Schwerpunkt sind die Browser-/E2E-Tests (vorher 20+ Minuten); ergänzend
Integrations- und Unit-Tests. Beschleunigung über Worker-Parallelisierung mit voller Isolation
pro Worker (eigene temporäre Test-DB, eigener Server-Port und eigenes Storage), ohne
aufwendige Pro-Test-Kategorisierung.

## Scope / Ergebnis

Alle drei Testebenen laufen worker-parallel, serielle Fallbacks bleiben erhalten.

| Ebene | seriell | parallel | Faktor |
|---|---|---|---|
| Browser/E2E | 20,6 Min | 6,1 Min | ~3,4× |
| Integration | 334 s | 133 s | ~2,52× |
| Unit | 131 s | 13,4 s | ~9,75× |

Browser: serielle und parallele Ergebnismenge exakt deckungsgleich (358 passed, 16 failed,
59 did not run), über zwei parallele Läufe bestätigt — die Parallelisierung führt keine neuen
Flakes ein. Die 16 Fehlschläge sind vorbestehend (scheitern auch seriell) und in einem eigenen
Folgeauftrag erfasst.

Arbeitspakete AP01–AP12 abgeschlossen. Ausnahme/Hinweis: Das From-Scratch-Baseline der
Migrationskette fehlt (AP03 daher per Schema-Klon gelöst, separater Folgeauftrag).

## Technische Entscheidungen

1. **Worker-DB per Schema-Klon statt Migration.** Die Migrationskette enthält kein
   From-Scratch-Baseline (Basistabellen wie `project`/`users` werden in keiner Migration
   erzeugt, sondern stammen historisch aus `drizzle-kit push`). Eine frische DB lässt sich
   darum über `db:migrate:test` nicht aufbauen (FK auf nicht existierende Tabelle `project`).
   Jede Worker-DB wird daher aus der bereits korrekten `mugplan_test` geklont
   (`SHOW CREATE TABLE`/`VIEW` inkl. Fremdschlüssel, FK-Checks während des Aufbaus aus). Die
   sensible Produktiv-Migrationskette bleibt unangetastet.

2. **DB-Safety-Guards erweitert (AP04).** `assertSafeWriteTargetForTestMode` akzeptiert
   zusätzlich Namen nach dem fest verankerten Muster `^mugplan_w\d+_test$`. Host-Allowlist und
   `_test`-Suffix bleiben hart; Dev-/Prod-Pfad unverändert; `server/db.ts` braucht keine
   Änderung. Reproduzierbar im getrackten Code statt über die gitignorete `.env.test`.

3. **Import-Reihenfolge (Kernpunkt).** Die Worker-DB-URL muss gesetzt sein, bevor
   `runtimeEnv`/`server/db` initialisieren (dotenv `override:false`, runtimeEnv cached).
   - Integration: Setupfile `tests/setup.worker-db.ts` läuft vor `setup.integration.ts`.
   - Browser: Bootstrap in `tests/e2e-browser/fixtures.ts` als erster Spec-Import; Specs
     importieren `test`/`expect` aus `./fixtures`.

4. **`parallelIndex` statt `workerIndex` (Browser).** Playwrights `workerIndex` steigt global
   bei jedem Worker-Ersatz (z. B. nach einem Testfehler) und übersteigt dann die Worker-Zahl →
   falscher Server-Port → `ERR_CONNECTION_REFUSED`-Kaskade. `parallelIndex` bleibt in
   `[0, workers)` und passt zu den vorab provisionierten Worker-DBs und Server-Ports.

5. **Provisionierung vor `playwright test`.** Playwright startet den `webServer` VOR
   `globalSetup`; die Worker-DBs müssen vorher existieren. Daher Vorstufe
   `tests/helpers/provisionBrowserWorkers.ts` im npm-Skript statt globalSetup.

6. **Alt-Isolations-Framework neutralisiert (AP02 Option A, AP06).** Fingerprint-/Canary-Checks
   aus dem Browser-Reset entfernt — unter Worker-Isolation überflüssig und parallel
   fehleranfällig (Storage-Fingerprint im Spec-Prozess). Verhaltensneutral (entfernt nur
   Prüfungen, ändert keine Testdaten).

7. **DB-spezifischer Reset-Lock (AP06).** `RESET_DB_LOCK_NAME` aus dem DB-Namen abgeleitet,
   damit ein serverweiter `GET_LOCK` parallele Worker nicht serialisiert; für `mugplan_test`
   identisch zum bisherigen Namen.

Kein Produktionscode geändert außer dem im Meilenstein ausdrücklich beauftragten Guard
`server/security/dbSafetyGuards.ts` (AP04).

## Betroffene Dateien (Auswahl)

Neu:
- `tests/helpers/workerDatabase.ts` — Worker-DB-Lifecycle (Name/URL, provisionieren, klonen, droppen)
- `tests/helpers/workerStorage.ts` — deterministische per-Worker-Storage-Pfade
- `tests/helpers/provisionBrowserWorkers.ts` — Vorstufe-Provisionierung für Browser
- `tests/setup.worker-db.ts` — per-Worker-DB-Injektion für Vitest-Integration
- `tests/e2e-browser/fixtures.ts` — Bootstrap + baseURL-Fixture für Browser
- `tests/integration/infra/workerDatabaseLifecycle.test.ts` — AP03-Nachweis
- `docs/MS64_TEST_PARALLELIZATION_BASELINE.md` — Baseline-/Laufzeitbericht

Geändert:
- `server/security/dbSafetyGuards.ts` — Worker-DB-Muster (AP04)
- `tests/helpers/resetDatabase.ts` — DB-spezifischer Reset-Lock (AP06)
- `tests/helpers/browserE2e.ts` — Framework-Neutralisierung (AP02/AP06)
- `playwright.config.ts` — Parallel-Modus (workers, webServer-Array, Gating)
- `vitest.workspace.ts`, `vitest.config.ts` (vererbt), `package.json` — parallele Skripte
- alle 90 Browser-Specs unter `tests/e2e-browser/*.spec.ts` — Import auf `./fixtures`
- `docs/TEST_MATRIX.md`, `docs/TEST_DB_SAFETY_INVENTORY.md`, `CLAUDE.md` (Abschnitt 13)
- Guard-Unit-Tests `dbStartupGuard.test.ts`, `resetDatabaseGuard.test.ts`

## Hinweise zum Testen

- Unit parallel: `npm run test:unit` (Flag verankert); seriell: `npm run test:unit -- --no-file-parallelism`
- Integration parallel: `npm run test:integration:parallel`; seriell: `npm run test:integration`
- Browser parallel: `npm run test:e2e:browser:parallel` (Default 4 Worker; `PLAYWRIGHT_WORKERS=N` überschreibt); seriell: `npm run test:e2e:browser`
- Voraussetzung parallel: Testnutzer darf `CREATE`/`DROP DATABASE` im Testmodus (temporäre Worker-DBs).
- `npm run check` ist grün (Encoding, Typecheck, Destructive-Inventory, Encoding-Lint).

## Bekannte Einschränkungen / Folgeaufträge

1. **Fehlendes Baseline-Migrationsskript** — die Migrationskette kann keine frische DB von Grund
   auf aufbauen (latentes Risiko auch für Dev/Prod). Separater Folgeauftrag.
2. **16 vorbestehende fehlschlagende Browser-Tests** — scheitern seriell wie parallel,
   unabhängig von dieser Arbeit. Separater Folgeauftrag.
3. Das vitest-`e2e`-Projekt (3 Dateien) ist noch nicht parallelisiert (folgt dem AP10-Muster).
4. Die `testIsolation*.ts`-Dateien existieren physisch weiter (in den Hot-Paths umgangen);
   vollständige Entfernung wäre reine Aufräumarbeit.
