# UC 05/08: Versionskonflikt bei paralleler Mitarbeiterbearbeitung

## Metadaten

- Feature: [FT (05): Mitarbeiterverwaltung](../ft-05-mitarbeiterverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/19c06c719b6a45ef9b6b5da509e5b0c5
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass bei paralleler Bearbeitung desselben Mitarbeiters keine unbeabsichtigten Datenüberschreibungen entstehen.

## Vorbedingungen

- Ein Mitarbeiter existiert.
- Zwei Akteure sind gleichzeitig angemeldet.
- Beide Akteure haben Ã„nderungsrechte.
- Der Mitarbeiterdatensatz besitzt eine Versionskennung.
- Beide Akteure öffnen denselben Mitarbeiterdatensatz.

## Ablauf

1. Akteur A öffnet die Detailansicht des Mitarbeiters.
2. Akteur B öffnet denselben Mitarbeiter.
3. System liefert beiden Akteuren denselben Versionsstand.
4. Akteur A ändert Daten und speichert.
5. System validiert die Version.
6. System persistiert die Ã„nderungen.
7. System erhöht die Versionskennung.
8. Akteur B ändert Daten auf Basis der alten Version.
9. Akteur B speichert.
10. System erkennt eine abweichende Versionskennung.
11. System blockiert den Speichervorgang.

## Alternativen

- Akteur B lädt vor dem Speichern neu →
    
    System liefert aktuellen Stand, kein Konflikt.
    
- Einer der Akteure bricht ab →
    
    Kein Konflikt.
    
- Technischer Fehler →
    
    System antwortet mit 500.

## Ergebnis

- Der zuletzt gültig gespeicherte Zustand bleibt unverändert.
- Es erfolgt keine stille Ãœberschreibung.
- Das System antwortet mit HTTP 409 Conflict.
- Die Fehlermeldung weist explizit auf einen Versionskonflikt hin.
- Der Akteur muss den Datensatz neu laden, bevor erneut gespeichert werden kann.
- Die Datenbank enthält zu keinem Zeitpunkt einen inkonsistenten Zustand.

