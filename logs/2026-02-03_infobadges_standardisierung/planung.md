# Planung – InfoBadge-Überarbeitung

## Vorgehensweise
- Regeln und Architektur gelesen.
- Logging-Struktur anlegen und fortlaufend pflegen.
- Bestandsanalyse der Badge-Komponenten und Aufrufer durchführen.
- Änderungen minimal-invasiv implementieren (InfoBadge, PersonInfoBadge, CustomerInfoBadge, EmployeeInfoBadge, ProjectInfoBadge).
- Rückwärtskompatibilität für bestehende Props sicherstellen.

## Fundstellen (wird nach Analyse in Schritt 4 ergänzt)

## Annahmen
- Keine Annahmen getroffen.

## Fundstellen
- client/src/components/ui/info-badge.tsx – Basis-Komponente InfoBadge mit onRemove-Button.
- client/src/components/ui/colored-info-badge.tsx – Wrapper für InfoBadge (borderColor + Props-Weitergabe).
- client/src/components/EmployeePage.tsx – Verwendung ColoredInfoBadge für Tour/Team (fullWidth).
- client/src/components/EmployeeList.tsx – Verwendung ColoredInfoBadge für Tour/Team (size="sm").
- client/src/components/LinkedProjectCard.tsx – Verwendung ColoredInfoBadge für Projekt-Status (fullWidth, size="sm").
- client/src/components/ProjectStatusSection.tsx – Verwendung ColoredInfoBadge mit onRemove (remove-Button).
