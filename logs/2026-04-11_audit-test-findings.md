# Log: audit-test-findings

**Branch:** `refactor-forms-filters`
**Datum:** 2026-04-11

---

## Zweck

Dieses Log fasst die im Anschluss an die Zeitraum-Picker-Session festgestellten Probleme aus dem vollen Audit und dem vollen Testlauf zusammen.

Ziel ist ein sauberer Übergabestand für einen neuen Chat, ohne die Ursachen oder Prioritäten erneut aus dem Verlauf rekonstruieren zu müssen.

---

## Ausgangslage

Vor dem Audit- und Testlauf war die Zeitraum-Picker-Arbeit fachlich gezielt verifiziert worden:

- Startzustand `Alle Termine`
- Reset auf verfügbare Gesamtmenge
- `availableRange` im Contract von `/api/appointments/list`
- stabilere Synchronisation von Datum-/KW-Feldern
- ISO-KW-Grenzen mit jahresabhängiger Behandlung von `KW 53`

Der anschließende Vollreport sollte prüfen, ob die Änderungen im Gesamtstand des Branches mit Build, Linting und allen Testebenen kompatibel sind.

---

## Audit-Ergebnis

### `npm run check` fehlgeschlagen

TypeScript-Blocker:

- In `client/src/components/reports/TourenplanReportPanel.tsx` fehlt bei `DateRangeKwRangePanel` die nun erforderliche Prop `kwStartMax`.
- In `client/src/components/ReportsPage.tsx` fehlt dieselbe Prop an drei Stellen ebenfalls.
- In `server/services/monitoringService.ts` ist `addDaysToDateOnly` deklariert, aber unbenutzt.

Folge:

- Der Branch ist aktuell nicht `tsc`-grün.
- Die neue Pflicht-Prop des KW-Panels wurde nicht an allen bestehenden Verwendungsstellen nachgezogen.

### `npm run lint` fehlgeschlagen

- `server/services/monitoringService.ts:71`
  - `addDaysToDateOnly` ist unbenutzt.

Folge:

- Der Branch ist aktuell nicht lint-grün.

### `npm run audit` erfolgreich

- Keine gefundenen Vulnerabilities.

### `npm run secrets` erfolgreich

- Keine Secrets oder Leaks gefunden.

---

## Test-Ergebnis

### `npm run test:unit` fehlgeschlagen

Betroffene Bereiche:

- `tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx`
- `tests/unit/ui/teamEditForm.layoutShellIntegration.test.tsx`

Problem:

- Die Tests erwarten noch, dass keine Sidebar gerendert wird.
- Die aktuelle UI rendert die Sidebar inzwischen.

Zusätzliche Ausfälle:

- `tests/unit/services/monitoringService.ft31.test.ts`
- `tests/unit/ui/monitoringPage.behavior.test.tsx`

Problem:

- Erwartete Monitoring-Datenstruktur und UI-Annahmen passen nicht mehr zum aktuellen Stand.
- Es gibt Abweichungen bei erwarteten Feldern und sichtbaren Zuständen.

### `npm run test:integration` fehlgeschlagen

#### Gruppe 1: System-Tag-/Seed-Probleme

Betroffene Dateien:

- `tests/integration/server/appointments.entity-card-payload.integration.test.ts`
- `tests/integration/server/customers.entity-card-payload.integration.test.ts`
- `tests/integration/server/employees.entity-card-payload.integration.test.ts`
- `tests/integration/server/projects.entity-card-payload.integration.test.ts`

Problem:

- Erwartete System-Tags fehlen in den Testvoraussetzungen.
- `systemTag` ist `undefined`, wodurch nachgelagerte Assertions brechen.

#### Gruppe 2: Storno-Workflow abweichend

Betroffene Datei:

- `tests/integration/server/appointments.cancellation.integration.test.ts`

Problem:

- Erwartet wurde `204`, tatsächlich kommt `409`.
- Das spricht für eine fachliche Konfliktbedingung oder eine geänderte Vorbedingung im Cancellation-Flow.

#### Gruppe 3: Monitoring-Abweichungen

Betroffene Datei:

- `tests/integration/server/monitoring.ft31.integration.test.ts`

Problem:

- Erwartete Treffermengen stimmen nicht mit den tatsächlichen Ergebnissen überein.

