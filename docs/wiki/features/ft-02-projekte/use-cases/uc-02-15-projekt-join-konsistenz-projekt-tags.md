# UC 02/15: Projekt-Join-Konsistenz (Projekt â†” Tags)

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass die Beziehung zwischen Projekt und projektbezogenen Tags jederzeit konsistent, eindeutig und frei von verwaisten Relationen ist.

## Vorbedingungen

- Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Ã„nderungsrechte gemÃ¤ÃŸ seiner Rolle.
- Mindestens ein projektbezogener Tag ist im System definiert.

## Ablauf

1. Akteur fÃ¼gt einem Projekt einen oder mehrere Tags hinzu oder entfernt bestehende Tags gemÃ¤ÃŸ UC 02/04.
2. System prÃ¼ft vor dem Speichern, ob der Tag existiert und fÃ¼r Projekte zulÃ¤ssig ist.
3. System verhindert die Mehrfachzuweisung desselben Tags zum selben Projekt.
4. System speichert die Join-Ã„nderung atomar.
5. Bei ProjektlÃ¶schung entfernt das System alle zugehÃ¶rigen Tag-Zuordnungen (Cascade).

## Alternativen

- Akteur nicht authentifiziert â†’ HTTP 401.
- Akteur ohne Ã„nderungsrechte â†’ HTTP 403.
- Tag existiert nicht â†’ HTTP 404.
- Tag ist geschÃ¼tzter System-Tag (`isDefault = true`) â†’ HTTP 409 WORKFLOW_TAG_PROTECTED.
- Parallele Ã„nderung der Tag-Zuordnungen â†’ HTTP 409 VERSION_CONFLICT.

## Ergebnis

Die Beziehung zwischen Projekt und Tags ist eindeutig und konsistent gespeichert.

Es existieren keine doppelten oder verwaisten Join-EintrÃ¤ge.

Die IntegritÃ¤t bleibt auch bei ProjektlÃ¶schung gewahrt.

