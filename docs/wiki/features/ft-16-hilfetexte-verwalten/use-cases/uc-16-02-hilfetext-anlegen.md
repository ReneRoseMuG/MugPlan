# UC 16/02: Hilfetext anlegen

## Metadaten

- Feature: [FT (16): Hilfetexte verwalten](../ft-16-hilfetexte-verwalten.md)
- Notion-Quelle: https://app.notion.com/p/a8c06986b3a641d4b4d30723de4b4315
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Nicht angegeben in der Notion-Quelle.

## Ziel

Einen neuen Hilfetext erstellen, um einen UI-Kontext erklÃ¤rbar zu machen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt Admin-Rechte.
- Der gewÃ¼nschte help_key ist noch nicht vergeben.

## Ablauf

1. Der Akteur Ã¶ffnet die Hilfetext-Verwaltung.
2. Der Akteur wÃ¤hlt die Funktion â€žHilfetext anlegenâ€œ.
3. Der Akteur erfasst help_key, Titel und Markdown-Inhalt.
4. Der Akteur legt fest, ob der Hilfetext aktiv ist.
5. Der Akteur speichert den Datensatz.
6. Das System validiert Pflichtfelder und Datentypen.
7. Das System prÃ¼ft serverseitig die Eindeutigkeit des help_key.
8. Bei erfolgreicher Validierung speichert das System den Hilfetext persistent.

## Alternativen

- Pflichtfeld fehlt â†’ Das System lehnt die Speicherung mit Validierungsfehler ab.
- help_key existiert bereits â†’ Das System blockiert die Speicherung und fordert zur Korrektur auf.
- Der Akteur besitzt keine Admin-Rechte â†’ Das System blockiert mit einem Berechtigungsfehler.
- Technischer Fehler â†’ Das System speichert nicht und liefert einen Fehlerstatus zurÃ¼ck.

## Ergebnis

Ein neuer Hilfetext ist persistent gespeichert und Ã¼ber seinen help_key referenzierbar. Der Hilfetext ist je nach gesetztem Status in der UI abrufbar oder nicht abrufbar.

