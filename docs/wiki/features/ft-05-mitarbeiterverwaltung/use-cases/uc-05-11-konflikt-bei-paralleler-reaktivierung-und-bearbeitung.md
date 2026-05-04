# UC 05/11: Konflikt bei paralleler Reaktivierung und Bearbeitung

## Metadaten

- Feature: [FT (05): Mitarbeiterverwaltung](../ft-05-mitarbeiterverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/19c06c719b6a45ef9b6b5da509e5b0c5
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent

## Ziel

Verhindern, dass bei gleichzeitiger Reaktivierung und Bearbeitung widersprüchliche Zustände entstehen.

## Vorbedingungen

- Ein Mitarbeiter existiert und ist deaktiviert.
- Zwei Akteure sind angemeldet.
- Der Datensatz besitzt eine Versionskennung.

## Ablauf

1. Akteur A öffnet den deaktivierten Mitarbeiter.
2. Akteur B öffnet denselben Mitarbeiter.
3. Akteur A reaktiviert den Mitarbeiter.
4. System setzt `is_active = true` und erhöht die Version.
5. Akteur B ändert Stammdaten auf Basis der alten Version.
6. Akteur B speichert.
7. System erkennt Versionsabweichung.
8. System blockiert den Speichervorgang.

## Alternativen

- Akteur B lädt neu →
    
    Kein Konflikt.
    
- Reaktivierung erfolgt nach erfolgreicher Bearbeitung →
    
    Kein Konflikt.

## Ergebnis

- Kein Zustand wird überschrieben.
- HTTP 409 bei Versionskonflikt.
- Der gültige Zustand bleibt erhalten.
- Keine Terminzuweisungen werden verändert.

