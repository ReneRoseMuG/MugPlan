# UC 16/07: Versionskonflikt bei paralleler Bearbeitung eines Hilfetextes

## Metadaten

- Feature: [FT (16): Hilfetexte verwalten](../feature.md)
- Notion-Quelle: https://app.notion.com/p/a8c06986b3a641d4b4d30723de4b4315
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Admin

## Ziel

Sicherstellen, dass parallele Änderungen an einem Hilfetext nicht zu stillen Überschreibungen führen.

## Vorbedingungen

- Der Hilfetext existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Admin-Rechte.
- Der Hilfetext besitzt eine gültige Versionskennung.

## Ablauf

1. Der Akteur öffnet einen bestehenden Hilfetext zur Bearbeitung.
2. Das System übermittelt die aktuelle Versionskennung des Hilfetextes.
3. Ein zweiter Akteur speichert zwischenzeitlich eine Änderung desselben Hilfetextes.
4. Das System erhöht die Versionskennung nach erfolgreicher Speicherung.
5. Der erste Akteur speichert auf Basis der veralteten Versionskennung.
6. Das System erkennt die veraltete Versionskennung.
7. Das System blockiert die Speicherung mit einem Konfliktstatus.
8. Das System fordert den Akteur auf, den aktuellen Stand neu zu laden.

## Alternativen

- Der Akteur lädt den aktuellen Stand und speichert erneut → Die Speicherung erfolgt erfolgreich auf Basis der aktuellen Versionskennung.
- Der Akteur bricht ab → Der zuletzt erfolgreich gespeicherte Stand bleibt unverändert.

## Ergebnis

Es entstehen keine Lost Updates. Der Hilfetext bleibt konsistent und entspricht stets dem zuletzt erfolgreich gespeicherten Zustand.
