# UC 13/03: Notiz bearbeiten

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/876216f2188c4fc58fcc65152f783906
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Eine bestehende Notiz ändern, ohne parallele Ã„nderungen anderer Akteure still zu überschreiben.

## Vorbedingungen

- Die Notiz existiert.
- Die Notiz ist eindeutig einem Parent-Objekt zugeordnet (Projekt, Kunde, Mitarbeiter, Termin oder Kalenderwoche).
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte für Notizen.
- Die Notiz verfügt über ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

## Ablauf

1. Der Akteur öffnet die Notiz aus der Notizenliste des jeweiligen Parent-Kontexts.
2. Das System lädt die vollständigen Notizdaten einschlieÃŸlich des aktuellen Versionsmerkmals.
3. Der Akteur ändert Titel und/oder Beschreibung der Notiz.
4. Ã„nderungen an der Kennzeichnungsfarbe (`color`) sind nicht Bestandteil der normalen Bearbeitung durch Disponenten.
5. Der Akteur bestätigt die Ã„nderungen.
6. Das System prüft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Ãœbereinstimmung des übermittelten Versionsmerkmals mit dem aktuellen Stand.
7. Stimmen die Versionsinformationen überein, speichert das System die Ã„nderungen.
8. Das System erhöht das Versionsmerkmal und setzt `updated_at` auf den aktuellen Zeitstempel.
9. Das System aktualisiert die Notizenliste im jeweiligen Parent-Kontext.

### Alternativabläufe

- Pflichtfelder ungültig → Das System verweigert die Speicherung und zeigt Validierungsfehler an.
- Der Akteur ist nicht authentifiziert → HTTP 401, keine Speicherung.
- Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Speicherung.
- Versionskonflikt (Notiz wurde zwischenzeitlich von einem anderen Akteur geändert oder gelöscht) → Das System antwortet mit HTTP 409 Conflict, speichert keine Ã„nderungen und fordert den Akteur zum Neuladen des aktuellen Stands auf.
- Abbruch durch den Akteur → Keine Persistierung.
- Technischer Fehler → HTTP 500, keine Ã„nderung wird gespeichert.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Die Notiz ist im Erfolgsfall mit neuer Versionsinformation gespeichert.
- Parallele Ã„nderungen führen nicht zu stillen Ãœberschreibungen.
- Die Notiz bleibt konsistent dem ursprünglichen Parent-Objekt zugeordnet.
- Es entstehen keine inkonsistenten Zwischenzustände oder Lost Updates.

