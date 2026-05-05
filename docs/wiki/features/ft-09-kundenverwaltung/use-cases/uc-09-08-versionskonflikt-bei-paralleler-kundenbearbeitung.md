# UC 09/08: Versionskonflikt bei paralleler Kundenbearbeitung

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass bei paralleler Bearbeitung desselben Kunden keine stillen Datenüberschreibungen (Lost Updates) entstehen.

## Vorbedingungen

- Ein Kunde existiert.
- Zwei Akteure sind gleichzeitig authentifiziert.
- Beide Akteure haben Bearbeitungsrechte.
- Beide Akteure laden denselben Kunden mit identischer Versionskennung.

## Ablauf

1. Akteur A öffnet die Kundendetailansicht.
2. Akteur B öffnet dieselbe Kundendetailansicht.
3. Beide erhalten denselben Versionsstand (z. B. `version = 5`).
4. Akteur A ändert Kundendaten und speichert.
5. Das System prüft die Versionskennung.
6. Das System persistiert die Änderung.
7. Das System erhöht die Versionskennung auf `version = 6`.
8. Akteur B speichert nun seine Änderungen mit veralteter Versionskennung (`version = 5`).
9. Das System prüft die Versionskennung.
10. Das System erkennt die Abweichung.
11. Das System blockiert den Speichervorgang mit 409 (Konflikt).
12. Das System fordert Akteur B zum Neuladen auf.

## Alternativen

- Akteur B lädt vor dem Speichern neu → kein Konflikt.
- Akteur B bricht ab → keine Änderung.
- Technischer Fehler → System antwortet mit 500.

## Ergebnis

- Es kommt zu keinem stillen Überschreiben von Kundendaten.
- Der zuletzt gespeicherte, valide Stand bleibt erhalten.
- Das System garantiert Optimistic Locking für Kundenänderungen.
