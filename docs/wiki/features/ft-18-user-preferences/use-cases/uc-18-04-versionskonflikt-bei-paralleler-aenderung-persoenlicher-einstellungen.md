# UC 18/04: Versionskonflikt bei paralleler Ã„nderung persÃ¶nlicher Einstellungen

## Metadaten

- Feature: [FT (18): User Preferences](../ft-18-user-preferences.md)
- Notion-Quelle: https://app.notion.com/p/d9f4fc001e9e42cd94d6e49e6f297eb2
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Leser, Admin

## Ziel

Sicherstellen, dass parallele Ã„nderungen persÃ¶nlicher Einstellungen desselben Akteurs nicht zu stillen Ãœberschreibungen fÃ¼hren.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- FÃ¼r den Akteur existieren gespeicherte persÃ¶nliche Einstellungen.
- Die Einstellungen besitzen eine gÃ¼ltige Versionskennung.

## Ablauf

1. Der Akteur Ã¶ffnet in Browser A den Bereich fÃ¼r persÃ¶nliche Einstellungen.
2. Das System Ã¼bermittelt die aktuelle Versionskennung der Einstellungen.
3. Der Akteur Ã¶ffnet in Browser B ebenfalls den Bereich fÃ¼r persÃ¶nliche Einstellungen.
4. Browser A speichert eine Ã„nderung der Einstellungen.
5. Das System erhÃ¶ht die Versionskennung nach erfolgreicher Speicherung.
6. Browser B speichert eine Ã„nderung auf Basis der veralteten Versionskennung.
7. Das System erkennt die veraltete Versionskennung.
8. Das System blockiert die Speicherung mit einem Konfliktstatus.
9. Das System fordert den Akteur auf, den aktuellen Stand neu zu laden.

## Alternativen

- Der Akteur lÃ¤dt den aktuellen Stand und speichert erneut â†’ Die Speicherung erfolgt erfolgreich auf Basis der aktuellen Versionskennung.
- Der Akteur bricht ab â†’ Der zuletzt erfolgreich gespeicherte Stand bleibt unverÃ¤ndert.

## Ergebnis

Es entstehen keine Lost Updates. Die persÃ¶nlichen Einstellungen entsprechen stets dem zuletzt erfolgreich gespeicherten Zustand des Akteurs.

