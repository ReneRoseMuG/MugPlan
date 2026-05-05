# 05.05.26 | Korrektur | FT-33: Abwesenheiten entfernen Mitarbeiter aus Tour-KW-Planungen

## Zusammenfassung

Der Abwesenheitsflow erkennt jetzt zusätzlich Tour-KW-Planungen des betroffenen Mitarbeiters. Wenn eine Abwesenheit eine Kalenderwoche berührt, in der der Mitarbeiter in einer Tour-KW eingeplant ist, fordert das System eine ausdrückliche Bestätigung an. Nach Bestätigung wird nur die Tour-KW-Mitarbeiterzuordnung entfernt. Termine werden weiterhin nicht umplatziert.

## Art der Änderung

Mehrschichtige Korrektur in bestehender Struktur. Betroffen sind Service-Logik, API-Contract, Controller-Fehlerpayload, Bestätigungsdialog im Mitarbeiterformular, Integrationstests, Browser-E2E und FT-33-Dokumentation. Es wurden keine neuen Tabellen, keine neuen Endpunkte und keine neuen Rollen eingeführt.

## Betroffene Features

- FT (33): Abwesenheiten über interne Personalplanung
- FT (04): Tourenplanung / Tour-KW-Mitarbeiterplanung
- FT (01): Kalendertermine, Mitarbeiterzuordnung

## Konkrete Änderungen

- Der Abwesenheitsservice ermittelt die vom Zeitraum betroffenen ISO-KWs.
- Bestehende Tour-KW-Zuordnungen des Mitarbeiters werden als Konflikte zurückgegeben.
- Die UI zeigt Termin- und Tour-KW-Konflikte im gemeinsamen Bestätigungsdialog.
- Bei Bestätigung sendet die UI `confirmedWeekPlanningRemovals`.
- Der Server prüft die bestätigten KW-Zuordnungen erneut und löscht nur diese Mitarbeiterzuordnungen.
- Ohne Bestätigung bleiben Abwesenheit, Terminzuweisungen und Tour-KW-Planungen unverändert.
- Die Testsuite wurde um Service- und Browser-Szenarien für Dispatcher, Admin, laufende Abwesenheiten, aktuelle KW und Abbruch ergänzt.

## Rollen

Die Änderung weitet keine Rechte aus. Abwesenheitsmutationen bleiben serverseitig auf `ADMIN` und `DISPONENT` beschränkt. `LESER` behalten die reine Lesesicht. Die Bestätigung im Frontend ersetzt keine Berechtigung; die serverseitige Rollenprüfung und die erneute Konfliktprüfung bleiben maßgeblich.

## Tests / Verifikation

Erfolgreich ausgeführt:

- `npm run check`
- `npm run test:integration -- tests/integration/server/employeeAppointmentAbsences.integration.test.ts --reporter=verbose`
- `npm run test:e2e:browser -- tests/e2e-browser/ft33-absence-week-planning.browser.e2e.spec.ts`

## Offene Punkte

Keine fachlichen Blocker bekannt.
