# Planung

## Inventur der Bausteine (Ist-Zustand)

- **InfoBadge**: `client/src/components/ui/info-badge.tsx`, Export `InfoBadge`.
- **PersonInfoBadge**: `client/src/components/ui/person-info-badge.tsx`, Export `PersonInfoBadge`.
- **EmployeeInfoBadge**: `client/src/components/ui/employee-info-badge.tsx`, Export `EmployeeInfoBadge`.
- **Dialogfähige Employee CardList**: Aktuell wird in den Edit-Dialogen eine checkboxbasierte Liste in `client/src/components/ui/employee-select-entity-edit-dialog.tsx` verwendet; CardList-Layouts existieren als `CardListLayout` (`client/src/components/ui/card-list-layout.tsx`) und `FilteredCardListLayout` (`client/src/components/ui/filtered-card-list-layout.tsx`). Eine spezifische dialogfähige Employee-CardList ist nicht separat benannt.
- **Dialog/Modal-Mechanismus**: shadcn/ui `Dialog` aus `client/src/components/ui/dialog.tsx` (z. B. verwendet in `ProjectForm.tsx`, `NotesSection.tsx`).
- **Team-Ansicht (Karten mit Mitarbeiterliste)**: `client/src/components/TeamManagement.tsx` (Cards in `ColoredEntityCard`).
- **Touren-Ansicht (Karten mit Mitarbeiterliste)**: `client/src/components/TourManagement.tsx` (Cards in `ColoredEntityCard`).
- **Team-Edit-Dialog**: `client/src/components/ui/team-edit-dialog.tsx`, nutzt `EmployeeSelectEntityEditDialog`.
- **Tour-Edit-Dialog**: `client/src/components/ui/tour-edit-dialog.tsx`, nutzt `EmployeeSelectEntityEditDialog`.

## Ist-Zustand (5–10 Sätze)

In den Team- und Tour-Ansichten werden die Mitarbeiter innerhalb der Karten als einfache Textzeilen mit Icon (`UserCheck`) angezeigt. Pro Zeile gibt es einen „X“-Button, der beim Hover erscheint und den Mitarbeiter entfernt. Die Entfernung wird direkt aus den Karten heraus ausgelöst, indem die Remove-Mutation im Management-View aufgerufen wird. In den Edit-Dialogen für Teams und Touren erfolgt die Mitarbeiterwahl über eine Checkboxliste innerhalb des `EmployeeSelectEntityEditDialog`. Diese Liste ist visuell als einfache Scroll-Liste umgesetzt und nutzt `Checkbox` mit Zeilen-Click. Die Auswahl toggelt lokal im Dialogzustand und wird beim Speichern als `employeeIds` an den bestehenden Submit-Handler übergeben. Ein Modal für die Mitarbeiterauswahl existiert bisher nicht; die Auswahl erfolgt inline im Dialog-Layout. Der Dialogmechanismus im Projekt basiert auf `Dialog` aus `client/src/components/ui/dialog.tsx`, wird aber in den Team/Tour-Dialogen über `ColorSelectEntityEditDialog` gekapselt. Insgesamt ist die Darstellung der Mitarbeiter in der Kartenansicht und die Auswahl im Dialog heute jeweils individuell gelöst.
