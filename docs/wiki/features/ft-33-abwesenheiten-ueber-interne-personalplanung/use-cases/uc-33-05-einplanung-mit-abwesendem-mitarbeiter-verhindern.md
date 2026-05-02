# UC 33/05: Einplanung mit abwesendem Mitarbeiter verhindern

## Metadaten

- Feature: [FT (33): Abwesenheiten Ã¼ber interne Personalplanung](../ft-33-abwesenheiten-ueber-interne-personalplanung.md)
- Notion-Quelle: https://app.notion.com/p/34dda094354e81d096b0f47ea36c177e
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Verhindern, dass ein abwesender Mitarbeiter regulÃ¤r eingeplant wird

## Vorbedingungen

FÃ¼r den Mitarbeiter existiert ein Abwesenheitstermin im betreffenden Zeitraum

## Ablauf

1. Akteur weist einen Mitarbeiter einem regulÃ¤ren Termin zu
2. System prÃ¼ft bestehende Termine des Mitarbeiters im Zeitraum
3. System erkennt einen kollidierenden Abwesenheitstermin
4. System blockiert die Zuweisung und meldet den Konflikt

## Alternativen

Keine Ãœberschneidung â†’ Zuweisung wird normal gespeichert

## Ergebnis

Der abwesende Mitarbeiter wurde nicht dem regulÃ¤ren Termin zugewiesen

