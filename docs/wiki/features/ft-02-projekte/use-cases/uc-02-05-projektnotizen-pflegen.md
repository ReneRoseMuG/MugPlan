# UC 02/05: Projektnotizen pflegen

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator, Disponent

## Ziel

Projektbezogene Notizen anlegen oder bearbeiten, um projektspezifische Informationen zu dokumentieren.

## Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte (Disponent oder Administrator).

### Ablauf â€” Notiz anlegen

1. Der Akteur Ã¶ffnet das Projekt und navigiert zum Bereich â€žNotizen".
2. Der Akteur wÃ¤hlt â€žNotiz hinzufÃ¼gen".
3. Das System Ã¶ffnet einen Richtext-Editor. Optional werden aktive Notizvorlagen zur Auswahl angezeigt.
4. WÃ¤hlt der Akteur eine Vorlage, Ã¼bernimmt das System Titel und Inhalt. Besitzt die Vorlage eine Kennzeichnungsfarbe (`color`), wird diese einmalig Ã¼bernommen.
5. Der Akteur erfasst oder Ã¤ndert Titel (Pflicht) und Beschreibung (Pflicht).
6. Das System validiert Pflichtfelder, legt die Notiz mit `is_pinned = false` an und verknÃ¼pft sie mit dem Projekt.
7. Das System aktualisiert die Notizliste gemÃ¤ÃŸ Sortierlogik (angepinnte zuerst, dann `updated_at` absteigend).

### Ablauf â€” Notiz bearbeiten

1. Der Akteur Ã¶ffnet eine bestehende Notiz aus der Notizliste des Projekts.
2. Das System lÃ¤dt die Notizdaten einschlieÃŸlich Versionsmerkmal.
3. Der Akteur Ã¤ndert Titel und/oder Beschreibung.
4. Das System prÃ¼ft Versionsmerkmal serverseitig. Bei Ãœbereinstimmung speichert es die Ã„nderungen und erhÃ¶ht das Versionsmerkmal.

## Ablauf

Nicht angegeben in der Notion-Quelle.

## Alternativen

- Projekt nicht vorhanden â†’ HTTP 404.
- Akteur nicht authentifiziert â†’ HTTP 401.
- Akteur ohne Schreibrechte â†’ HTTP 403.
- Pflichtfelder (Titel oder Beschreibung) fehlen â†’ Validierungsfehler, keine Persistenz.
- Versionskonflikt bei Bearbeitung â†’ HTTP 409 VERSION_CONFLICT, Akteur muss neu laden.
- Abbruch â†’ keine Ã„nderung wird gespeichert.
- Technischer Fehler â†’ HTTP 500.

## Ergebnis

Notizen sind dem Projekt eindeutig zugeordnet und in der Notizliste sichtbar. Bestehende Beziehungen zu Kunde, Tags und Terminen bleiben unverÃ¤ndert. VollstÃ¤ndige Notiz-Regeln (Pinning, Vorlagen, `color`) gemÃ¤ÃŸ FT (13).

