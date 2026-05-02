# UC 02/22: Notiz von Projekt entfernen

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator, Disponent

## Ziel

Eine Notiz dauerhaft vom Projekt entfernen, ohne andere Projekt-Daten zu verÃ¤ndern.

## Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte (Disponent oder Administrator).
- Dem Projekt ist mindestens eine Notiz zugeordnet.

## Ablauf

1. Der Akteur Ã¶ffnet das Projekt und navigiert zum Bereich â€žNotizen".
2. Der Akteur wÃ¤hlt eine Notiz und betÃ¤tigt die LÃ¶schaktion.
3. Das System zeigt eine SicherheitsrÃ¼ckfrage.
4. Der Akteur bestÃ¤tigt die LÃ¶schung.
5. Das System prÃ¼ft Authentifizierung, Berechtigung und Existenz der Notiz-Projekt-Relation.
6. Das System lÃ¶scht die Notiz und deren Relation zum Projekt physisch.
7. Das System aktualisiert die Notizliste gemÃ¤ÃŸ Sortierlogik.

## Alternativen

- Projekt nicht vorhanden â†’ HTTP 404.
- Akteur nicht authentifiziert â†’ HTTP 401.
- Akteur ohne Schreibrechte â†’ HTTP 403.
- Notiz nicht vorhanden â†’ HTTP 404.
- Akteur bricht RÃ¼ckfrage ab â†’ keine Ã„nderung, Notiz bleibt erhalten.
- Technischer Fehler â†’ HTTP 500, Notiz bleibt erhalten.

## Ergebnis

Die Notiz ist physisch gelÃ¶scht. Die Notizliste des Projekts ist aktualisiert. Alle anderen Projektdaten (Tags, AnhÃ¤nge, Termine) bleiben unverÃ¤ndert.

