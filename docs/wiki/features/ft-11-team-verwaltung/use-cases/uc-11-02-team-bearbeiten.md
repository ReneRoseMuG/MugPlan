# UC 11/02: Team bearbeiten

## Metadaten

- Feature: [FT (11): Team Verwaltung](../ft-11-team-verwaltung.md)

## Akteur

Disponent

## Ziel

Ein bestehendes Team anpassen, indem Mitarbeiter hinzugefügt oder entfernt werden.

## Vorbedingungen

- Das Team existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Berechtigung zur Teambearbeitung.
- Das Team besitzt eine gültige Versionskennung.

### Auslöser

Der Akteur öffnet ein bestehendes Team zur Bearbeitung.

## Ablauf

1. Das System lädt Teamdaten inklusive aktueller Versionskennung.
2. Das System lädt als auswählbare Mitarbeiter:
    - alle aktiven Mitarbeiter ohne Teamzuordnung (`team_id = null`),
    - alle aktiven Mitarbeiter, die bereits diesem Team zugeordnet sind.
3. Der Akteur verändert die Mitarbeiterliste.
4. Der Akteur bestätigt die Änderungen.
5. Das System prüft serverseitig:
    - Versionskennung ist unverändert.
    - Jeder neu hinzugefügte Mitarbeiter existiert.
    - Jeder neu hinzugefügte Mitarbeiter ist aktiv.
    - Kein neu hinzugefügter Mitarbeiter ist einem anderen Team zugeordnet.
6. Das System entfernt `team_id` bei Mitarbeitern, die aus dem Team entfernt wurden.
7. Das System setzt `team_id` bei neu hinzugefügten Mitarbeitern auf die Team-ID.
8. Das System erhöht die Versionskennung des Teams.
9. Das System persistiert die Änderungen atomar.

### Alternativabläufe

- Versionskennung hat sich zwischenzeitlich geändert → Das System antwortet mit 409 Conflict, keine Persistierung.
- Ein neu hinzugefügter Mitarbeiter wurde parallel einem anderen Team zugeordnet → Das System antwortet mit 409 Conflict, keine Persistierung.
- Abbruch durch den Akteur → Keine Persistierung.
- Technischer Fehler → Das System antwortet mit 500, keine Teilpersistierung erfolgt.

## Alternativen


## Ergebnis

- Die Mitarbeiterliste des Teams ist aktualisiert.
- Kein Mitarbeiter ist mehreren Teams zugeordnet.
- Die Team-Version ist erhöht.
- Der Datenzustand ist konsistent.
