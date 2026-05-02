# UC 13/07: Notiz anpinnen / Pinning aufheben

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/876216f2188c4fc58fcc65152f783906
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Die Position einer bestehenden Notiz innerhalb der Notizenliste deterministisch beeinflussen, indem sie angepinnt oder das Pinning aufgehoben wird.

## Vorbedingungen

- Die Notiz existiert.
- Die Notiz ist eindeutig einem Parent-Objekt zugeordnet (Projekt, Kunde, Mitarbeiter, Termin oder Kalenderwoche).
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte fÃ¼r Notizen.
- Die Notiz verfÃ¼gt Ã¼ber ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

## Ablauf

1. Der Akteur Ã¶ffnet die Notizenliste im jeweiligen Parent-Kontext.
2. Der Akteur wÃ¤hlt eine bestehende Notiz aus.
3. Der Akteur wÃ¤hlt die Funktion â€žAnpinnen" oder â€žPinning aufheben".
4. Das System prÃ¼ft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Ãœbereinstimmung des Versionsmerkmals.
5. Bei erfolgreicher PrÃ¼fung setzt das System `is_pinned` entsprechend auf TRUE oder FALSE.
6. Das System erhÃ¶ht das Versionsmerkmal und aktualisiert `updated_at`.
7. Das System sortiert die Notizenliste neu gemÃ¤ÃŸ Sortierlogik:
    - Gepinnte Notizen zuerst,
    - danach Sortierung nach `updated_at` absteigend.
8. Das System rendert die aktualisierte Liste.

### AlternativablÃ¤ufe

- Der Akteur ist nicht authentifiziert â†’ HTTP 401, keine Ã„nderung.
- Der Akteur besitzt keine ausreichende Rolle â†’ HTTP 403, keine Ã„nderung.
- Versionskonflikt â†’ HTTP 409 Conflict, keine Ã„nderung, Neuladen erforderlich.
- Technischer Fehler â†’ HTTP 500, keine Ã„nderung.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Die Notiz ist im Erfolgsfall angepinnt oder nicht mehr angepinnt.
- Die Sortierung der Notizenliste ist deterministisch und konsistent.
- Parallele Ã„nderungen fÃ¼hren nicht zu stillen Ãœberschreibungen.
- Es entstehen keine Duplikate oder inkonsistenten SortierzustÃ¤nde.

