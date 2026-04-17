# Tour-Week-Unification

**Datum:** 2026-04-17
**Branch:** feature/tour-week-unification
**Status:** In Arbeit

---

## Zweck

Die Wochenplanung von Touren und Mitarbeitern wurde auf ein gemeinsames Domänenobjekt `tour_week` und eine gemeinsame UI-Darstellung zusammengeführt. Ziel war eine einheitliche Wochenkarte, ein eigenes Wochenformular mit Stammdaten- und Termine-Tab, KW-bezogene Notizen in der Sidebar sowie der Nachweis, dass Termin-, Notiz- und Mitarbeitermutationen sofort in den darstellenden UI-Komponenten reflektiert werden.

---

## Scope

Betroffen sind Frontend, geteilte API-Verträge, Serverprojektionen und Testebenen. Keine Schemaänderung, keine Migration, keine neuen Abhängigkeiten.

| Bereich | Dateien / Schwerpunkte |
|---|---|
| Verträge / Projektion | `shared/routes.ts`, `server/services/tourWeekEmployeesService.ts`, `server/services/employeesService.ts` |
| Gemeinsame UI | `client/src/components/TourWeekCard.tsx`, `client/src/components/TourWeekForm.tsx`, `client/src/components/TourWeekAppointmentsHoverPreview.tsx`, `client/src/components/TourWeekNotesHoverPreview.tsx` |
| Bestehende Formulare / Launcher | `client/src/components/TourEditForm.tsx`, `client/src/components/EmployeeForm.tsx`, `client/src/components/TourManagement.tsx`, `client/src/components/EmployeesPage.tsx` |
| Terminlisten-Einbettung | `client/src/components/AppointmentsListPage.tsx`, `client/src/components/ui/filter-panels/appointments-filter-panel.tsx` |
| Invalidierung / Hilfslogik | `client/src/lib/tour-week-queries.ts`, `client/src/lib/employee-appointments-utilization.ts`, `client/src/components/ui/hover-preview.tsx` |
| Tests | `tests/unit/ui/*tourWeek*`, `tests/unit/ui/appointmentsListPage.fixedDateRange.wiring.test.tsx`, `tests/integration/server/tourWeekEmployees.integration.test.ts`, `tests/e2e-browser/tour-week-form.browser.e2e.spec.ts`, bestehende FT04-/FT05+-Browser- und Unit-Regressionen |

---

## Technische Entscheidungen

**Gemeinsame Wochenprojektion statt paralleler Kartenmodelle.**
Die Responses für Tour- und Mitarbeiter-Wochenlisten liefern jetzt kompatible `tour_week`-Daten mit `appointmentsCount`, `notesCount`, Tourmetadaten und Mitarbeiterliste. Dadurch speisen Board, Hover-Preview und Wochenformular dieselbe Sicht auf die KW.

**Neue gemeinsame Wochenkarte auf Basis bestehender Entity-Card-Muster.**
`TourWeekCard` übernimmt die sichtbare Vereinheitlichung für Tour- und Mitarbeiter-Scope. Die Karte zeigt die Datumszeile im Format `dd.MM.yy - dd.MM.yy`, die Mitarbeiterliste, Blockierungszustand und die Hover-Badges für Termine und Notizen.

**Eigenes Wochenformular statt verstreuter Teilansichten.**
`TourWeekForm` kapselt die KW-bezogenen Informationen in einer Vollansicht mit Tabs `Stammdaten` und `Termine`. Im Tour-Scope bleibt die Mitarbeiterauswahl bearbeitbar, im Mitarbeiter-Scope ist sie read-only. Die Sidebar rendert das bestehende `NotesSection`-Pattern für echte Wochennotizen.

**Bestehende Terminliste wird wiederverwendet, aber hart auf die KW fixiert.**
`AppointmentsListPage` erhielt `fixedDateRange`. Das Wochenformular blendet damit den Zeitraum-Picker aus und erzwingt serverseitig wie clientseitig die Woche des aktiven `tour_week`.

**Sofortige UI-Reflexion über gezielte Query-Invalidierung.**
`invalidateTourWeekQueries` bündelt die relevanten Tour-, Mitarbeiter-, Termin- und Notiz-Queries. Nach Mitarbeiter-, Notiz- und Terminmutationen werden Wochenkarten, Hover-Previews, eingebettete Terminlisten und Wochennotizen ohne manuellen Reload aktualisiert.

**Board- und Listenpfade des Mitarbeiter-Pickers bleiben funktional.**
Im Wochenformular wurde neben Bulk-Confirm auch die Einzelübernahme per Doppelklick im Board-Mode verdrahtet, damit die Picker-Funktion nicht nur in der Listenansicht funktioniert.

---

## Hinweise zum Testen

- Unit:
  - `npx vitest run tests/unit/ui/tourWeekForm.render.test.tsx tests/unit/ui/tourWeekCard.render.test.tsx tests/unit/ui/appointmentsListPage.fixedDateRange.wiring.test.tsx tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx tests/unit/ui/employeeForm.layoutShellIntegration.test.tsx`
- Integration:
  - `npm run test:integration -- --reporter=verbose tests/integration/server/tourWeekEmployees.integration.test.ts`
- Browser-E2E:
  - `npm run test:e2e:browser -- tests/e2e-browser/employee-form-week-planning.browser.e2e.spec.ts`
  - `npm run test:e2e:browser -- tests/e2e-browser/employee-appointment-mutation-tracking.browser.e2e.spec.ts`
  - `npm run test:e2e:browser -- tests/e2e-browser/tour-week-form.browser.e2e.spec.ts`

---

## Umgesetzte Änderungen

1. Gemeinsames `tour_week`-Kartenmodell in Tour- und Mitarbeiterprojektionen ergänzt, inklusive Termin- und Notizzählern.
2. Vereinheitlichte Wochenkarte mit Footer-Badges, Blockierungszustand und Scope-spezifischer Mitarbeiterdarstellung eingeführt.
3. Eigenes Wochenformular mit Tabs, Sidebar-Notizen, read-only-/editierbarer Mitarbeiterdarstellung und KW-gefilterter Terminliste eingebaut.
4. Öffnung des Wochenformulars aus Tour- und Mitarbeiter-Wochenkarten per Doppelklick verdrahtet.
5. Invalidierungslogik für Wochenkarten, Wochennotizen, Terminlisten und Hover-Previews vereinheitlicht.
6. Bestehende Layout-Regressionstests für Tour- und Mitarbeiterformular an die neue Wochenkartenstruktur angepasst.
7. Neue Unit-, Integration- und Browser-E2E-Tests für Wochenkarte, Wochenformular, KW-Fixierung und UI-Reflexion ergänzt.
8. `docs/TEST_MATRIX.md` für die neuen und erweiterten Tests aktualisiert.

---

## Bekannte Einschränkungen

- `npm run check` scheitert weiterhin am bestehenden repo-weiten Encoding-Lint mit vielen Alt-Treffern außerhalb dieses Auftrags. TypeScript, gezielte Unit-Tests, Integration und die relevanten Browser-E2Es für `tour_week` laufen.
- Ein voller Testlauf wurde zum Zeitpunkt dieses Logs noch nicht vollständig als Serien-Report abgeschlossen; der Audit-/Test-Report wird separat nachgeführt.
