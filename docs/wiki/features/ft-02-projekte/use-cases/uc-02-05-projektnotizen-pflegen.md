# UC 02/05: Projektnotizen pflegen

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent

## Ziel

Projektbezogene Notizen anlegen oder bearbeiten, um projektspezifische Informationen zu dokumentieren.

## Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte (Disponent oder Administrator).

### Ablauf — Notiz anlegen

1. Der Akteur öffnet das Projekt und navigiert zum Bereich „Notizen".
2. Der Akteur wählt „Notiz hinzufügen".
3. Das System öffnet einen Richtext-Editor. Optional werden aktive Notizvorlagen zur Auswahl angezeigt.
4. Wählt der Akteur eine Vorlage, übernimmt das System Titel und Inhalt. Besitzt die Vorlage eine Kennzeichnungsfarbe (`color`), wird diese einmalig übernommen.
5. Der Akteur erfasst oder ändert Titel (Pflicht) und Beschreibung (Pflicht).
6. Das System validiert Pflichtfelder, legt die Notiz mit `is_pinned = false` an und verknüpft sie mit dem Projekt.
7. Das System aktualisiert die Notizliste gemäÃŸ Sortierlogik (angepinnte zuerst, dann `updated_at` absteigend).

### Ablauf — Notiz bearbeiten

1. Der Akteur öffnet eine bestehende Notiz aus der Notizliste des Projekts.
2. Das System lädt die Notizdaten einschlieÃŸlich Versionsmerkmal.
3. Der Akteur ändert Titel und/oder Beschreibung.
4. Das System prüft Versionsmerkmal serverseitig. Bei Ãœbereinstimmung speichert es die Ã„nderungen und erhöht das Versionsmerkmal.

## Ablauf

Nicht angegeben in der Notion-Quelle.

## Alternativen

- Projekt nicht vorhanden → HTTP 404.
- Akteur nicht authentifiziert → HTTP 401.
- Akteur ohne Schreibrechte → HTTP 403.
- Pflichtfelder (Titel oder Beschreibung) fehlen → Validierungsfehler, keine Persistenz.
- Versionskonflikt bei Bearbeitung → HTTP 409 VERSION_CONFLICT, Akteur muss neu laden.
- Abbruch → keine Ã„nderung wird gespeichert.
- Technischer Fehler → HTTP 500.

## Ergebnis

Notizen sind dem Projekt eindeutig zugeordnet und in der Notizliste sichtbar. Bestehende Beziehungen zu Kunde, Tags und Terminen bleiben unverändert. Vollständige Notiz-Regeln (Pinning, Vorlagen, `color`) gemäÃŸ FT (13).

