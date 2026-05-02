# UC 02/23: Notiz anpinnen / lospinnen

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

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

1. Der Akteur Ã¶ffnet das Projekt und navigiert zum Bereich â€žNotizen".
2. Der Akteur betÃ¤tigt den Pin-Toggle an einer Notiz.
3. Das System toggelt `is_pinned` via PATCH `api.notes.togglePin`.
4. Das System aktualisiert die Notizliste: angepinnte Notizen erscheinen oben, nicht angepinnte darunter, jeweils nach `updated_at` absteigend.

## Alternativen

- Notiz nicht vorhanden â†’ HTTP 404.
- Akteur nicht authentifiziert â†’ HTTP 401.
- Akteur ohne Schreibrechte â†’ HTTP 403.
- Technischer Fehler â†’ HTTP 500, `is_pinned` bleibt unverÃ¤ndert.

## Ergebnis

Der `is_pinned`-Wert der Notiz ist geÃ¤ndert. Die Notizliste ist gemÃ¤ÃŸ Sortierlogik aktualisiert. VollstÃ¤ndige Pinning-Regeln gemÃ¤ÃŸ FT (13).

