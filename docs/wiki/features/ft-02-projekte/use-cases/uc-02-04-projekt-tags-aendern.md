# UC 02/04: Projekt-Tags Ã¤ndern

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator, Disponent

## Ziel

Projektbezogene Tags Ã¼ber das universelle Tagging-System anpassen.

## Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Ã„nderungsrechte (Disponent oder Administrator).
- Die gewÃ¼nschten Tags existieren gemÃ¤ÃŸ FT (28).
- Die gewÃ¼nschten Tags sind frei verwendbare Tags und keine geschÃ¼tzten System-Tags.

## Ablauf

1. Der Akteur Ã¶ffnet ein Projekt.
2. Der Akteur fÃ¼gt einen frei verwendbaren projektbezogenen Tag hinzu oder entfernt einen vorhandenen frei verwendbaren Tag.
3. Das System prÃ¼ft serverseitig:
    - Authentifizierung und Rolle (Disponent oder Administrator),
    - Existenz des Projekts,
    - Existenz des Tags,
    - ob der Tag ein System-Tag ist (`isDefault = true`) â€” diese sind geschÃ¼tzt und kÃ¶nnen weder hinzugefÃ¼gt noch entfernt werden.
4. Das System prÃ¼ft das Versionsmerkmal der Tag-Relation (bei Entfernen).
5. Das System speichert die Ã„nderung der Tag-Zuordnung atomar.

## Alternativen

- Projekt nicht vorhanden â†’ HTTP 404.
- Akteur nicht authentifiziert â†’ HTTP 401.
- Akteur ohne Ã„nderungsrechte (Leser) â†’ HTTP 403.
- Tag existiert nicht â†’ HTTP 404.
- Tag ist ein geschÃ¼tzter System-Tag (`isDefault = true`) â†’ HTTP 409 WORKFLOW_TAG_PROTECTED.
- **Reklamation** ist ein geschÃ¼tzter System-Tag und wird nicht Ã¼ber diesen Use Case geÃ¤ndert. DafÃ¼r gilt UC 06/02.
- Doppelte Tag-Zuweisung â†’ System verhindert Mehrfacheintrag.
- Versionskonflikt bei paralleler Tag-Ã„nderung â†’ HTTP 409 VERSION_CONFLICT.
- Technischer Fehler â†’ HTTP 500.

## Ergebnis

Die frei verwendbaren projektbezogenen Tags sind aktualisiert. System-Tags bleiben von manuellen Ã„nderungen unberÃ¼hrt. Die Tag-Ã„nderung folgt den Regeln aus FT (28); Reklamationen folgen dem Workflow aus FT (06).

