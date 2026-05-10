# UC 13/07: Notiz anpinnen / Pinning aufheben

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)

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
    - Übereinstimmung des Versionsmerkmals.
5. Bei erfolgreicher Prüfung setzt das System `is_pinned` entsprechend auf TRUE oder FALSE.
6. Das System erhöht das Versionsmerkmal und aktualisiert `updated_at`.
7. Das System sortiert die Notizenliste neu gemäß Sortierlogik:
    - Gepinnte Notizen zuerst,
    - danach Sortierung nach `updated_at` absteigend.
8. Das System rendert die aktualisierte Liste.


## Alternativen


- Der Akteur ist nicht authentifiziert → HTTP 401, keine Änderung.
- Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Änderung.
- Versionskonflikt → HTTP 409 Conflict, keine Änderung, Neuladen erforderlich.
- Technischer Fehler → HTTP 500, keine Änderung.


## Ergebnis

- Die Notiz ist im Erfolgsfall angepinnt oder nicht mehr angepinnt.
- Die Sortierung der Notizenliste ist deterministisch und konsistent.
- Parallele Änderungen führen nicht zu stillen Überschreibungen.
- Es entstehen keine Duplikate oder inkonsistenten Sortierzustände.
