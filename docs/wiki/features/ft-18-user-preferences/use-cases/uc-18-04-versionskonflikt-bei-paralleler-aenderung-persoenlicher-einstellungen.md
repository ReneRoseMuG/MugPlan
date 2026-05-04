# UC 18/04: Versionskonflikt bei paralleler Ã„nderung persönlicher Einstellungen

## Metadaten

- Feature: [FT (18): User Preferences](../ft-18-user-preferences.md)
- Notion-Quelle: https://app.notion.com/p/d9f4fc001e9e42cd94d6e49e6f297eb2
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Leser, Admin

## Ziel

Sicherstellen, dass parallele Ã„nderungen persönlicher Einstellungen desselben Akteurs nicht zu stillen Ãœberschreibungen führen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Für den Akteur existieren gespeicherte persönliche Einstellungen.
- Die Einstellungen besitzen eine gültige Versionskennung.

## Ablauf

1. Der Akteur öffnet in Browser A den Bereich für persönliche Einstellungen.
2. Das System übermittelt die aktuelle Versionskennung der Einstellungen.
3. Der Akteur öffnet in Browser B ebenfalls den Bereich für persönliche Einstellungen.
4. Browser A speichert eine Ã„nderung der Einstellungen.
5. Das System erhöht die Versionskennung nach erfolgreicher Speicherung.
6. Browser B speichert eine Ã„nderung auf Basis der veralteten Versionskennung.
7. Das System erkennt die veraltete Versionskennung.
8. Das System blockiert die Speicherung mit einem Konfliktstatus.
9. Das System fordert den Akteur auf, den aktuellen Stand neu zu laden.

## Alternativen

- Der Akteur lädt den aktuellen Stand und speichert erneut → Die Speicherung erfolgt erfolgreich auf Basis der aktuellen Versionskennung.
- Der Akteur bricht ab → Der zuletzt erfolgreich gespeicherte Stand bleibt unverändert.

## Ergebnis

Es entstehen keine Lost Updates. Die persönlichen Einstellungen entsprechen stets dem zuletzt erfolgreich gespeicherten Zustand des Akteurs.

