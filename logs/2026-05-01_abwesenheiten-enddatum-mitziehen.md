# Abwesenheiten Enddatum mitziehen

## Anlass

Im Mitarbeiterformular auf dem Tab `Abwesenheiten` musste beim Anlegen oder Bearbeiten einer Abwesenheit das Enddatum bisher separat nachgezogen werden, wenn das Startdatum deutlich verschoben wurde. Das war besonders unpraktisch, wenn der neue Zeitraum mehrere Wochen oder Monate in der Zukunft lag.

Entscheidung:

- Beim Ändern des Startdatums soll das Enddatum automatisch passend mitgezogen werden.
- Wenn noch kein Enddatum gesetzt ist, wird es auf das neue Startdatum gesetzt.
- Wenn bereits ein Zeitraum existiert, bleibt die bisherige Dauer erhalten und der Zeitraum wird insgesamt verschoben.

## Umsetzung

Geändert in:

- [client/src/components/EmployeeAppointmentAbsencesPanel.tsx](/C:/Users/schro/source/repos/Plan/Releases/version02/client/src/components/EmployeeAppointmentAbsencesPanel.tsx)

Umgesetzte Regel:

- Die Abwesenheitsmaske verwendet jetzt eine kleine Datums-Hilfslogik zum Mitschieben des Enddatums.
- Das Verhalten gilt sowohl für die Neuanlage als auch für die Bearbeitung bestehender Abwesenheiten.
- Serverlogik, API-Contracts und Rollenverhalten bleiben unverändert.

## Tests

Aktualisiert:

- [tests/unit/ui/employeeAppointmentAbsencesPanel.dateFormat.test.tsx](/C:/Users/schro/source/repos/Plan/Releases/version02/tests/unit/ui/employeeAppointmentAbsencesPanel.dateFormat.test.tsx)

Erfolgreich ausgeführt:

- `npm run test:unit -- tests/unit/ui/employeeAppointmentAbsencesPanel.dateFormat.test.tsx`

## Rollen und Sichtbarkeit

- Keine Rollenänderung.
- Keine Änderung an serverseitiger Berechtigung oder Sichtbarkeit.
- Es wurde ausschließlich lokales Formularverhalten innerhalb einer bereits erlaubten Bearbeitungsmaske angepasst.

## Bekannte Einschränkungen

- Die Verifikation deckt die Datumslogik gezielt per Unit-Test ab, nicht per DOM-basiertem Interaktionstest.

## Ergebnis

Beim Verschieben des Startdatums im Abwesenheiten-Formular springt das Enddatum jetzt automatisch mit. Dadurch entfällt das manuelle Nachnavigieren im zweiten Datumsfeld bei weit verschobenen Zeiträumen.
