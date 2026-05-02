# UC 33/05: Einplanung mit abwesendem Mitarbeiter verhindern

## Metadaten

- Feature: [FT (33): Abwesenheiten über interne Personalplanung](../feature.md)
- Notion-Quelle: https://app.notion.com/p/34dda094354e81d096b0f47ea36c177e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Verhindern, dass ein abwesender Mitarbeiter regulär eingeplant wird

## Vorbedingungen

Für den Mitarbeiter existiert ein Abwesenheitstermin im betreffenden Zeitraum

## Ablauf

1. Akteur weist einen Mitarbeiter einem regulären Termin zu
2. System prüft bestehende Termine des Mitarbeiters im Zeitraum
3. System erkennt einen kollidierenden Abwesenheitstermin
4. System blockiert die Zuweisung und meldet den Konflikt

## Alternativen

Keine Überschneidung → Zuweisung wird normal gespeichert

## Ergebnis

Der abwesende Mitarbeiter wurde nicht dem regulären Termin zugewiesen
