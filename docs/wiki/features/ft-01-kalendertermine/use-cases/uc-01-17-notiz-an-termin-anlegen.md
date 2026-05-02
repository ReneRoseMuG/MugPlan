# UC 01/17: Notiz an Termin anlegen

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Einen neuen Termin mit einer oder mehreren Notizen dokumentieren, um Informationen, Absprachen oder spezielle Hinweise festzuhalten.

## Vorbedingungen

- Der Termin existiert.
- Der Termin ist einem Projekt zugeordnet.

## Ablauf

1. Der Akteur Ã¶ffnet einen bestehenden Termin im Terminformular.
2. Der Akteur navigiert zum Bereich â€žNotizen".
3. Der Akteur klickt auf â€ž+ Notiz hinzufÃ¼gen".
4. Das System Ã¶ffnet ein Eingabeformular oder Dialog fÃ¼r eine neue Notiz.
5. Der Akteur gibt einen Titel und einen Inhalt ein (beide Felder sind Pflicht).
6. Der Akteur speichert die Notiz.
7. Das System prÃ¼ft, dass Titel und Inhalt vorhanden sind.
8. Das System speichert die Notiz und verknÃ¼pft sie mit dem Termin.
9. Das System aktualisiert die Notizenliste im Terminformular und zeigt die neue Notiz an.

## Alternativen

- Titel oder Inhalt fehlt: Das System blockiert das Speichern und zeigt eine Validierungsmeldung.
- Abbruch: Der Akteur bricht die Eingabe ab. Es wird keine Notiz erstellt.

## Ergebnis

Die Notiz ist dem Termin zugeordnet und in der Notizenliste sichtbar. Die Notiz bleibt beim Termin bestehen, auch wenn der Termin spÃ¤ter bearbeitet wird.

