# UC 02/04: Projekt-Tags ändern

## Metadaten

- Feature: [FT (02): Projekte](../feature.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent

## Ziel

Projektbezogene Tags über das universelle Tagging-System anpassen.

## Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Änderungsrechte (Disponent oder Administrator).
- Die gewünschten Tags existieren gemäß FT (28).

## Ablauf

1. Der Akteur öffnet ein Projekt.
2. Der Akteur fügt einen projektbezogenen Tag hinzu oder entfernt einen vorhandenen Tag.
3. Das System prüft serverseitig:
    - Authentifizierung und Rolle (Disponent oder Administrator),
    - Existenz des Projekts,
    - Existenz des Tags,
    - ob der Tag ein System-Tag ist (`isDefault = true`) — diese sind geschützt und können weder hinzugefügt noch entfernt werden.
4. Das System prüft das Versionsmerkmal der Tag-Relation (bei Entfernen).
5. Das System speichert die Änderung der Tag-Zuordnung atomar.

## Alternativen

- Projekt nicht vorhanden → HTTP 404.
- Akteur nicht authentifiziert → HTTP 401.
- Akteur ohne Änderungsrechte (Leser) → HTTP 403.
- Tag existiert nicht → HTTP 404.
- Tag ist ein geschützter System-Tag (`isDefault = true`) → HTTP 409 WORKFLOW_TAG_PROTECTED.
- Doppelte Tag-Zuweisung → System verhindert Mehrfacheintrag.
- Versionskonflikt bei paralleler Tag-Änderung → HTTP 409 VERSION_CONFLICT.
- Technischer Fehler → HTTP 500.

## Ergebnis

Die projektbezogenen Tags sind aktualisiert. System-Tags bleiben von manuellen Änderungen unberührt. Die Tag-Änderung folgt den Regeln aus FT (28).
