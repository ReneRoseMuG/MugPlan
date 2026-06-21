# MS-58 — Eignungsanzeige in den Mitarbeiter-Dialogen

Datum: 21.06.26
Branch: `refactor/ms58-employee-picker-eligibility`

## Zweck

Mitarbeiter-Auswahldialoge sollen nicht-verfügbare Mitarbeiter **sichtbar** machen und **begründen**, warum sie nicht wählbar sind — statt sie kommentarlos auszublenden. Auslöser waren zwei vom Nutzer beim Testen gefundene Stellen:

1. **Wochen-Picker** („Mitarbeiter auswählen – KW xx"): bereits verplante und ganztägig abwesende Mitarbeiter fehlten spurlos.
2. **Termin-Zuweisung** („Mitarbeiter zuweisen", Karten-Kontextmenü und Termin-Formular): Mitarbeiter im Urlaub bzw. mit Terminkonflikt fehlten oder trugen keinen aussagekräftigen Grund.

## Scope

Zwei getrennte, aber thematisch verwandte Eingriffe auf demselben Branch:

### A) Wochen-Picker (Datenquelle `/api/tours/:tourId/week-employees/available`)
- `server/services/tourWeekEmployeesService.ts` — `listAvailableWeekEmployees` filtert verplante/vollabwesende Mitarbeiter nicht mehr weg, sondern liefert alle aktiven mit `ineligibleReason` (`Bereits verplant: <Tour>` / `Ganze Woche abwesend` / `null`). Inaktive bleiben ausgeschlossen.
- `server/repositories/tourWeekEmployeesRepository.ts` — neue Query `listAssignedEmployeeTourNamesByWeek` (Tour-Namen je verplantem Mitarbeiter der KW).
- `shared/routes.ts` — Response des `available`-Endpunkts auf `(Employee & { ineligibleReason: string | null })[]` erweitert.
- Clients (alle vier Wochen-Picker konsistent): `CalendarWeekView`, `TourWeekForm`, `TourWeekPlanningView`, `TourEditForm` übergeben die volle Liste und leiten `ineligibleReasonById` über den neuen Helper `buildIneligibleReasonById` (exportiert aus `EmployeePickerDialogList.tsx`) ab.

### B) Termin-Zuweisung (Datenquelle `/api/tours/:tourId/week-employees/assignment-preview`)
- `server/repositories/appointmentsRepository.ts` — `getConflictingEmployeesTx` additiv um `isAbsence` erweitert (Abwesenheits-Tour-Termin via `buildAbsenceTourCondition`). Die 9 weiteren Aufrufer bleiben unberührt.
- `server/services/tourWeekEmployeesService.ts` — `buildAvailableEmployeePreviewItemsTx` blendet Konflikt-Mitarbeiter nicht mehr aus, sondern liefert sie als `status: "conflict"`, `selectable: false` mit differenziertem `conflictReason`. Auch die `week_plan`-Konfliktstelle unterscheidet jetzt `ON_LEAVE` vs. `EMPLOYEE_OVERLAP`.
- Clients: `buildAppointmentAssignIneligibleReasons` (CalendarWeekView) und `buildEmployeePickerConflictReasons` (AppointmentForm) werten `conflictReason` aus → „Im Urlaub / abwesend", „Überschneidung mit bestehendem Termin", „Bereits diesem Termin zugewiesen".

## Technische Entscheidungen

- **Annotieren statt filtern**: Die Anzeige-Komponente `EmployeePickerDialogList` kann gesperrte Einträge mit Grund bereits darstellen. Beide Eingriffe nutzen denselben Mechanismus, statt neue Dialoge zu bauen.
- **`getConflictingEmployeesTx` additiv erweitert** (`isAbsence`-Flag), damit die Konfliktart differenziert werden kann, ohne die 9 weiteren Aufrufer zu verändern.
- **Kein Contract-Strukturbruch** bei B: `conflictReason` ist bereits `string | null`; nur der Wertebereich kam um `ON_LEAVE` dazu.
- **Abwesenheit = Termin in der Abwesenheiten-Tour**: bestätigt über `createEmployeeAppointmentAbsence`, das einen ganztägigen Termin in der Abwesenheiten-Tour anlegt; damit greift die bestehende Overlap-Prüfung.

## Hinweise zum Testen

- `npm run check` — grün (tsc + Encoding + destructive-inventory).
- `npm run test:unit -- employeePickerDialogList.eligibility` — 5/5 grün (inkl. `buildIneligibleReasonById`).
- `npm run test:unit -- calendarWeekView.compactHeader` — 9/9 grün (inkl. differenziertem `ON_LEAVE`-Mapping).
- `npm run test:integration -- tourWeekEmployees --reporter=verbose` — 34/34 grün (Wochen-Verfügbarkeit + assignment-preview-Eignungsanzeige inkl. Urlaubs-/Konflikt-Gegenbeispielen).
- Neuer Browser-E2E-Test in `tour-week-employee-picker-cache.browser.e2e.spec.ts` (Wochen-Picker zeigt verplanten Mitarbeiter gesperrt mit Tour-Grund) — siehe Einschränkung unten.

## Bekannte Einschränkungen

- **Browser-Tests aktuell blockiert**: Die in einem früheren Schritt dieser Session eingeführte Login-Optimierung (`tests/helpers/globalAuthSetup.ts` als Playwright-`globalSetup`) erreicht die Login-Seite nicht und bricht damit die gesamte Browser-Suite ab. Ursache wird gerade per Diagnose eingegrenzt; die fachlichen Änderungen sind durch Unit + Integration abgesichert.
- Der gesamte Branch-Arbeitsstand (Eignungsanzeige A+B, Login-Optimierung, testTimeout-Erhöhung) ist noch **uncommitted**.
