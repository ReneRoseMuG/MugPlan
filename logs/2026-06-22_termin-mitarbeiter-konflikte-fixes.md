# Termin-Mitarbeiter: Versionskonflikt, Eignungsanzeige, „kein Mitarbeiter"-Warnung

Datum: 22.06.26
Branch: `merge/ms68-ms52`

## Zweck

Drei vom Nutzer beim Testen gefundene Fehler rund um die Termin-Mitarbeiter-Zuweisung beheben und die Testabsicherung der betroffenen Pfade nachziehen (die zuvor Lücken hatte, durch die ein Fehler trotz „getestet"-Meldung offen blieb).

## Scope

### Bug 1 — 409 VERSION_CONFLICT bei der Menü-Zuweisung
Das Zuweisen/Entfernen über das Karten-Kontextmenü der Wochenkarte schlug nach vorangegangenen Wochenplanungs-Aktionen mit „Termin wurde zwischenzeitlich geändert" (409) fehl; über das Formular funktionierte dieselbe Aktion.

- **Ursache:** Die Menü-Mutationen sendeten `version` aus dem evtl. veralteten Kalender-Aggregat-Cache (`appointmentsById`), ohne Fresh-Fetch und ohne Retry. Der Formularpfad las die Version frisch.
- **Fix:** Beide Menü-Mutationen lesen den Termin unmittelbar vor dem Schreiben frisch (`GET /api/appointments/:id`) und wiederholen bei `VERSION_CONFLICT` genau einmal mit neu gelesener Version. Neue Mitarbeiter werden additiv auf den frischen Serverstand gelegt (dedupliziert).

### Bug 2 — Eignungsanzeige im Formular-Picker
Der aus dem Terminformular geöffnete Mitarbeiter-Picker zeigte belegte Mitarbeiter nicht gesperrt (anders als der Menü-Picker), der gestern als gelöst gemeldete Fall blieb offen.

- **Ursache:** `handleOpenEmployeePicker` rief die Konfliktvorschau ohne `includeAvailableEmployees: true` auf; der Server liefert die systemweiten Konflikt-Mitarbeiter nur mit diesem Flag. Es gab keinen Test, der das Senden des Flags prüfte.
- **Fix:** Die Vorschau-Logik wurde in den exportierten Helfer `resolveEmployeePickerConflictReasons` gezogen, der das Flag verbindlich setzt (Aufrufstelle kann es nicht mehr vergessen).

### Bug 3 — fehlende „Termin hat keine Mitarbeiter"-Warnung beim Abziehen des letzten MA
Beim Klick auf „–" am Mitarbeiter-Badge der Wochenkarte fehlte nach dem Abziehen des letzten Mitarbeiters die Konfliktmeldung „Termin ohne Mitarbeiter".

- **Analyse:** Die Konfliktprüfung existiert (Monitoring TR-01 „Mindestzahl Mitarbeiter"). Die post-Aktion-Benachrichtigung über `refreshMonitoringWithNotification` wurde aber (a) durch den unmittelbar danach gefeuerten Erfolgs-Toast verdrängt (`TOAST_LIMIT = 1`) und ist (b) global statt termin-bezogen (`shouldNotify`).
- **Entscheidung (auf Nutzeransage):** Kein neuer Benachrichtigungs-Mechanismus. Stattdessen wird das bestehende Konflikthandling wiederverwendet — dieselbe `DialogBaseInlineMessage`-Warnung „Termin hat keine Mitarbeiter" wie im Terminformular, eingeblendet im Bestätigungsdialog des Entfernen-Pfads, sobald der letzte Mitarbeiter abgezogen wird.

## Technische Entscheidungen

- **Frische Version + einmaliger Retry** statt neuem Add-Endpunkt: spiegelt das vorhandene Muster (Formular-Lösch-/Backfill-Pfad), kein Contract-Eingriff. `VERSION_CONFLICT`-Erkennung über den vorhandenen Helfer `extractServerErrorCode`.
- **Flag-besitzender Helfer** (`resolveEmployeePickerConflictReasons`): macht die Verdrahtung ohne DOM-Testumgebung node-testbar und verhindert das Vergessen des Flags an der Aufrufstelle.
- **Warnung über bestehende Komponente**: `ResourcePlanningDialog` rendert die vorhandene Warnung jetzt auch im kompakten `infoText`-Remove-Layout, gesteuert durch das neue optionale Flag `appointmentWillHaveNoEmployees`. Die Bedingung wird aus dem bereits erfassten, zuvor ungenutzten `currentEmployeeIds` abgeleitet.

## Betroffene Dateien

Produktivcode:
- `client/src/components/calendar/CalendarWeekView.tsx` — Fresh-Version-Helfer (`buildAssignAppointmentEmployeesPayload`, `runAppointmentEmployeeWriteWithFreshVersion`, `loadFreshAppointmentForEmployeeWrite`, Typ `FreshAppointmentForEmployeeWrite`), umverdrahtete Zuweisen/Entfernen-Mutationen, `willAppointmentHaveNoEmployeesAfterRemoval` + Warn-Flag am Dialog, Import `extractServerErrorCode`.
- `client/src/components/AppointmentForm.tsx` — `loadTourAssignmentPreview`-Option, exportierter `resolveEmployeePickerConflictReasons`, umverdrahtetes `handleOpenEmployeePicker`.
- `client/src/components/ResourcePlanningDialog.tsx` — Prop `appointmentWillHaveNoEmployees`, Warnung „Termin hat keine Mitarbeiter" auch im Remove-Layout.
- `client/src/components/TourEmployeeCascadeDialog.tsx` — Prop durchgereicht.

Tests / Doku:
- `tests/unit/ui/calendarWeekView.appointmentEmployeeWrite.test.ts` (neu)
- `tests/unit/ui/appointmentForm.employeePickerEligibility.wiring.test.tsx` (neu)
- `tests/unit/ui/resourcePlanningDialog.noEmployeesWarning.test.tsx` (neu)
- `tests/integration/server/tourWeekEmployees.integration.test.ts` (erweitert: Gegenbeweis ohne/mit Flag)
- `docs/TEST_MATRIX.md` (gepflegt)

## Hinweise zum Testen

- `npm run check` — grün (Encoding, tsc, Lint).
- `npm run test:unit -- calendarWeekView.appointmentEmployeeWrite` — Version/Retry/Merge + letzter-MA-Erkennung.
- `npm run test:unit -- appointmentForm.employeePickerEligibility` — Picker fordert `includeAvailableEmployees` und mappt Sperrgründe.
- `npm run test:unit -- resourcePlanningDialog.noEmployeesWarning` — Warnung erscheint genau im letzter-MA-Fall (inkl. Gegenbeispiel).
- `npm run test:integration -- tourWeekEmployees --reporter=verbose` — 35/35, inkl. Gegenbeweis: ohne Flag fehlt der systemweite Konflikt-MA, mit Flag erscheint er gesperrt.
- Regressionslauf der betroffenen Komponenten-Tests: grün (keine Regression).

## Bekannte Einschränkungen

- Keine Live-Browser-Verifikation in dieser Session; das sichtbare Verhalten ist über node-testbare Helfer, Server-Integration und statische Render-Tests belegt. Es ist keine DOM-Testumgebung (jsdom/happy-dom) installiert, daher kein interaktiver Render-Test.
- Die globale `shouldNotify`-Heuristik und die `TOAST_LIMIT = 1`-Toast-Verdrängung im Monitoring wurden als Mitursache von Bug 3 identifiziert, aber bewusst **nicht** geändert — der Fix nutzt die Dialog-Warnung statt des Monitoring-Toasts.
- Der Warntitel „Termin hat keine Mitarbeiter" steht jetzt im Save-Review- und im Remove-Dialog (bewusst gleicher Wortlaut; optional später als gemeinsame Konstante zentralisierbar).
- Kein Schema/Migration betroffen. Kein voller Audit/Testlauf (vom Nutzer nicht gewünscht).
- Bug 1 deckt symmetrisch Zuweisen und Entfernen ab (gleiche Ursache).
