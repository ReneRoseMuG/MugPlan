# UC 16/07: Versionskonflikt bei paralleler Bearbeitung eines Hilfetextes

## Metadaten

- Feature: [FT (16): Hilfetexte verwalten](../ft-16-hilfetexte-verwalten.md)
- Notion-Quelle: https://app.notion.com/p/a8c06986b3a641d4b4d30723de4b4315
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Admin

## Ziel

Sicherstellen, dass parallele Ã„nderungen an einem Hilfetext nicht zu stillen Ãœberschreibungen fÃ¼hren.

## Vorbedingungen

- Der Hilfetext existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Admin-Rechte.
- Der Hilfetext besitzt eine gÃ¼ltige Versionskennung.

## Ablauf

1. Der Akteur Ã¶ffnet einen bestehenden Hilfetext zur Bearbeitung.
2. Das System Ã¼bermittelt die aktuelle Versionskennung des Hilfetextes.
3. Ein zweiter Akteur speichert zwischenzeitlich eine Ã„nderung desselben Hilfetextes.
4. Das System erhÃ¶ht die Versionskennung nach erfolgreicher Speicherung.
5. Der erste Akteur speichert auf Basis der veralteten Versionskennung.
6. Das System erkennt die veraltete Versionskennung.
7. Das System blockiert die Speicherung mit einem Konfliktstatus.
8. Das System fordert den Akteur auf, den aktuellen Stand neu zu laden.

## Alternativen

- Der Akteur lÃ¤dt den aktuellen Stand und speichert erneut â†’ Die Speicherung erfolgt erfolgreich auf Basis der aktuellen Versionskennung.
- Der Akteur bricht ab â†’ Der zuletzt erfolgreich gespeicherte Stand bleibt unverÃ¤ndert.

## Ergebnis

Es entstehen keine Lost Updates. Der Hilfetext bleibt konsistent und entspricht stets dem zuletzt erfolgreich gespeicherten Zustand.

