# UC 02/11: Projektlöschung wird systemweit korrekt verarbeitet

## Metadaten

- Feature: [FT (02): Projekte](../feature.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass die Löschung eines Projekts keine inkonsistenten Referenzen hinterlässt.

## Vorbedingungen

- Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Löschrechte (Disponent oder Administrator).
- Dem Projekt sind keine Termine zugeordnet.

## Ablauf

1. Akteur löscht ein Projekt gemäß UC 02/08.
2. System entfernt das Projekt und alle abhängigen Datensätze in einer Transaktion.
3. System aktualisiert Projektübersichten.
4. Offene Detailansichten schließen sich oder wechseln in einen neutralen Zustand.

## Alternativen

- Akteur nicht authentifiziert → HTTP 401.
- Akteur ohne Löschrechte → HTTP 403.
- Projekt besitzt Termine → HTTP 409 BUSINESS_CONFLICT, Löschung wird blockiert, keine Ansicht ändert sich.
- Technischer Fehler → HTTP 500, kein Teilzustand.

## Ergebnis

Es existieren keine Referenzen auf das gelöschte Projekt.

Alle Sichten sind konsistent.