### `npm run test:e2e` erfolgreich

- Die nicht-browserbasierten E2E-Tests liefen grün durch.

### `npm run test:e2e:browser` fehlgeschlagen

#### Browser-Fehler 1: Storno

- `tests/e2e-browser/appointment-cancellation.workflow.browser.e2e.spec.ts`
- Erwartet `204`, tatsächlich `409`

#### Browser-Fehler 2: KW-Input im Report

- `tests/e2e-browser/reports.kw-input.browser.e2e.spec.ts`
- Der Test erwartet noch altes Verhalten für ungültige KW-Eingaben.
- Aktuell bleibt der letzte gültige Wert stehen, statt auf einen alten Default zu springen.

#### Browser-Fehler 3: Tourenplan-Report

- `tests/e2e-browser/reports.tourenplan.browser.e2e.spec.ts`
- Erwarteter Tag `reklamation` wurde nicht gefunden.

#### Browser-Fehler 4: Vereinheitlichte Tag-Auswahl

- `tests/e2e-browser/tag-selection-unification.browser.e2e.spec.ts`
- Erwartete reservierte System-Tags fehlen.
- Dadurch wurden weitere Tests derselben Datei nicht mehr regulär ausgeführt.

---

## Einordnung der Probleme

### Höchste Priorität

- Build-Blocker aus `npm run check`
- Lint-Blocker aus `npm run lint`

Diese Punkte verhindern einen sauberen technischen Grundzustand des Branches.

### Mittlere Priorität

- System-Tag-/Seed-Probleme in Integration und Browser-E2E
- `409` statt `204` im Storno-Workflow

Diese Fehler deuten auf fachliche oder infrastrukturelle Abweichungen hin, die mehrere Testebenen gleichzeitig betreffen.

### Nachgelagerte Priorität

- veraltete Layout-Tests für Team- und Tour-Formulare
- Monitoring-spezifische Testabweichungen
- Report-KW-Test mit alter Erwartung an invaliden Input

Diese Punkte wirken aktuell eher wie nachzuziehende oder zu klärende Erwartungen, nicht wie der primäre Branch-Blocker.

---

## Empfohlene Startreihenfolge für den nächsten Chat

1. `kwStartMax` an allen bestehenden `DateRangeKwRangePanel`-Verwendungsstellen nachziehen.
2. Unbenutzten Import oder tote Hilfsfunktion in `monitoringService.ts` bereinigen.
3. System-Tag- und Seed-Voraussetzungen prüfen, weil sie mehrere rote Testgruppen gleichzeitig erklären könnten.
4. Cancellation-Flow analysieren, warum statt `204` ein `409` entsteht.
5. Danach veraltete Layout-, Monitoring- und Browser-Erwartungen einzeln nachziehen.

---

## Betroffene Dateien aus den Befunden

- `client/src/components/ReportsPage.tsx`
- `client/src/components/reports/TourenplanReportPanel.tsx`
- `server/services/monitoringService.ts`
- `tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx`
- `tests/unit/ui/teamEditForm.layoutShellIntegration.test.tsx`
- `tests/unit/services/monitoringService.ft31.test.ts`
- `tests/unit/ui/monitoringPage.behavior.test.tsx`
- `tests/integration/server/appointments.cancellation.integration.test.ts`
- `tests/integration/server/appointments.entity-card-payload.integration.test.ts`
- `tests/integration/server/customers.entity-card-payload.integration.test.ts`
- `tests/integration/server/employees.entity-card-payload.integration.test.ts`
- `tests/integration/server/projects.entity-card-payload.integration.test.ts`
- `tests/integration/server/monitoring.ft31.integration.test.ts`
- `tests/e2e-browser/appointment-cancellation.workflow.browser.e2e.spec.ts`
- `tests/e2e-browser/reports.kw-input.browser.e2e.spec.ts`
- `tests/e2e-browser/reports.tourenplan.browser.e2e.spec.ts`
- `tests/e2e-browser/tag-selection-unification.browser.e2e.spec.ts`

---

## Hinweis zum Report-Stand

Dieses Log dokumentiert die Befunde des bereits gelaufenen Audit- und Testreports.

Es wurden in diesem Schritt keine inhaltlichen Fixes mehr vorgenommen.
