# Auftragslog: Mitarbeiter-Picker-Aktualisierung

## Zweck

Nach dem Anlegen eines aktiven Mitarbeiters sollte dieser im Kalender beim Hinzufügen von Mitarbeitern zu einem Termin sofort in der angebotenen Mitarbeiterliste erscheinen. Zusätzlich sollte die Mitarbeiterliste im Picker einen Nachname-Filter im Footer anbieten.

## Scope

- Mitarbeiter-Create-Flow wartet die Aktualisierung der Mitarbeiter-Queries ab.
- Mitarbeiter-Picker zeigt den bestehenden Nachname-/Vorname-Filter im Footer.
- Sammelauswahl im Listenmodus behält die Übernehmen-Aktion im Footer.
- Bestehende Backend-Filter, Rollenregeln, Contracts und Datenmodelle bleiben unverändert.

## Technische Entscheidungen

- Die bestehende React-Query-Invalidierung für alle `/api/employees`-Queries wurde beibehalten und im Create-Flow nach dem optionalen Speichern von Sidebar-Daten abgewartet.
- Der Picker verwendet weiter `EmployeePickerFilterPanel`; die Komponente wurde nicht neu erfunden, sondern nur in den Footer-Slot verschoben.
- Die Listen-Übernahme bleibt nur im Bulk-Listenmodus sichtbar, der Filter bleibt in Board- und Listenansicht verfügbar.

## Rollen- und Rechtebezug

Die Änderung erweitert keine Rechte.

- Betroffene Rollen: Administrator und Disponent für Mitarbeiteranlage und Terminzuweisung; Leser nur indirekt über unveränderte Read-only-Sicht.
- Erlaubte Sichtbarkeit: Picker zeigt weiterhin nur serverseitig gelieferte aktive Mitarbeiter.
- Erlaubte Aktionen: Administrator und Disponent können wie bisher Mitarbeiter zu Terminen auswählen; Leser können wie bisher nicht hinzufügen.
- Technische Durchsetzung: serverseitig über bestehende Rollen- und Aktivfilter sowie Termin-Mutationsregeln; UI-Filter ist nur eine Eingabehilfe.

## Betroffene Dateien

- `client/src/components/EmployeeForm.tsx`
- `client/src/components/EmployeePickerDialogList.tsx`
- `tests/unit/ui/employeePickerDialogList.bulkSelection.wiring.test.tsx`

## Hinweise zum Testen

Gezielt ausgeführt:

- `npm run test:unit -- tests/unit/ui/employeePickerDialogList.bulkSelection.wiring.test.tsx --reporter=verbose`
- `npm run typecheck`

Ergebnis:

- 1 Unit-Testdatei erfolgreich
- 2 Unit-Tests erfolgreich
- TypeScript-Prüfung erfolgreich

## Bekannte Einschränkungen

- Es wurde kein voller Audit und kein vollständiger Browser-E2E-Lauf ausgeführt.
- Die Änderung setzt voraus, dass der Server den neu angelegten Mitarbeiter aktiv zurückliefert. Diese Regel ist bestehendes Verhalten von `POST /api/employees` und wurde nicht verändert.
