# UC 33/05: Einplanung mit abwesendem Mitarbeiter verhindern

## Metadaten

- Feature: [FT (33): Abwesenheiten über interne Personalplanung](../ft-33-abwesenheiten-ueber-interne-personalplanung.md)

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

- Keine Überschneidung → Zuweisung wird normal gespeichert.
- Eine neue Abwesenheit kollidiert mit bereits bestehenden regulären Terminen → der dedizierte Abwesenheits-Flow kann nach ausdrücklicher Bestätigung den betroffenen Mitarbeiter aus diesen regulären Terminen entfernen; generische Terminzuweisungen dürfen den Abwesenheitskonflikt nicht still umgehen.

## Ergebnis

Der abwesende Mitarbeiter wurde nicht dem regulären Termin zugewiesen
