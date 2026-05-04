# UC 16/06: Hilfetext löschen

## Metadaten

- Feature: [FT (16): Hilfetexte verwalten](../ft-16-hilfetexte-verwalten.md)
- Notion-Quelle: https://app.notion.com/p/a8c06986b3a641d4b4d30723de4b4315
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Admin

## Ziel

Einen bestehenden Hilfetext dauerhaft aus dem System entfernen.

## Vorbedingungen

- Der Hilfetext existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Admin-Rechte.

## Ablauf

1. Der Akteur öffnet die Hilfetext-Verwaltung.
2. Der Akteur wählt einen bestehenden Hilfetext aus.
3. Der Akteur löst die Löschaktion aus.
4. Das System prüft die Berechtigung des Akteurs.
5. Das System löscht den Hilfetext persistent.
6. Das System aktualisiert die Hilfetextliste.

## Alternativen

- Der Hilfetext existiert nicht → Das System antwortet mit einem Fehlerstatus.
- Der Akteur besitzt keine Admin-Rechte → Das System blockiert mit einem Berechtigungsfehler.
- Technischer Fehler → Das System löscht nicht und liefert einen Fehlerstatus zurück.

## Ergebnis

Der Hilfetext ist nicht mehr im System vorhanden und kann über seinen help_key nicht mehr abgerufen werden.

