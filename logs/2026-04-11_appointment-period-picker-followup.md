# Log: appointment-period-picker-followup

**Branch:** `refactor-forms-filters`
**Datum:** 2026-04-11

---

## Zweck

Nacharbeit an der neuen Zeitraum-Komponente der Terminliste.

Ausgangslage der Session:

- Der neu eingeführte `AppointmentPeriodPicker` zeigte im Alltag mehrere fachliche Inkonsistenzen.
- Beim Wechsel zwischen `Alle Termine` und `Geplante Termine` wurden Date-/KW-Werte nicht zuverlässig mitgezogen.
- Die untere Zusammenfassungszeile mit `Datum von`, `KW` und `Datum bis` war in einzelnen Zuständen leer oder teilweise verschwunden.
- Der Reset sollte die freie Filterung vollständig auf die verfügbare Grundmenge zurücksetzen.
- Zusätzlich war offen, ob die KW-Logik fachlich korrekt mit ISO-Wochenjahren umgeht, insbesondere für:
  - `KW 0`
  - Werte wie `KW 70`
  - `KW 53` in Jahren mit nur 52 ISO-Wochen

---

## Scope

### Terminlisten-Contract und Server

- `/api/appointments/list` liefert jetzt zusätzlich `availableRange` mit `dateFrom` und `dateTo`.
- `availableRange` wird serverseitig ohne aktive Zeitraumfilter berechnet.
- Die Range respektiert weiterhin den aktiven Terminlisten-Kontext sowie die übrigen Nicht-Zeitraum-Filter.

### Terminlisten-Frontend

- `AppointmentsListPage` verwendet `availableRange` für Default-/Reset-Verhalten der Terminliste.
- Der Startzustand bleibt `Alle Termine`.
- Der Picker setzt beim Öffnen nicht mehr still `dateFrom = heute`.
- Neuer Button `Zurücksetzen` im Picker.
- Reset setzt freie Terminfilter vollständig zurück:
  - `appointmentScope = "all"`
  - freie Textfilter leer
  - Tag-Filter leer
  - Tour-Filter auf Standard
  - Paging zurück auf Seite 1
- Feste Kontextbindungen wie Tour- oder Mitarbeiter-Kontext bleiben erhalten.
- Die sichtbaren Felder `Von`, `Bis` und die untere Zusammenfassung fallen jetzt stabil auf den aktuellen Zustand oder `availableRange` zurück.

### KW-Logik

- Die KW-Eingabe ist jetzt jahresabhängig begrenzt.
- `KW 53` ist nur erlaubt, wenn das relevante ISO-Jahr tatsächlich 53 Wochen hat.
- `KW 0` und Werte außerhalb der gültigen ISO-Wochen wie `70` werden nicht übernommen.
- Spinner bleiben auf die gültige Jahresobergrenze geklemmt.
- Ein zusätzlicher Fehler im `planned`-Scope wurde behoben:
  - `dateTo` wurde vorher durch ein `useEffect` wieder entfernt und konnte dadurch in bestimmten Zuständen nicht stabil gesetzt werden.

---

## Technische Entscheidungen

- Wiederverwendung der vorhandenen ISO-Wochenlogik statt einer separaten Sonderbehandlung.
- Jahresabhängige KW-Grenze über die tatsächliche ISO-Wochenanzahl des relevanten Jahres.
- Browser-E2E mit fest eingefrorenem `Date` im Browser-Kontext, damit 52- und 53-Wochen-Jahre reproduzierbar geprüft werden können.
- Echte Termindaten in den Browser-Tests, damit `Alle` und `Geplante` auf sichtbare Ergebnismengen geprüft werden.

---

## Betroffene Dateien

| Datei | Art |
|---|---|
| `client/src/components/AppointmentsListPage.tsx` | Geändert |
| `client/src/components/ui/appointment-period-picker.tsx` | Geändert |
| `client/src/components/ui/DateRangeKwRangePanel.tsx` | Geändert |
| `client/src/components/ui/filter-panels/appointments-filter-panel.tsx` | Geändert |
| `server/repositories/appointmentsRepository.ts` | Geändert |
| `server/services/appointmentsService.ts` | Geändert |
| `shared/routes.ts` | Geändert |
| `tests/unit/ui/appointmentsListPage.controlled-state.test.tsx` | Erweitert |
| `tests/unit/ui/dateRangeKwRangePanel.kwBounds.test.tsx` | Neu |
| `tests/integration/server/appointments.list.sorting.integration.test.ts` | Erweitert |
| `tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts` | Erweitert |
| `tests/e2e-browser/appointments-list.period-picker.browser.e2e.spec.ts` | Neu |
| `tests/e2e-browser/filter-state-persistence.browser.e2e.spec.ts` | Aktualisiert |
| `tests/e2e-browser/appointments-list.tour-employee.browser.e2e.spec.ts` | Aktualisiert |
| `tests/e2e-browser/attachments.delete-workflow.browser.e2e.spec.ts` | Aktualisiert |
| `docs/TEST_MATRIX.md` | Aktualisiert |

---

## Bisherige Verifikation vor Vollaudit/Volltest

- `npm run test:unit -- tests/unit/ui/appointmentsListPage.controlled-state.test.tsx tests/unit/ui/appointmentsListPage.tourLocking.wiring.test.tsx tests/unit/ui/tourEditDialog.appointmentsPanel.wiring.test.tsx`
- `npm run test:integration -- --reporter=verbose tests/integration/server/appointments.list.sorting.integration.test.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/filter-state-persistence.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/appointments-list.tour-employee.browser.e2e.spec.ts`
- `npm run test:unit -- tests/unit/ui/dateRangeKwRangePanel.kwBounds.test.tsx tests/unit/lib/reportRangeFromKw.test.ts tests/unit/lib/isoWeekInput.test.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/appointments-list.period-picker.browser.e2e.spec.ts`

---

## Bekannte Einschränkungen

- Der Picker arbeitet weiterhin ohne explizites Jahr-Auswahlfeld; das relevante ISO-Jahr wird aus dem aktuellen Zeitraum abgeleitet.
- Die bestehende Logdatei `logs/2026-04-11_refactor-forms-filters.md` enthält ältere Refactor-Kontexte derselben Branch-Arbeit und bleibt als separater Verlaufseintrag bestehen.
