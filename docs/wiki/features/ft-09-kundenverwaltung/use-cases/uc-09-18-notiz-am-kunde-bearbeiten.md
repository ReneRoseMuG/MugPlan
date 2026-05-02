# UC 09/18: Notiz am Kunde bearbeiten

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Titel oder Inhalt einer bestehenden Notiz Ã¤ndern, um Informationen zu aktualisieren oder zu korrigieren.

## Vorbedingungen

- Der Kunde existiert.
- Dem Kunden ist mindestens eine Notiz zugeordnet.
- Der Akteur besitzt Ã„nderungsrechte.

## Ablauf

1. Der Akteur Ã¶ffnet einen bestehenden Kunden im Kundenformular.
2. Der Akteur navigiert zum Bereich â€žNotizen".
3. Der Akteur wÃ¤hlt eine Notiz und klickt auf â€žBearbeiten" oder doppelklickt die Notiz.
4. Das System Ã¶ffnet die Notiz im Bearbeitungsmodus.
5. Der Akteur Ã¤ndert Titel und/oder Inhalt.
6. Der Akteur speichert die Ã„nderungen.
7. Das System prÃ¼ft, dass Titel und Inhalt noch vorhanden sind.
8. Das System speichert die Ã„nderungen.
9. Das System aktualisiert die Anzeige der Notiz in der Notizenliste.

## Alternativen

- Titel oder Inhalt wird gelÃ¶scht: Das System blockiert das Speichern.
- Abbruch: Der Akteur bricht ab. Die Notiz bleibt unverÃ¤ndert.

## Ergebnis

Die Notiz ist mit den geÃ¤nderten Daten gespeichert. Die aktualisierte Notiz wird in der Notizenliste des Kunden angezeigt.

