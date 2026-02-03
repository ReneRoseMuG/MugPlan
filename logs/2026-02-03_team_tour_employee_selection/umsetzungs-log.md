# Umsetzungs-Log

- Initiale Log-Struktur angelegt.
- Inventur der bestehenden Badge-/Dialog-/Team-/Tour-Komponenten in planung.md dokumentiert.
- Team- und Tour-Karten auf read-only EmployeeInfoBadge-Darstellung umgestellt; interaktive Remove-Buttons entfernt.
- EmployeeSelectEntityEditDialog auf Badge-Darstellung mit Minus-Button umgestellt und Auswahl-Modal mit Employee CardList (Picker) ergänzt.

## Manuelle Prüfschritte
- Teams-Ansicht öffnen und prüfen, dass zugewiesene Mitarbeiter als read-only EmployeeInfoBadge ohne Aktionen angezeigt werden.
- Touren-Ansicht öffnen und prüfen, dass zugewiesene Mitarbeiter als read-only EmployeeInfoBadge ohne Aktionen angezeigt werden.
- Team-Edit-Dialog öffnen, auf „Hinzufügen“ klicken, Modal öffnet sich, Mitarbeiter auswählen, Modal schließt, Badge erscheint mit Minus-Button.
- Im Team-Edit-Dialog auf Minus-Button klicken, Mitarbeiter wird aus der Liste entfernt.
- Tour-Edit-Dialog öffnen, auf „Hinzufügen“ klicken, Modal öffnet sich, Mitarbeiter auswählen, Modal schließt, Badge erscheint mit Minus-Button.
- Im Tour-Edit-Dialog auf Minus-Button klicken, Mitarbeiter wird aus der Liste entfernt.

## TypeScript-Check
- Nicht ausgeführt (kein Check im Auftrag gestartet).
