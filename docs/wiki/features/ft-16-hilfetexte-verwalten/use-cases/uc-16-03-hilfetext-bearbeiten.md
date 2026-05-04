# UC 16/03: Hilfetext bearbeiten

## Metadaten

- Feature: [FT (16): Hilfetexte verwalten](../ft-16-hilfetexte-verwalten.md)
- Notion-Quelle: https://app.notion.com/p/a8c06986b3a641d4b4d30723de4b4315
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Admin

## Ziel

Einen bestehenden Hilfetext inhaltlich aktualisieren.

## Vorbedingungen

- Der Hilfetext existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Admin-Rechte.

## Ablauf

1. Der Akteur öffnet die Hilfetext-Verwaltung.
2. Der Akteur wählt einen bestehenden Hilfetext aus der Liste aus.
3. Das System lädt die aktuellen Daten des Hilfetextes.
4. Der Akteur ändert Titel und/oder Markdown-Inhalt.
5. Der Akteur speichert die Ã„nderungen.
6. Das System validiert die Eingaben.
7. Das System speichert die aktualisierten Daten persistent.

## Alternativen

- Der Akteur bricht den Vorgang ab → Es erfolgt keine Ã„nderung.
- Der Hilfetext existiert nicht mehr → Das System antwortet mit einem Fehlerstatus.
- Der Akteur besitzt keine Admin-Rechte → Das System blockiert mit einem Berechtigungsfehler.
- Technischer Fehler → Das System speichert nicht und liefert einen Fehlerstatus zurück.

## Ergebnis

Der Hilfetext ist aktualisiert. Bei zukünftigen Abrufen über den help_key wird die neue Version angezeigt.

