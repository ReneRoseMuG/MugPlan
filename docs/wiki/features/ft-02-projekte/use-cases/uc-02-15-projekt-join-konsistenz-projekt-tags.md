# UC 02/15: Projekt-Join-Konsistenz (Projekt ↔ Tags)

## Metadaten

- Feature: [FT (02): Projekte](../feature.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass die Beziehung zwischen Projekt und projektbezogenen Tags jederzeit konsistent, eindeutig und frei von verwaisten Relationen ist.

## Vorbedingungen

- Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Änderungsrechte gemäß seiner Rolle.
- Mindestens ein projektbezogener Tag ist im System definiert.

## Ablauf

1. Akteur fügt einem Projekt einen oder mehrere Tags hinzu oder entfernt bestehende Tags gemäß UC 02/04.
2. System prüft vor dem Speichern, ob der Tag existiert und für Projekte zulässig ist.
3. System verhindert die Mehrfachzuweisung desselben Tags zum selben Projekt.
4. System speichert die Join-Änderung atomar.
5. Bei Projektlöschung entfernt das System alle zugehörigen Tag-Zuordnungen (Cascade).

## Alternativen

- Akteur nicht authentifiziert → HTTP 401.
- Akteur ohne Änderungsrechte → HTTP 403.
- Tag existiert nicht → HTTP 404.
- Tag ist geschützter System-Tag (`isDefault = true`) → HTTP 409 WORKFLOW_TAG_PROTECTED.
- Parallele Änderung der Tag-Zuordnungen → HTTP 409 VERSION_CONFLICT.

## Ergebnis

Die Beziehung zwischen Projekt und Tags ist eindeutig und konsistent gespeichert.

Es existieren keine doppelten oder verwaisten Join-Einträge.

Die Integrität bleibt auch bei Projektlöschung gewahrt.
