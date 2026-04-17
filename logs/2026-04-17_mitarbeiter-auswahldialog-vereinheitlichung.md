# Auftragslog: Mitarbeiter-Auswahldialog Vereinheitlichung

## Zweck

Die aktiven Mitarbeiter-Auswahlpfade fuer Team, Tour-KW und Termin sollten im UI denselben vorhandenen Auswahldialog mit Board- und Listenansicht verwenden, ohne die fachliche Filterlogik oder Datenbeschaffung umzubauen.

## Scope

- Vereinheitlichung des Dialog-Auftritts im Team- und Tour-KW-Pfad auf den bereits im Terminpfad verwendeten gemeinsamen Picker
- Aktivierung der Bulk-Auswahl im Team-Pfad ueber die vorhandene Listenansicht
- Angleichen des Persistenz-Keys fuer die Board-/Listenansicht
- Keine Aenderung an API, Serverlogik, Contracts oder Mitarbeiter-Verfuegbarkeitsregeln

## Technische Entscheidungen

- Der bestehende `EmployeePickerDialogList` bleibt die einzige gemeinsame Dialogbasis.
- Die Aenderung wurde bewusst auf aktive UI-Aufrufpfade begrenzt, um das Release-Risiko klein zu halten.
- Fuer die View-Mode-Persistenz wird der bestehende Setting-Key `appointmentEmployeePicker.viewMode` wiederverwendet.
- Die Mitarbeitermengen bleiben je Flow unveraendert und werden weiterhin durch die bestehende Logik der jeweiligen Formulare bereitgestellt.

## Betroffene Dateien

- `client/src/components/TeamEditForm.tsx`
- `client/src/components/TourWeekForm.tsx`
- `tests/unit/ui/teamEditForm.layoutShellIntegration.test.tsx`
- `tests/unit/ui/tourWeekForm.render.test.tsx`

## Hinweise zum Testen

Gezielt ausgefuehrt:

- `npx vitest run tests/unit/ui/teamEditForm.layoutShellIntegration.test.tsx`
- `npx vitest run tests/unit/ui/tourWeekForm.render.test.tsx`

Beide Testlaeufe waren erfolgreich.

## Bekannte Einschraenkungen

- Es wurde kein voller Audit und kein voller Testlauf ausgefuehrt.
- Die Vereinheitlichung bezieht sich auf die aktiven Team-, Tour-KW- und Termin-Pfade. Nicht aktive Alt-Komponenten wurden bewusst nicht angepasst.
