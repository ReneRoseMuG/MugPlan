# UC 02/09: Projektänderung wird in Terminansichten konsistent dargestellt

## Metadaten

- Feature: [FT (02): Projekte](../feature.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass Änderungen an Projektdaten in allen Terminansichten korrekt angezeigt werden.

## Vorbedingungen

- Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Änderungsrechte (Disponent oder Administrator).
- Dem Projekt sind mindestens ein oder mehrere Termine zugeordnet.
- Eine Terminansicht (Kalender oder Tabelle) ist geöffnet.

## Ablauf

1. Akteur ändert Projektdaten (z. B. Titel, Kunde oder Beschreibung) gemäß UC 02/02.
2. System speichert die Änderung.
3. System invalidiert betroffene Ansichten.
4. Offene Terminansichten aktualisieren die referenzierten Projektdaten beim nächsten Laden.

## Alternativen

- Akteur nicht authentifiziert → HTTP 401.
- Akteur ohne Änderungsrechte → HTTP 403.
- Keine Terminansicht geöffnet → Aktualisierung erfolgt beim nächsten Laden.
- Projekt ohne Termine → Keine Terminansicht betroffen.

## Ergebnis

Alle Terminansichten zeigen konsistente und aktuelle Projektdaten.

Es existieren keine veralteten Projektreferenzen in Termin-Karten.
