# UC 01/17: Notiz an Termin anlegen

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)

## Akteur

Disponent, Administrator

## Ziel

Einen neuen Termin mit einer oder mehreren Notizen dokumentieren, um Informationen, Absprachen oder spezielle Hinweise festzuhalten.

## Vorbedingungen

- Der Termin existiert.
- Der Termin ist einem Projekt zugeordnet.

## Ablauf

1. Der Akteur öffnet einen bestehenden Termin im Terminformular.
2. Der Akteur navigiert zum Bereich „Notizen".
3. Der Akteur klickt auf „+ Notiz hinzufügen".
4. Das System öffnet ein Eingabeformular oder Dialog für eine neue Notiz.
5. Der Akteur gibt einen Titel und einen Inhalt ein (beide Felder sind Pflicht).
6. Der Akteur speichert die Notiz.
7. Das System prüft, dass Titel und Inhalt vorhanden sind.
8. Das System speichert die Notiz und verknüpft sie mit dem Termin.
9. Das System aktualisiert die Notizenliste im Terminformular und zeigt die neue Notiz an.

## Alternativen

- Titel oder Inhalt fehlt: Das System blockiert das Speichern und zeigt eine Validierungsmeldung.
- Abbruch: Der Akteur bricht die Eingabe ab. Es wird keine Notiz erstellt.

## Ergebnis

Die Notiz ist dem Termin zugeordnet und in der Notizenliste sichtbar. Die Notiz bleibt beim Termin bestehen, auch wenn der Termin später bearbeitet wird.
