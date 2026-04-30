# Auftragslog: Korrekturworkflow-Korsett

## Zweck

Ein wiederverwendbares, script-basiertes Korsett für operative Datenkorrektur-Workflows wurde als erste Ausbaustufe implementiert.

Ziel war, wiederholbare Korrekturläufe nicht mehr als Einmalskripte zu bauen, sondern über einen generischen Preview-/Apply-Ablauf mit Sicherheits- und Integritätsprüfungen.

## Scope

- Kein neuer API-Endpunkt
- Keine UI-Änderung
- Keine Production-Unterstützung
- Keine fachliche Sauna-/Projektname-Regel in diesem Schritt
- Fokus auf das allgemeine Framework unter `script/`

## Technische Entscheidungen

- Das Korsett ist `script`-first aufgebaut und lebt unter `script/correction-workflows/`.
- Preview und Apply laufen über einen generischen Engine-Pfad statt über workflow-spezifische Einmalskripte.
- Apply akzeptiert nur ein zuvor erzeugtes Manifest und berechnet die Zielmenge nicht still neu.
- Für actionable Kandidaten werden Snapshot-Daten eingefroren und vor dem Apply erneut gegen die aktuelle Datenbasis geprüft.
- Die Snapshots werden vor dem Schreiben des Manifests gegen den aktuellen DB-Stand kanonisiert, damit Drift-Prüfungen nicht an Formatunterschieden scheitern.
- Mutationen werden pro Kandidat transaktional ausgeführt und danach sofort gegen die erlaubten Feld-Diffs verifiziert.
- Verifikationsfehler führen zum Rollback des betroffenen Kandidaten.
- Runtime- und DB-Sicherheitsgrenzen bleiben an die bestehenden Guards gekoppelt.

## Ergebnis

- Implementiert:
  - generische Workflow-Typen
  - Workflow-Validierung
  - Safety-Öffnung für kontrollierte DB-Ausführung
  - SQL-Helfer für row-basierte Drift- und Update-Prüfungen
  - Preview-/Apply-Engine
  - Registry-Gerüst für künftige Workflows
  - CLI-Einstieg für `preview --workflow <id>` und `apply --workflow <id> --manifest <path>`
- Nachweise:
  - JSON-Manifest
  - Markdown-Preview-Report
  - JSON-Apply-Resultat
  - Markdown-Apply-Report

## Betroffene Dateien

- Framework:
  - [script/correction-workflows/types.ts](/c:/Users/r.rose/repos/Plan/releases/work_version02/script/correction-workflows/types.ts)
  - [script/correction-workflows/json.ts](/c:/Users/r.rose/repos/Plan/releases/work_version02/script/correction-workflows/json.ts)
  - [script/correction-workflows/validation.ts](/c:/Users/r.rose/repos/Plan/releases/work_version02/script/correction-workflows/validation.ts)
  - [script/correction-workflows/sql.ts](/c:/Users/r.rose/repos/Plan/releases/work_version02/script/correction-workflows/sql.ts)
  - [script/correction-workflows/safety.ts](/c:/Users/r.rose/repos/Plan/releases/work_version02/script/correction-workflows/safety.ts)
  - [script/correction-workflows/registry.ts](/c:/Users/r.rose/repos/Plan/releases/work_version02/script/correction-workflows/registry.ts)
  - [script/correction-workflows/engine.ts](/c:/Users/r.rose/repos/Plan/releases/work_version02/script/correction-workflows/engine.ts)
  - [script/run-correction-workflow.ts](/c:/Users/r.rose/repos/Plan/releases/work_version02/script/run-correction-workflow.ts)
- Tests:
  - [tests/unit/script/correctionWorkflowEngine.test.ts](/c:/Users/r.rose/repos/Plan/releases/work_version02/tests/unit/script/correctionWorkflowEngine.test.ts)
  - [tests/integration/script/correctionWorkflowEngine.integration.test.ts](/c:/Users/r.rose/repos/Plan/releases/work_version02/tests/integration/script/correctionWorkflowEngine.integration.test.ts)

## Tests und Nachweis

- `npm run check`
- `npx vitest run --config vitest.workspace.ts --project unit tests/unit/script/correctionWorkflowEngine.test.ts`
- `npx vitest run --config vitest.workspace.ts --project integration --reporter=verbose tests/integration/script/correctionWorkflowEngine.integration.test.ts`

Alle drei Läufe waren erfolgreich.

## Bekannte Grenzen

- Es ist noch kein konkreter Fachworkflow registriert.
- Die erste echte Nutzung, etwa für Projektnamen auf Sauna-Modelle, folgt in einem separaten Schritt.
- Das Registry-Gerüst ist bewusst minimal gehalten und noch nicht an App- oder Admin-Pfade angebunden.
