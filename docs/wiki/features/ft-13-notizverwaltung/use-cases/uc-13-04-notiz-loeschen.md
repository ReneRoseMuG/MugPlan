# UC 13/04: Notiz löschen

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)

## Akteur

Disponent, Administrator

## Ziel

Eine bestehende Notiz vollständig und konsistent entfernen.

## Vorbedingungen

- Die Notiz existiert.
- Die Notiz ist eindeutig einem Parent-Objekt zugeordnet (Projekt, Kunde, Mitarbeiter, Termin oder Kalenderwoche).
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Löschrechte für Notizen.
- Die Notiz verfügt über ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

## Ablauf

1. Der Akteur öffnet die Notizenliste im jeweiligen Parent-Kontext.
2. Der Akteur wählt eine bestehende Notiz aus.
3. Der Akteur wählt die Funktion „Notiz löschen".
4. Das System zeigt eine Sicherheitsabfrage an.
5. Der Akteur bestätigt das Löschen.
6. Das System prüft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Übereinstimmung des übermittelten Versionsmerkmals mit dem aktuellen Stand.
7. Stimmen die Versionsinformationen überein, löscht das System die Notiz sowie die zugehörige Parent-Relation endgültig.
8. Das System aktualisiert die Notizenliste im jeweiligen Parent-Kontext.

### Alternativabläufe

- Der Akteur bricht die Sicherheitsabfrage ab → Die Notiz bleibt unverändert bestehen.
- Der Akteur ist nicht authentifiziert → HTTP 401, keine Löschung.
- Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Löschung.
- Versionskonflikt (Notiz wurde zwischenzeitlich geändert oder bereits gelöscht) → Das System antwortet mit HTTP 409 Conflict, es erfolgt keine Löschung, der Akteur wird zum Neuladen aufgefordert.
- Technischer Fehler → HTTP 500, keine Löschung erfolgt.

## Alternativen


## Ergebnis

- Die Notiz ist im Erfolgsfall vollständig aus dem System entfernt.
- Die Notiz erscheint in keiner Notizenliste mehr.
- Parallele Aktionen führen nicht zu inkonsistenten Zuständen oder unbeabsichtigten Löschungen.
- Die Konsistenz der Parent-Relation bleibt gewahrt.
