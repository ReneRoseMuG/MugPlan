# UC 02/09: ProjektÃ¤nderung wird in Terminansichten konsistent dargestellt

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass Ã„nderungen an Projektdaten in allen Terminansichten korrekt angezeigt werden.

## Vorbedingungen

- Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Ã„nderungsrechte (Disponent oder Administrator).
- Dem Projekt sind mindestens ein oder mehrere Termine zugeordnet.
- Eine Terminansicht (Kalender oder Tabelle) ist geÃ¶ffnet.

## Ablauf

1. Akteur Ã¤ndert Projektdaten (z. B. Titel, Kunde oder Beschreibung) gemÃ¤ÃŸ UC 02/02.
2. System speichert die Ã„nderung.
3. System invalidiert betroffene Ansichten.
4. Offene Terminansichten aktualisieren die referenzierten Projektdaten beim nÃ¤chsten Laden.

## Alternativen

- Akteur nicht authentifiziert â†’ HTTP 401.
- Akteur ohne Ã„nderungsrechte â†’ HTTP 403.
- Keine Terminansicht geÃ¶ffnet â†’ Aktualisierung erfolgt beim nÃ¤chsten Laden.
- Projekt ohne Termine â†’ Keine Terminansicht betroffen.

## Ergebnis

Alle Terminansichten zeigen konsistente und aktuelle Projektdaten.

Es existieren keine veralteten Projektreferenzen in Termin-Karten.

