# 05.05.26 | Korrektur | FT-33: Abwesenheiten entfernen Mitarbeiter aus kollidierenden Terminen

## Zusammenfassung

Der Kollisionsfall beim Anlegen oder Bearbeiten von Abwesenheiten wurde fachlich korrigiert. Kollidiert eine Abwesenheit mit bestehenden regulären Terminen desselben Mitarbeiters, werden diese Termine nach Bestätigung nicht mehr auf den Parkplatz verschoben. Stattdessen wird nur der betroffene Mitarbeiter aus den Terminen entfernt; die Termine selbst behalten Tour, Tags, Projekt, Kunde und Terminzeitraum.

## Art der Änderung

Mehrschichtige Korrektur in bestehender Struktur. Betroffen sind Service-Logik, API-Contract, Controller-Fehlerpayload, Bestätigungsdialog im Mitarbeiterformular, Integrationstests und FT-33-Dokumentation. Es wurden keine neuen Endpunkte, keine neuen Rollenregeln und keine DB-Schemaänderungen eingeführt.

## Betroffene Features

- FT (33): Abwesenheiten über interne Personalplanung
- FT (01): Kalendertermine, Mitarbeiterzuordnung

## Konkrete Änderungen

- Der Abwesenheitsservice entfernt bei bestätigten Kollisionen gezielt die Mitarbeiterzuordnung aus regulären Terminen.
- Die alte Parkplatz-Abhängigkeit im FT-33-Konfliktpfad wurde entfernt.
- Der Fehlercode lautet nun `ABSENCE_OVERLAP_REQUIRES_EMPLOYEE_REMOVAL`.
- Bestätigungen werden über `confirmedEmployeeRemovalAppointments` übertragen.
- Konfliktlisten werden als `employeeRemovalConflicts` zurückgegeben.
- Die UI-Meldung beschreibt die tatsächliche Aktion: Mitarbeiter entfernen, Termine nicht umplatzieren.
- Die Integrationstests prüfen, dass der Termin nicht auf den Parkplatz verschoben und nicht mit `Geparkt` getaggt wird.
- Die FT-33-Feature- und Use-Case-Texte wurden auf den korrigierten Ablauf gebracht.

## Rollen

Die Änderung weitet keine Rechte aus. Abwesenheitsmutationen bleiben serverseitig auf `ADMIN` und `DISPONENT` beschränkt. `LESER` behalten die reine Lesesicht. Die Bestätigung im Frontend ersetzt keine Berechtigung; die serverseitige Prüfung und die Terminversionen bleiben maßgeblich.

## Tests / Verifikation

Erfolgreich ausgeführt:

- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test vitest run --config vitest.workspace.ts --project integration --reporter=verbose tests/integration/server/employeeAppointmentAbsences.integration.test.ts`
- `npm run check`

## Offene Punkte

- Kein zusätzlicher Browser-E2E-Lauf.
- Im Arbeitsstand lagen bereits weitere Wiki-Änderungen außerhalb dieser Korrektur. Sie wurden nicht inhaltlich bewertet.
