# Planung – Projektstatus-Badges & Modal-Auswahl

## Fundstellen
- `client/src/components/ProjectForm.tsx` – Einbindung des Projektstatus-Abschnitts im Projektformular.
- `client/src/components/ProjectStatusSection.tsx` – Anzeige der Status-Badges und bisheriger Dialog für Auswahl.
- `client/src/components/ProjectStatusList.tsx` – CardList-Komponente für Projektstatus (inkl. Picker-Mode).
- `client/src/components/ui/project-status-picker-dialog.tsx` – Dialog-Pattern für Status-Auswahl über CardList.
- `client/src/components/ui/info-badge.tsx` / `client/src/components/ui/colored-info-badge.tsx` – Badge-UI inkl. Remove-Modus.

## Aktueller Interaktionsfluss (Ist-Zustand)
Im Projektformular rendert `ProjectStatusSection` die zugewiesenen Status als `ColoredInfoBadge` und öffnet per "+"-Button einen lokalen Dialog. Dort wird eine eigene Liste mit Checkboxen gerendert; die Auswahl wird gesammelt und per "Hinzufügen" bestätigt, wodurch `onAdd` für jedes ausgewählte Element aufgerufen wird. Die Badges verwenden aktuell `onRemove`, wodurch in `InfoBadge` das Legacy-"X" erscheint. Der Dialog schließt nach dem Speichern und die Badges aktualisieren sich entsprechend.

## Vorgehen
1. `ProjectStatusSection` so anpassen, dass Status-Badges explizit den Remove-Modus ("-") nutzen.
2. Den lokalen Checkbox-Dialog ersetzen durch ein Modal mit der bestehenden Project Status CardList im Picker-Mode.
3. Auswahlfluss: Klick auf "+" öffnet Modal, Auswahl ruft `onAdd` auf und schließt den Modal; Abbrechen schließt ohne Auswahl.
4. Risiken/weitere Stellen mit Legacy-"X" dokumentieren.
5. Manuelle Prüfsequenz in `umsetzungs-log.md` festhalten.
