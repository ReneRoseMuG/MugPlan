# 05.05.26 | Bugfix | Mitarbeiter-Picker nach Neuanlage aktualisiert

## Zusammenfassung

Nach dem Speichern eines neuen aktiven Mitarbeiters wird die Mitarbeiterliste jetzt verlässlich aktualisiert, bevor das Mitarbeiterformular geschlossen wird. Dadurch steht der neue Mitarbeiter beim anschließenden Öffnen des Kalender-Terminformulars in der Funktion „Mitarbeiter hinzufügen“ zur Auswahl.

Zusätzlich wurde der bestehende Nachname-/Vorname-Filter des Mitarbeiter-Pickers in den Footer der angebotenen Mitarbeiterliste verschoben.

## Betroffene Features

- [FT (01): Kalendertermine](../features/ft-01-kalendertermine/ft-01-kalendertermine.md)
- [FT (05): Mitarbeiterverwaltung](../features/ft-05-mitarbeiterverwaltung/ft-05-mitarbeiterverwaltung.md)

## Technische Umsetzung

Der Create-Flow in `EmployeeForm.tsx` wartet die Invalidierung aller `/api/employees`-Queries ab. Der Picker in `EmployeePickerDialogList.tsx` rendert den bestehenden `EmployeePickerFilterPanel` nun im Footer und behält die Sammel-Übernahme im Listenmodus bei.

## Rollenbezug

Keine Änderung an Rollen oder Berechtigungen. Administrator und Disponent verwenden weiter die bestehende Mitarbeiteranlage und Terminzuweisung. Leser können weiterhin keine Mitarbeiter zu Terminen hinzufügen. Die erlaubte Mitarbeitermenge wird unverändert serverseitig über aktive Mitarbeiter und Rollenfilter bestimmt.

## Verifikation

Gezielt erfolgreich ausgeführt:

- `npm run test:unit -- tests/unit/ui/employeePickerDialogList.bulkSelection.wiring.test.tsx --reporter=verbose`
- `npm run typecheck`

## Offene Punkte

- Kein voller Browser-E2E-Lauf in diesem Auftrag.
