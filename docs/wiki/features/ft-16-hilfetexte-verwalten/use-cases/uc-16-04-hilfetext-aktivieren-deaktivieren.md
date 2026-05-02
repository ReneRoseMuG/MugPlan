# UC 16/04: Hilfetext aktivieren/deaktivieren

## Metadaten

- Feature: [FT (16): Hilfetexte verwalten](../ft-16-hilfetexte-verwalten.md)
- Notion-Quelle: https://app.notion.com/p/a8c06986b3a641d4b4d30723de4b4315
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Admin

## Ziel

Einen bestehenden Hilfetext aktivieren oder deaktivieren, um seine Sichtbarkeit in der UI zu steuern.

## Vorbedingungen

- Der Hilfetext existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Admin-Rechte.

## Ablauf

1. Der Akteur Ã¶ffnet die Hilfetext-Verwaltung.
2. Der Akteur wÃ¤hlt einen bestehenden Hilfetext aus.
3. Der Akteur Ã¤ndert den Status auf â€žaktivâ€œ oder â€žinaktivâ€œ.
4. Der Akteur speichert die Ã„nderung.
5. Das System persistiert den neuen Status.

## Alternativen

- Der Akteur bricht den Vorgang ab â†’ Der Status bleibt unverÃ¤ndert.
- Der Hilfetext existiert nicht mehr â†’ Das System antwortet mit einem Fehlerstatus.
- Der Akteur besitzt keine Admin-Rechte â†’ Das System blockiert mit einem Berechtigungsfehler.
- Technischer Fehler â†’ Das System speichert nicht und liefert einen Fehlerstatus zurÃ¼ck.

## Ergebnis

Der Hilfetext ist entsprechend dem gesetzten Status in der UI abrufbar oder nicht abrufbar. Bestehende fachliche Daten bleiben unverÃ¤ndert.

