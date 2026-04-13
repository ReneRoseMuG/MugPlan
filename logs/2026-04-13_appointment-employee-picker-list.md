# Auftragslog: appointment-employee-picker-list

## Zweck

Erweiterung der Mitarbeiterauswahl im Terminformular um eine zweite, persistente Listenansicht mit Checkboxen und gemeinsamer Übernahme mehrerer Mitarbeitender.

Zusätzlich lokaler Folgefix für die Scrollbarkeit der neuen Listenansicht im Dialog.

## Scope

- Terminformular: Mitarbeiter-Picker um Board/List-Wechsel erweitert
- Listenansicht mit sortierter Anzeige, Checkboxen und Sammelübernahme ergänzt
- Persistenz des gewählten Views über User-Settings eingeführt
- Sichtbare vertikale Scrollbarkeit der Listenansicht nachgezogen
- fokussierter Unit-Test für den neuen Picker ergänzt
- `docs/TEST_MATRIX.md` aktualisiert

## Technische Entscheidungen

- Kein neuer API- oder Service-Pfad: bestehende Termin-Zuweisungslogik bleibt maßgeblich
- View-Persistenz folgt dem vorhandenen Settings-Muster statt lokalem `localStorage`
- Bulk-Auswahl ist nur für den Terminformular-Picker aktiviert; andere Picker-Verwendungen bleiben beim bisherigen Einzelklick-Verhalten
- Scroll-Fix wurde minimal-invasiv über Flex-/Overflow-Kette und sichtbare vertikale Scrollbar-Klasse umgesetzt

## Betroffene Dateien

- `client/src/components/AppointmentForm.tsx`
- `client/src/components/EmployeePickerDialogList.tsx`
- `client/src/components/ui/list-layout.tsx`
- `client/src/index.css`
- `server/settings/registry.ts`
- `tests/unit/ui/employeePickerDialogList.bulkSelection.wiring.test.tsx`
- `docs/TEST_MATRIX.md`

## Hinweise zum Testen

Ausgeführt:

- `npm run test:unit -- tests/unit/ui/employeePickerDialogList.bulkSelection.wiring.test.tsx`
- `npm run check`

Manuell relevant:

- Terminformular öffnen
- „Mitarbeiter hinzufügen“ öffnen
- zwischen Board- und Listenansicht wechseln
- mehrere Mitarbeitende in der Listenansicht markieren und gemeinsam übernehmen
- Dialog erneut öffnen und prüfen, dass der zuletzt gewählte View erhalten bleibt
- bei längerer Liste vertikale Scrollbarkeit prüfen

## Bekannte Einschränkungen

- Es wurde kein voller Audit und kein voller Testlauf durchgeführt
- Die neue Bulk-Interaktion ist bewusst nur im Terminformular aktiv, nicht in Team-/Tour- oder sonstigen Picker-Kontexten
