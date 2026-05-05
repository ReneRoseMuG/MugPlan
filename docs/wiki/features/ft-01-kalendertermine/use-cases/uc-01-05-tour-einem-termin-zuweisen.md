# UC 01/05: Tour einem Termin zuweisen

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)

## Akteur

Disponent, Administrator

## Ziel

Einen bestehenden Termin einer Tour zuweisen, sodass der Termin mit der Tour verknüpft wird und die Tourfarbe für die Darstellung genutzt werden kann.

## Vorbedingungen

- Der Termin existiert.
- Der Termin ist einem Kunden zugeordnet.
- Optional: Der Termin ist einem Projekt zugeordnet.
- Die Tour existiert.
- Optional: Der Termin hat bereits manuell zugeordnete Mitarbeiter oder bereits eine Tourzuordnung.

## Ablauf

1. Der Akteur öffnet den Termin im Terminformular.
2. Der Akteur weist dem Termin eine Tour zu oder ändert eine bereits verknüpfte Tour.
3. Das System verknüpft den Termin mit der ausgewählten Tour. Wenn für die Kalenderwoche des Terminstartdatums in der Tour eine Wochenplanung hinterlegt ist, zeigt das System sofort einen Vorschau-Dialog mit den geplanten Mitarbeitern und möglichen Konflikten. Nach Bestätigung werden die ausgewählten Mitarbeiter in die Mitarbeiterliste übernommen. Bei Abbruch bleibt die Tour-Auswahl gesetzt, die Mitarbeiterliste bleibt unverändert.
4. Das System speichert den Termin.
5. Das System aktualisiert die Darstellung in den relevanten Sichten.
    1. Der Termin wird im Kalender mit der Tourfarbe dargestellt.
    2. Der Termin ist in der Tour-Sicht auffindbar, sofern diese eine Terminliste anbietet.

## Alternativen

- Abbruch: Der Akteur bricht den Vorgang ab. Es werden keine Änderungen gespeichert.

## Ergebnis

Der Termin ist mit der Tour verknüpft. Wenn eine Wochenplanung für die betreffende KW vorhanden war, wurden die bestätigten Mitarbeiter hinzugefügt. Andernfalls bleibt die Mitarbeiterliste unverändert. Der Termin ist im Kalender sichtbar und wird mit der Tourfarbe dargestellt. Der Termin ist in der Tour-Terminliste sichtbar, sofern eine Tour-Terminliste existiert.
