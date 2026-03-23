# Tour- und Teamformular auf EntityFormShell umstellen

## Zweck

Tour- und Teamformular auf das neue Standard-Layout `EntityFormShell` umstellen, ohne fachliche Aenderungen an Create-, Edit-, Save-, Delete- oder Mitgliederlogik.

## Scope

- `TourEditForm` von `EntityFormLayout` auf `EntityFormShell` migriert
- `TeamEditForm` von `EntityFormLayout` auf `EntityFormShell` migriert
- leere Sidebar fuer beide Formulare bewusst nicht gerendert
- sichtbare Strukturtests fuer Tour und Team ergaenzt
- bestehenden Tour-Terminlisten-Wiring-Test auf `EntityFormShell` angepasst
- `docs/TEST_MATRIX.md` aktualisiert

## Technische Entscheidungen

- Keine Sidebar fuer Tour und Team, weil beide Formulare aktuell keinen Sidebar-Inhalt haben und eine leere rechte Spalte die Flaechennutzung verschlechtern wuerde.
- `TourEditForm` behaelt den `Termine`-Tab im Hauptbereich; er wird nicht in eine Sidebar verschoben.
- Footer-Aktionen folgen dem etablierten Shell-Muster:
  - links: Delete im Edit-Modus und Cancel
  - rechts: Save
- Bestehende Test-IDs fuer Save, Cancel und Delete bleiben erhalten.

## Betroffene Dateien

- `client/src/components/TourEditForm.tsx`
- `client/src/components/TeamEditForm.tsx`
- `tests/unit/ui/tourEditDialog.appointmentsPanel.wiring.test.tsx`
- `tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx`
- `tests/unit/ui/teamEditForm.layoutShellIntegration.test.tsx`
- `docs/TEST_MATRIX.md`

## Testen

Gezielt vorgesehen:

- `npm test -- tests/unit/ui/tourEditDialog.appointmentsPanel.wiring.test.tsx tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx tests/unit/ui/teamEditForm.layoutShellIntegration.test.tsx`
- `npm run check`
- `npm run lint`

## Bekannte Einschraenkungen

- Keine neue Sidebar-Funktionalitaet fuer Tour oder Team.
- Keine Verschiebung des Tour-Termine-Tabs in einen anderen Bereich.
- Keine Aenderung an Management-Containern, Mutationen oder Backend-Vertraegen.
