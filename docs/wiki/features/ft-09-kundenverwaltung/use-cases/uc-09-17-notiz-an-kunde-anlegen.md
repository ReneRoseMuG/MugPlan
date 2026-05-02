# UC 09/17: Notiz an Kunde anlegen

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Einen bestehenden Kunden mit einer oder mehreren Notizen dokumentieren, um kundenbezogene Informationen, Absprachen oder Hinweise festzuhalten.

## Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Ã„nderungsrechte.

## Ablauf

1. Der Akteur Ã¶ffnet einen bestehenden Kunden im Kundenformular.
2. Der Akteur navigiert zum Bereich â€žNotizen".
3. Der Akteur klickt auf â€ž+ Notiz hinzufÃ¼gen".
4. Das System Ã¶ffnet ein Eingabeformular oder Dialog fÃ¼r eine neue Notiz.
5. Der Akteur gibt einen Titel und einen Inhalt ein (beide Felder sind Pflicht).
6. Der Akteur speichert die Notiz.
7. Das System prÃ¼ft, dass Titel und Inhalt vorhanden sind.
8. Das System speichert die Notiz und verknÃ¼pft sie mit dem Kunden.
9. Das System aktualisiert die Notizenliste im Kundenformular und zeigt die neue Notiz an.

## Alternativen

- Titel oder Inhalt fehlt: Das System blockiert das Speichern und zeigt eine Validierungsmeldung.
- Abbruch: Der Akteur bricht die Eingabe ab. Es wird keine Notiz erstellt.

## Ergebnis

Die Notiz ist dem Kunden zugeordnet und in der Notizenliste sichtbar. Die Notiz bleibt beim Kunden bestehen, auch wenn der Kunde spÃ¤ter bearbeitet, sein Status geÃ¤ndert oder mit AnhÃ¤ngen ergÃ¤nzt wird.

