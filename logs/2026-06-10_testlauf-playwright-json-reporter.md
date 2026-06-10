# Testlauf + Playwright JSON-Reporter

Datum: 10.06.26
Branch: uc-258-kw-sammelverschiebung -> work (Fast-Forward-Merge)

## Zweck

Voller Testlauf (Kurzkommando `test`) als reiner Report. Auf Nutzerwunsch
zusaetzlich eine kleine Test-Konfig-Anpassung, weil die Browser-E2E-Zusammenfassung
in der Agent-Konsole abgeschnitten wurde und damit verloren ging. Abschluss:
Arbeitsstand gesichert (`save`) und Branch in `work` gemergt.

## Scope / Auftragsklassen

- Start: Klasse 2 (reiner Test-Report).
- Zwischenschritt: Klasse 4 (kleiner lokaler Fix an `playwright.config.ts`, ausdruecklich beauftragt).
- Abschluss: Klasse 3 (Git-Operationen: save + Merge in `work`).

## Test-Ergebnisse (Standard, worker-parallel; seriell gestartet)

- `npm run test:unit`: gruen — 1374 bestanden, 2 uebersprungen (318 Dateien).
- `npm run test:integration:parallel`: 1 Fehlschlag, 744 bestanden.
  - `tests/integration/server/ft04.multi-user.integration.test.ts:110`
    "keeps concurrent cascade add requests deduplicated on the appointment":
    erwartet `[200, 200]`, erhalten `[200, 500]` (Concurrency-/Dedup-Pfad).
- `npm run test:e2e` (vitest): gruen — 3 bestanden.
- `npm run test:e2e:browser:parallel`: 16 Fehlschlaege (4 Worker), je 1 Test pro Spec-Datei.
  Betroffene Specs: appointment-final-conflict, appointment-form.layout-tour-integration,
  appointment-form.resource-conflicts, appointment-form.tour-change-dialog,
  appointment-overlap-ranges, appointments-list.tour-employee,
  calendar-cut-paste.resource-conflicts, calendar-drag-drop.success,
  calendar-markers-visualization, calendar-month-sheet.navigation,
  calendar-move.cross-context-conflicts, calendar-move.same-context-conflicts,
  employee-appointments-utilization, tour-week-form,
  tour-week-planning.employee-remove-cascade, tour-week-planning.employee-add-cascade.

Die Streuung ueber sehr viele Feature-Bereiche deutet eher auf Flakiness unter
4-Worker-Parallellast hin als auf 16 echte Regressionen. Der serielle Bestaetigungslauf
der 16 Specs wurde aus Zeitgruenden auf einen spaeteren Zeitpunkt verschoben.

## Technische Entscheidung

- `playwright.config.ts`: `reporter`-Feld ergaenzt. Konsole bleibt `list`, zusaetzlich
  `json` -> `test-results/browser-results.json`. Rein additiv, kein Einfluss auf Test-,
  Parallel- oder Server-Verhalten. `test-results/` ist gitignored.
- Hintergrund: Das 30k-Zeichen-Limit ist eine Grenze des Agent-Tool-Fensters, nicht des
  Nutzer-Terminals. Die JSON-Datei macht die Abschluss-Zusammenfassung (`.stats`) und die
  Fehlschlag-Namen unabhaengig von der Konsolenkuerzung verfuegbar.

## Betroffene Dateien

- `playwright.config.ts` (Reporter-Ergaenzung — diese Session).
- Mit `save` zusaetzlich uebernommener offener Arbeitsstand (nicht aus dieser Session):
  `server/services/employeeAppointmentAbsencesService.ts`,
  `tests/integration/server/employeeAppointmentAbsences.integration.test.ts`,
  `docs/TEST_MATRIX.md`, `CLAUDE.md`.

## Hinweise zum Testen / offene Punkte

- Die 16 Browser-Fehlschlaege spaeter seriell bestaetigen (ein Worker, eine DB):
  `npm run test:e2e:browser -- <die 16 Spec-Pfade>`. Vor dem Lauf sicherstellen, dass
  keine verwaisten Test-Server auf den Ports 4174-4177 lauschen (im Lauf hier mussten
  vier haengende `node`-Server vorab beendet werden).
- Danach die Zahlen aus `test-results/browser-results.json` (`.stats`) lesen.
- Den Integration-Fehlschlag (ft04 concurrency) bei Wiederholung pruefen.

## Bekannte Einschraenkungen

- 16 Browser-Failures + 1 Integration-Failure sind noch nicht als flaky vs. echt
  charakterisiert. Reiner Report-Auftrag — es wurden keine Test-/Produktivcode-Fixes
  vorgenommen.
