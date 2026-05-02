# UC 01/05: Tour einem Termin zuweisen

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Einen bestehenden Termin einer Tour zuweisen, sodass der Termin mit der Tour verknÃ¼pft wird und die Tourfarbe fÃ¼r die Darstellung genutzt werden kann.

## Vorbedingungen

- Der Termin existiert.
- Der Termin ist einem Kunden zugeordnet.
- Optional: Der Termin ist einem Projekt zugeordnet.
- Die Tour existiert.
- Optional: Der Termin hat bereits manuell zugeordnete Mitarbeiter oder bereits eine Tourzuordnung.

## Ablauf

1. Der Akteur Ã¶ffnet den Termin im Terminformular.
2. Der Akteur weist dem Termin eine Tour zu oder Ã¤ndert eine bereits verknÃ¼pfte Tour.
3. Das System verknÃ¼pft den Termin mit der ausgewÃ¤hlten Tour. Wenn fÃ¼r die Kalenderwoche des Terminstartdatums in der Tour eine Wochenplanung hinterlegt ist, zeigt das System sofort einen Vorschau-Dialog mit den geplanten Mitarbeitern und mÃ¶glichen Konflikten. Nach BestÃ¤tigung werden die ausgewÃ¤hlten Mitarbeiter in die Mitarbeiterliste Ã¼bernommen. Bei Abbruch bleibt die Tour-Auswahl gesetzt, die Mitarbeiterliste bleibt unverÃ¤ndert.
4. Das System speichert den Termin.
5. Das System aktualisiert die Darstellung in den relevanten Sichten.
    1. Der Termin wird im Kalender mit der Tourfarbe dargestellt.
    2. Der Termin ist in der Tour-Sicht auffindbar, sofern diese eine Terminliste anbietet.

## Alternativen

- Abbruch: Der Akteur bricht den Vorgang ab. Es werden keine Ã„nderungen gespeichert.

## Ergebnis

Der Termin ist mit der Tour verknÃ¼pft. Wenn eine Wochenplanung fÃ¼r die betreffende KW vorhanden war, wurden die bestÃ¤tigten Mitarbeiter hinzugefÃ¼gt. Andernfalls bleibt die Mitarbeiterliste unverÃ¤ndert. Der Termin ist im Kalender sichtbar und wird mit der Tourfarbe dargestellt. Der Termin ist in der Tour-Terminliste sichtbar, sofern eine Tour-Terminliste existiert.

