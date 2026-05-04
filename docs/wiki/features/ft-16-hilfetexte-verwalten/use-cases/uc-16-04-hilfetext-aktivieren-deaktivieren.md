# UC 16/04: Hilfetext aktivieren/deaktivieren

## Metadaten

- Feature: [FT (16): Hilfetexte verwalten](../ft-16-hilfetexte-verwalten.md)
- Notion-Quelle: https://app.notion.com/p/a8c06986b3a641d4b4d30723de4b4315
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Admin

## Ziel

Einen bestehenden Hilfetext aktivieren oder deaktivieren, um seine Sichtbarkeit in der UI zu steuern.

## Vorbedingungen

- Der Hilfetext existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Admin-Rechte.

## Ablauf

1. Der Akteur öffnet die Hilfetext-Verwaltung.
2. Der Akteur wählt einen bestehenden Hilfetext aus.
3. Der Akteur ändert den Status auf „aktiv“ oder „inaktiv“.
4. Der Akteur speichert die Ã„nderung.
5. Das System persistiert den neuen Status.

## Alternativen

- Der Akteur bricht den Vorgang ab → Der Status bleibt unverändert.
- Der Hilfetext existiert nicht mehr → Das System antwortet mit einem Fehlerstatus.
- Der Akteur besitzt keine Admin-Rechte → Das System blockiert mit einem Berechtigungsfehler.
- Technischer Fehler → Das System speichert nicht und liefert einen Fehlerstatus zurück.

## Ergebnis

Der Hilfetext ist entsprechend dem gesetzten Status in der UI abrufbar oder nicht abrufbar. Bestehende fachliche Daten bleiben unverändert.

