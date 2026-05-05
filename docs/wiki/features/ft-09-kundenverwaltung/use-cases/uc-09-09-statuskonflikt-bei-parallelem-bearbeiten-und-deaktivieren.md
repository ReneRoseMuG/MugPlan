# UC 09/09: Statuskonflikt bei parallelem Bearbeiten und Deaktivieren

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass eine Kundenbearbeitung nicht erfolgreich gespeichert werden kann, wenn der Kunde zwischenzeitlich deaktiviert wurde.

## Vorbedingungen

- Ein Kunde existiert und ist aktiv (`is_active = true`).
- Zwei Akteure sind gleichzeitig authentifiziert.
- Akteur A besitzt Bearbeitungsrechte (Disponent oder Administrator).
- Akteur B besitzt Administratorrechte.
- Beide Akteure laden denselben Kunden mit identischer Versionskennung.

## Ablauf

1. Akteur A öffnet die Kundendetailansicht und beginnt mit der Bearbeitung.
2. Akteur B öffnet denselben Kunden.
3. Akteur B löst „Deaktivieren“ aus.
4. Das System prüft Berechtigung und Versionskennung.
5. Das System setzt `is_active = false`, persistiert die Änderung und erhöht die Versionskennung.
6. Akteur A speichert nun seine Änderungen mit veralteter Versionskennung.
7. Das System prüft:
    - Versionskennung,
    - aktuellen Status (`is_active`).
8. Das System erkennt den Konflikt.
9. Das System blockiert den Speichervorgang mit 409.
10. Das System fordert Akteur A zum Neuladen auf.

## Alternativen

- Akteur A lädt vor dem Speichern neu → das System zeigt den Kunden als deaktiviert an; Bearbeitung ist nur eingeschränkt möglich oder blockiert.
- Akteur B bricht die Deaktivierung ab → kein Konflikt.
- Technischer Fehler → System antwortet mit 500.

## Ergebnis

- Ein deaktivierter Kunde kann nicht unbemerkt durch parallele Bearbeitung wieder verändert werden.
- Es entstehen keine inkonsistenten Zustände zwischen Aktiv-Status und Stammdaten.
- Optimistic Locking wird auch bei Statusänderungen konsequent durchgesetzt.
