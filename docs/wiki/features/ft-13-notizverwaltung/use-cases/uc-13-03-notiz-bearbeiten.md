# UC 13/03: Notiz bearbeiten

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)

## Akteur

Disponent, Administrator

## Ziel

Eine bestehende Notiz ändern, ohne parallele Änderungen anderer Akteure still zu überschreiben.

## Vorbedingungen

- Die Notiz existiert.
- Die Notiz ist eindeutig einem Parent-Objekt zugeordnet (Projekt, Kunde, Mitarbeiter, Termin oder Kalenderwoche).
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte für Notizen.
- Die Notiz verfügt über ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

## Ablauf

1. Der Akteur öffnet die Notiz aus der Notizenliste des jeweiligen Parent-Kontexts.
2. Das System lädt die vollständigen Notizdaten einschließlich des aktuellen Versionsmerkmals.
3. Der Akteur ändert Titel und/oder Beschreibung der Notiz.
4. Änderungen an der Kennzeichnungsfarbe (`color`) sind nicht Bestandteil der normalen Bearbeitung durch Disponenten.
5. Der Akteur bestätigt die Änderungen.
6. Das System prüft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Übereinstimmung des übermittelten Versionsmerkmals mit dem aktuellen Stand.
7. Stimmen die Versionsinformationen überein, speichert das System die Änderungen.
8. Das System erhöht das Versionsmerkmal und setzt `updated_at` auf den aktuellen Zeitstempel.
9. Das System aktualisiert die Notizenliste im jeweiligen Parent-Kontext.

### Alternativabläufe

- Pflichtfelder ungültig → Das System verweigert die Speicherung und zeigt Validierungsfehler an.
- Der Akteur ist nicht authentifiziert → HTTP 401, keine Speicherung.
- Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Speicherung.
- Versionskonflikt (Notiz wurde zwischenzeitlich von einem anderen Akteur geändert oder gelöscht) → Das System antwortet mit HTTP 409 Conflict, speichert keine Änderungen und fordert den Akteur zum Neuladen des aktuellen Stands auf.
- Abbruch durch den Akteur → Keine Persistierung.
- Technischer Fehler → HTTP 500, keine Änderung wird gespeichert.

## Alternativen


## Ergebnis

- Die Notiz ist im Erfolgsfall mit neuer Versionsinformation gespeichert.
- Parallele Änderungen führen nicht zu stillen Überschreibungen.
- Die Notiz bleibt konsistent dem ursprünglichen Parent-Objekt zugeordnet.
- Es entstehen keine inkonsistenten Zwischenzustände oder Lost Updates.
