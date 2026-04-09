# Legacy-Kalenderdruck entfernen und Tourenplan-Report absichern

## Zweck

Der Legacy-Kalenderdruck im Wochenkalender wurde entfernt, ohne den neuen Tourenplan-Report zu beschädigen. Zusätzlich wurden veraltete Altpfad-Tests bereinigt und Schutztests ergänzt, damit der weiterhin genutzte Tourenplan-Report einschließlich seines Serverpfads stabil abgesichert bleibt.

## Scope

- Entfernung der alten Kalenderdruck-Verdrahtung aus dem Kalender-Workspace und dem Kalender-Filter-Footer
- Löschung der nicht mehr benötigten `CalendarTourPrint*`-Komponenten und der alten Helper-Datei `client/src/lib/tour-print-preview.ts`
- Auslagerung der report-relevanten Text-Helfer nach `client/src/lib/printText.ts`
- Umstellung der Tourenplan-Report-Komponenten auf die neuen Shared-Helper
- Bereinigung veralteter Legacy-Tests
- Erweiterung der Schutztests für den neuen Tourenplan-Report
- Aktualisierung von `docs/TEST_MATRIX.md` und der UI-Komponenten-Referenz

## Technische Entscheidungen

- Die vom neuen Tourenplan-Report weiterhin benötigten Helper `stripHtmlToText` und `formatEmployeeShortName` wurden vor dem Legacy-Cleanup in ein neutrales Modul verschoben, damit der Report nicht an einer Legacy-Datei hängt.
- Der alte Kalenderdruck wurde vollständig aus dem Wochenkalender entfernt, statt nur Teilkomponenten zu löschen, weil der Pfad noch aktiv verdrahtet war.
- Report-bezogene Print-Primitives und der Endpoint `/api/tours/:tourId/print-preview` wurden bewusst unverändert gelassen.
- Veraltete Tests wurden nur dort gelöscht, wo sie ausschließlich den entfernten Kalenderdruck abgesichert haben. Report-Schutztests wurden gezielt erweitert statt ersetzt.

## Betroffene Dateien

### Produktivcode

- `client/src/components/CalendarWorkspace.tsx`
- `client/src/components/ui/filter-panels/calendar-filter-panel.tsx`
- `client/src/components/reports/tourenplan-model.ts`
- `client/src/components/reports/TourenplanAppointmentCard.tsx`
- `client/src/lib/printText.ts`

### Entfernte Legacy-Dateien

- `client/src/lib/tour-print-preview.ts`
- `client/src/components/calendar/CalendarTourPrintAppointmentRow.tsx`
- `client/src/components/calendar/CalendarTourPrintListPage.tsx`
- `client/src/components/calendar/CalendarTourPrintNoteBlock.tsx`
- `client/src/components/calendar/CalendarTourPrintNoteCard.tsx`
- `client/src/components/calendar/CalendarTourPrintPreviewDialog.tsx`
- `client/src/components/calendar/CalendarTourPrintPreviewPageShell.tsx`
- `client/src/components/calendar/CalendarTourPrintTourNoteBlock.tsx`
- `client/src/components/calendar/CalendarTourPrintWeekTable.tsx`
- `client/src/components/calendar/CalendarTourPrintZusatzinformationen.tsx`

### Tests und Doku

- `tests/unit/lib/printText.test.ts`
- `tests/unit/lib/tourenplan.model.test.ts`
- `tests/unit/ui/tourenplanAppointmentCard.wiring.test.tsx`
- `tests/unit/ui/tourenplanReportPanel.wiring.test.tsx`
- `tests/unit/ui/calendarFilterPanel.weekActionRow.test.tsx`
- `tests/unit/ui/calendarWorkspace.kwSync.wiring.test.tsx`
- `tests/unit/ui/calendarWorkspace.viewSwitch.wiring.test.tsx`
- `tests/e2e-browser/docs-followup.mojibake-regression.browser.e2e.spec.ts`
- `docs/TEST_MATRIX.md`
- `docs/UI-Komponenten-Referenz.md`

## Hinweise zum Testen

### Zielgerichtete Schutzläufe vor dem Volltest

- `npm run check` erfolgreich
- `npm run lint` erfolgreich
- `npm run test:unit` erfolgreich
- `npm run test:integration -- tests/integration/server/tour-print-preview.integration.test.ts tests/integration/server/tour-print-preview.note-refresh.integration.test.ts --reporter=verbose` erfolgreich
- `npm run test:e2e:browser -- tests/e2e-browser/reports.tourenplan.browser.e2e.spec.ts tests/e2e-browser/reports.tourenplan.note-refresh.browser.e2e.spec.ts` erfolgreich

### Voller Audit

- `npm run check` erfolgreich
- `npm run lint` erfolgreich
- `npm run audit` erfolgreich, keine Vulnerabilities gefunden
- `npm run secrets` erfolgreich, keine Leaks gefunden

### Voller Testlauf

- `npm run test:unit` erfolgreich
- `npm run test:integration -- --reporter=verbose` erfolgreich
  - Der erste Versuch lief in ein Command-Timeout und wurde anschließend mit längerem Timeout erneut seriell ausgeführt.
- `npm run test:e2e` erfolgreich
- `npm run test:e2e:browser` fehlgeschlagen

## Bekannte Einschränkungen

- Im vollen Browser-Testlauf bleibt aktuell genau ein Fehler offen:
  - Datei: `tests/e2e-browser/docs-followup.mojibake-regression.browser.e2e.spec.ts`
  - Test: `keeps changed calendar and project labels free of mojibake`
  - Ursache: Der Locator `getByText("Mitarbeiter")` ist nach dem Legacy-Cleanup nicht eindeutig und matched mehrere sichtbare Elemente im Kalender- und Navigationsbereich.
  - Einschätzung: Das ist nach aktuellem Stand ein Testproblem durch einen zu breiten Selector, kein Hinweis auf einen defekten Tourenplan-Report.

## Branch

- Arbeitsbranch: `cleanup/remove-legacy-calendar-print`
