# UC 02/22: Notiz von Projekt entfernen

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent

## Ziel

Eine Notiz dauerhaft vom Projekt entfernen, ohne andere Projekt-Daten zu verändern.

## Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte (Disponent oder Administrator).
- Dem Projekt ist mindestens eine Notiz zugeordnet.

## Ablauf

1. Der Akteur öffnet das Projekt und navigiert zum Bereich „Notizen".
2. Der Akteur wählt eine Notiz und betätigt die Löschaktion.
3. Das System zeigt eine Sicherheitsrückfrage.
4. Der Akteur bestätigt die Löschung.
5. Das System prüft Authentifizierung, Berechtigung und Existenz der Notiz-Projekt-Relation.
6. Das System löscht die Notiz und deren Relation zum Projekt physisch.
7. Das System aktualisiert die Notizliste gemäÃŸ Sortierlogik.

## Alternativen

- Projekt nicht vorhanden → HTTP 404.
- Akteur nicht authentifiziert → HTTP 401.
- Akteur ohne Schreibrechte → HTTP 403.
- Notiz nicht vorhanden → HTTP 404.
- Akteur bricht Rückfrage ab → keine Ã„nderung, Notiz bleibt erhalten.
- Technischer Fehler → HTTP 500, Notiz bleibt erhalten.

## Ergebnis

Die Notiz ist physisch gelöscht. Die Notizliste des Projekts ist aktualisiert. Alle anderen Projektdaten (Tags, Anhänge, Termine) bleiben unverändert.

