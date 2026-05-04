# UC 13/07: Notiz anpinnen / Pinning aufheben

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/876216f2188c4fc58fcc65152f783906
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Die Position einer bestehenden Notiz innerhalb der Notizenliste deterministisch beeinflussen, indem sie angepinnt oder das Pinning aufgehoben wird.

## Vorbedingungen

- Die Notiz existiert.
- Die Notiz ist eindeutig einem Parent-Objekt zugeordnet (Projekt, Kunde, Mitarbeiter, Termin oder Kalenderwoche).
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte für Notizen.
- Die Notiz verfügt über ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

## Ablauf

1. Der Akteur öffnet die Notizenliste im jeweiligen Parent-Kontext.
2. Der Akteur wählt eine bestehende Notiz aus.
3. Der Akteur wählt die Funktion „Anpinnen" oder „Pinning aufheben".
4. Das System prüft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Ãœbereinstimmung des Versionsmerkmals.
5. Bei erfolgreicher Prüfung setzt das System `is_pinned` entsprechend auf TRUE oder FALSE.
6. Das System erhöht das Versionsmerkmal und aktualisiert `updated_at`.
7. Das System sortiert die Notizenliste neu gemäÃŸ Sortierlogik:
    - Gepinnte Notizen zuerst,
    - danach Sortierung nach `updated_at` absteigend.
8. Das System rendert die aktualisierte Liste.

### Alternativabläufe

- Der Akteur ist nicht authentifiziert → HTTP 401, keine Ã„nderung.
- Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Ã„nderung.
- Versionskonflikt → HTTP 409 Conflict, keine Ã„nderung, Neuladen erforderlich.
- Technischer Fehler → HTTP 500, keine Ã„nderung.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Die Notiz ist im Erfolgsfall angepinnt oder nicht mehr angepinnt.
- Die Sortierung der Notizenliste ist deterministisch und konsistent.
- Parallele Ã„nderungen führen nicht zu stillen Ãœberschreibungen.
- Es entstehen keine Duplikate oder inkonsistenten Sortierzustände.

