# UC 02/24: Projekt aktivieren / deaktivieren

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent

## Ziel

Ein Projekt als aktiv oder inaktiv kennzeichnen, ohne es zu löschen. Inaktive Projekte werden in der Standardliste nicht angezeigt.

## Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Ã„nderungsrechte (Disponent oder Administrator).
- Das Projekt besitzt ein Versionsmerkmal.

## Ablauf

1. Der Akteur öffnet das Projekt.
2. Der Akteur ändert den Aktiv-Status (Toggle `is_active`).
3. Das System ändert `is_active` via PATCH und prüft das Versionsmerkmal.
4. Das System persistiert die Ã„nderung und erhöht die Version.
5. Das System aktualisiert die Projektliste: Inaktive Projekte erscheinen nur bei explizitem Filter `filter=inactive` oder `filter=all`.

## Alternativen

- Projekt nicht vorhanden → HTTP 404.
- Akteur nicht authentifiziert → HTTP 401.
- Akteur ohne Ã„nderungsrechte → HTTP 403.
- Versionskonflikt → HTTP 409 VERSION_CONFLICT.
- Technischer Fehler → HTTP 500.

## Ergebnis

Der `is_active`-Wert ist geändert. Inaktive Projekte sind in der Standard-Projektliste nicht sichtbar. Termine und Notizen des Projekts bleiben unverändert.

