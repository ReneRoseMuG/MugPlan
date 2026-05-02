# UC 02/17: Projekt-Mengenlogik-Konsistenz (ProjektÃ¼bersicht)

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator, Disponent, Leser

## Ziel

Sicherstellen, dass die ProjektÃ¼bersicht die fachlich definierten Grundmengen korrekt und disjunkt darstellt.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt mindestens Leserechte gemÃ¤ÃŸ seiner Rolle.
- Projekte sind im System vorhanden.

## Ablauf

1. Akteur Ã¶ffnet die ProjektÃ¼bersicht.
2. System lÃ¤dt standardmÃ¤ÃŸig die Grundmenge â€žAktuelle Projekteâ€œ (mindestens ein Termin mit Startdatum â‰¥ heute).
3. System berÃ¼cksichtigt ausschlieÃŸlich Projekte, die mindestens einen Termin mit Startdatum â‰¥ heute besitzen.
4. Akteur kann auf die Grundmenge â€žOhne Termineâ€œ umschalten.
5. System lÃ¤dt ausschlieÃŸlich Projekte ohne zugeordnete Termine.
6. Filter (z. B. Titel, Status) wirken ausschlieÃŸlich innerhalb der jeweils geladenen Grundmenge.

## Alternativen

- Akteur nicht authentifiziert â†’ HTTP 401.
- Akteur ohne Leserechte â†’ HTTP 403.
- Projekt besitzt ausschlieÃŸlich vergangene Termine â†’ Projekt erscheint nicht in â€žAktuelle Projekteâ€œ.
- Projekt besitzt vergangene und zukÃ¼nftige Termine â†’ Projekt erscheint in â€žAktuelle Projekteâ€œ.
- Projekt besitzt keine Termine â†’ Projekt erscheint nur in â€žOhne Termineâ€œ.
- Keine Projekte in der gewÃ¤hlten Grundmenge â†’ System zeigt eine leere Liste.

## Ergebnis

Die Grundmengen â€žAktuelle Projekteâ€œ und â€žOhne Termineâ€œ sind disjunkt.

Filter verÃ¤ndern nicht die zugrunde liegende Grundmenge.

Die ProjektÃ¼bersicht ist fachlich konsistent und nachvollziehbar.

