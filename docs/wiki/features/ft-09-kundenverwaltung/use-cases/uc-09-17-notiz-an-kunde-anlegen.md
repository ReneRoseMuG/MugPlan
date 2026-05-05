# UC 09/17: Notiz an Kunde anlegen

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)

## Akteur

Disponent, Administrator

## Ziel

Einen bestehenden Kunden mit einer oder mehreren Notizen dokumentieren, um kundenbezogene Informationen, Absprachen oder Hinweise festzuhalten.

## Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Änderungsrechte.

## Ablauf

1. Der Akteur öffnet einen bestehenden Kunden im Kundenformular.
2. Der Akteur navigiert zum Bereich „Notizen".
3. Der Akteur klickt auf „+ Notiz hinzufügen".
4. Das System öffnet ein Eingabeformular oder Dialog für eine neue Notiz.
5. Der Akteur gibt einen Titel und einen Inhalt ein (beide Felder sind Pflicht).
6. Der Akteur speichert die Notiz.
7. Das System prüft, dass Titel und Inhalt vorhanden sind.
8. Das System speichert die Notiz und verknüpft sie mit dem Kunden.
9. Das System aktualisiert die Notizenliste im Kundenformular und zeigt die neue Notiz an.

## Alternativen

- Titel oder Inhalt fehlt: Das System blockiert das Speichern und zeigt eine Validierungsmeldung.
- Abbruch: Der Akteur bricht die Eingabe ab. Es wird keine Notiz erstellt.

## Ergebnis

Die Notiz ist dem Kunden zugeordnet und in der Notizenliste sichtbar. Die Notiz bleibt beim Kunden bestehen, auch wenn der Kunde später bearbeitet, sein Status geändert oder mit Anhängen ergänzt wird.
