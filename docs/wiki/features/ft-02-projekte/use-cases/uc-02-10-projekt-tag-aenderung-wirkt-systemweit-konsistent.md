# UC 02/10: Projekt-Tag-Ã„nderung wirkt systemweit konsistent

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass Tag-Ã„nderungen eines Projekts in allen relevanten Sichten korrekt angezeigt werden.

## Vorbedingungen

- Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Ã„nderungsrechte (Disponent oder Administrator).
- Mindestens ein projektbezogener Tag ist zugeordnet oder wird geändert.

## Ablauf

1. Akteur ändert die projektbezogenen Tags gemäÃŸ UC 02/04.
2. System speichert die Tag-Zuordnung.
3. System aktualisiert Projektübersichten und Filterergebnisse.
4. Terminansichten aktualisieren Tag-Anzeigen, sofern diese angezeigt werden.

## Alternativen

- Akteur nicht authentifiziert → HTTP 401.
- Akteur ohne Ã„nderungsrechte → HTTP 403.
- Tag wird entfernt → Darstellung aktualisiert sich entsprechend.
- Tag wird hinzugefügt → Darstellung aktualisiert sich entsprechend.
- Versionskonflikt → HTTP 409 VERSION_CONFLICT.

## Ergebnis

Projekt-Tags sind in allen Sichten identisch sichtbar.

Tagfilter liefern konsistente Ergebnisse.

