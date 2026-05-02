# UC 16/06: Hilfetext lÃ¶schen

## Metadaten

- Feature: [FT (16): Hilfetexte verwalten](../ft-16-hilfetexte-verwalten.md)
- Notion-Quelle: https://app.notion.com/p/a8c06986b3a641d4b4d30723de4b4315
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Admin

## Ziel

Einen bestehenden Hilfetext dauerhaft aus dem System entfernen.

## Vorbedingungen

- Der Hilfetext existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Admin-Rechte.

## Ablauf

1. Der Akteur Ã¶ffnet die Hilfetext-Verwaltung.
2. Der Akteur wÃ¤hlt einen bestehenden Hilfetext aus.
3. Der Akteur lÃ¶st die LÃ¶schaktion aus.
4. Das System prÃ¼ft die Berechtigung des Akteurs.
5. Das System lÃ¶scht den Hilfetext persistent.
6. Das System aktualisiert die Hilfetextliste.

## Alternativen

- Der Hilfetext existiert nicht â†’ Das System antwortet mit einem Fehlerstatus.
- Der Akteur besitzt keine Admin-Rechte â†’ Das System blockiert mit einem Berechtigungsfehler.
- Technischer Fehler â†’ Das System lÃ¶scht nicht und liefert einen Fehlerstatus zurÃ¼ck.

## Ergebnis

Der Hilfetext ist nicht mehr im System vorhanden und kann Ã¼ber seinen help_key nicht mehr abgerufen werden.

