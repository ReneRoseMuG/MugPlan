# UC 02/23: Notiz anpinnen / lospinnen

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent

## Ziel

Eine Notiz als wichtig markieren (anpinnen) oder diese Markierung aufheben, sodass sie in der Notizliste priorisiert oder normal einsortiert wird.

## Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte (Disponent oder Administrator).
- Dem Projekt ist mindestens eine Notiz zugeordnet.

## Ablauf

1. Der Akteur öffnet das Projekt und navigiert zum Bereich „Notizen".
2. Der Akteur betätigt den Pin-Toggle an einer Notiz.
3. Das System toggelt `is_pinned` via PATCH `api.notes.togglePin`.
4. Das System aktualisiert die Notizliste: angepinnte Notizen erscheinen oben, nicht angepinnte darunter, jeweils nach `updated_at` absteigend.

## Alternativen

- Notiz nicht vorhanden → HTTP 404.
- Akteur nicht authentifiziert → HTTP 401.
- Akteur ohne Schreibrechte → HTTP 403.
- Technischer Fehler → HTTP 500, `is_pinned` bleibt unverändert.

## Ergebnis

Der `is_pinned`-Wert der Notiz ist geändert. Die Notizliste ist gemäÃŸ Sortierlogik aktualisiert. Vollständige Pinning-Regeln gemäÃŸ FT (13).

