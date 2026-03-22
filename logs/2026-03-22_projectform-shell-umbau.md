# ProjectForm auf EntityFormShell umgestellt

## Zweck

Das Projektformular auf das neue generische Standard-Layout mit `EntityFormShell` umstellen, ohne die bestehende Fachlogik fuer Create, Edit, Draft-Sidebar und Dialoge zu veraendern.

## Scope

- `client/src/components/ProjectForm.tsx`
- `tests/unit/ui/projectForm.customerRelationSlot.test.tsx`
- `tests/unit/ui/projectForm.tabs.render.test.tsx`
- `tests/unit/ui/projectForm.layoutShellIntegration.test.tsx`
- `docs/TEST_MATRIX.md`

## Technische Entscheidungen

- `ProjectForm` verwendet jetzt `EntityFormShell` statt `EntityFormLayout`.
- Header und Footer werden explizit uebergeben; der Footer folgt dem Split-Muster mit Sekundaeraktionen links und der Save-Aktion rechts.
- Die Sidebar bleibt in Create und Edit voll aktiv und behaelt die Reihenfolge:
  - `ProjectAppointmentsPanel`
  - `ProjectAttachmentsPanel`
  - `TagPickerPanel`
  - `NotesSection`
- `ProjectAppointmentsPanel` bleibt auch im Create-Modus sichtbar, aber unveraendert readonly bzw. ohne aktive Termin-Erstellung.
- USER-Breiten werden nicht lokal uebersteuert; `ProjectForm` nutzt die bereits vorhandenen `EntityFormShell`-Settings.
- Die Test-Matrix wurde auf real vorhandene `ProjectForm`-Testdateien bereinigt und um den neuen Shell-Layouttest erweitert.

## Tests

Ausgefuehrt:

- `npm test -- tests/unit/ui/projectForm.customerRelationSlot.test.tsx tests/unit/ui/projectForm.tabs.render.test.tsx tests/unit/ui/projectForm.layoutShellIntegration.test.tsx`
- `npm run check`

## Bekannte Einschraenkungen

- Der Umbau betrifft in diesem Schritt nur `ProjectForm`; weitere Formulare mit altem `EntityFormLayout` bleiben unberuehrt.
- Es wurde kein voller Audit und kein voller Testlauf ausgefuehrt.
