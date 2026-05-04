# UC 13/15: Wochen-Notiz bearbeiten

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/876216f2188c4fc58fcc65152f783906
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Eine bestehende Wochen-Notiz ändern, ohne parallele Ã„nderungen anderer Akteure still zu überschreiben.

## Vorbedingungen

- Die Notiz existiert und ist einer Kalenderwoche zugeordnet.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte für Notizen (keine Leser-Rolle).
- Die Notiz verfügt über ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

## Ablauf

1. Der Akteur öffnet die Notiz aus der Notizliste im Kalenderwochen-Kontext.
2. Das System lädt die vollständigen Notizdaten einschlieÃŸlich des aktuellen Versionsmerkmals.
3. Der Akteur ändert Titel und/oder Beschreibung.
4. Ã„nderungen an der Kennzeichnungsfarbe (`color`) sind nicht Bestandteil der normalen Bearbeitung durch Disponenten.
5. Der Akteur bestätigt die Ã„nderungen.
6. Das System prüft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Ãœbereinstimmung des übermittelten Versionsmerkmals mit dem aktuellen Stand.
7. Stimmen die Versionsinformationen überein, speichert das System die Ã„nderungen.
8. Das System erhöht das Versionsmerkmal und setzt `updated_at` auf den aktuellen Zeitstempel.
9. Das System aktualisiert die Notizliste im Kalenderwochen-Kontext.

### Alternativabläufe

- Pflichtfelder ungültig → Das System verweigert die Speicherung und zeigt Validierungsfehler an.
- Der Akteur ist nicht authentifiziert → HTTP 401, keine Speicherung.
- Der Akteur besitzt Leser-Rolle → HTTP 403, keine Speicherung.
- Versionskonflikt → HTTP 409 Conflict, keine Ã„nderung, Neuladen erforderlich.
- Abbruch durch den Akteur → Keine Persistierung.
- Technischer Fehler → HTTP 500, keine Ã„nderung wird gespeichert.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Die Notiz ist im Erfolgsfall mit neuer Versionsinformation gespeichert.
- Parallele Ã„nderungen führen nicht zu stillen Ãœberschreibungen.
- Die Notiz bleibt konsistent der ursprünglichen Kalenderwoche zugeordnet.
- Es entstehen keine inkonsistenten Zwischenzustände oder Lost Updates.

