# UC 02/11: ProjektlÃ¶schung wird systemweit korrekt verarbeitet

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass die LÃ¶schung eines Projekts keine inkonsistenten Referenzen hinterlÃ¤sst.

## Vorbedingungen

- Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt LÃ¶schrechte (Disponent oder Administrator).
- Dem Projekt sind keine Termine zugeordnet.

## Ablauf

1. Akteur lÃ¶scht ein Projekt gemÃ¤ÃŸ UC 02/08.
2. System entfernt das Projekt und alle abhÃ¤ngigen DatensÃ¤tze in einer Transaktion.
3. System aktualisiert ProjektÃ¼bersichten.
4. Offene Detailansichten schlieÃŸen sich oder wechseln in einen neutralen Zustand.

## Alternativen

- Akteur nicht authentifiziert â†’ HTTP 401.
- Akteur ohne LÃ¶schrechte â†’ HTTP 403.
- Projekt besitzt Termine â†’ HTTP 409 BUSINESS_CONFLICT, LÃ¶schung wird blockiert, keine Ansicht Ã¤ndert sich.
- Technischer Fehler â†’ HTTP 500, kein Teilzustand.

## Ergebnis

Es existieren keine Referenzen auf das gelÃ¶schte Projekt.

Alle Sichten sind konsistent.

