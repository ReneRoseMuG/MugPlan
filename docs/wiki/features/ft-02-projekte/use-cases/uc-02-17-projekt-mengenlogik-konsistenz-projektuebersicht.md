# UC 02/17: Projekt-Mengenlogik-Konsistenz (Projektübersicht)

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent, Leser

## Ziel

Sicherstellen, dass die Projektübersicht die fachlich definierten Grundmengen korrekt und disjunkt darstellt.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt mindestens Leserechte gemäÃŸ seiner Rolle.
- Projekte sind im System vorhanden.

## Ablauf

1. Akteur öffnet die Projektübersicht.
2. System lädt standardmäÃŸig die Grundmenge „Aktuelle Projekte“ (mindestens ein Termin mit Startdatum ≥ heute).
3. System berücksichtigt ausschlieÃŸlich Projekte, die mindestens einen Termin mit Startdatum ≥ heute besitzen.
4. Akteur kann auf die Grundmenge „Ohne Termine“ umschalten.
5. System lädt ausschlieÃŸlich Projekte ohne zugeordnete Termine.
6. Filter (z. B. Titel, Status) wirken ausschlieÃŸlich innerhalb der jeweils geladenen Grundmenge.

## Alternativen

- Akteur nicht authentifiziert → HTTP 401.
- Akteur ohne Leserechte → HTTP 403.
- Projekt besitzt ausschlieÃŸlich vergangene Termine → Projekt erscheint nicht in „Aktuelle Projekte“.
- Projekt besitzt vergangene und zukünftige Termine → Projekt erscheint in „Aktuelle Projekte“.
- Projekt besitzt keine Termine → Projekt erscheint nur in „Ohne Termine“.
- Keine Projekte in der gewählten Grundmenge → System zeigt eine leere Liste.

## Ergebnis

Die Grundmengen „Aktuelle Projekte“ und „Ohne Termine“ sind disjunkt.

Filter verändern nicht die zugrunde liegende Grundmenge.

Die Projektübersicht ist fachlich konsistent und nachvollziehbar.

