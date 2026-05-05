# UC 11/03: Team löschen

## Metadaten

- Feature: [FT (11): Team Verwaltung](../ft-11-team-verwaltung.md)

## Akteur

Disponent

## Ziel

Ein nicht mehr benötigtes Team entfernen.

## Vorbedingungen

- Das Team existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Berechtigung zum Löschen von Teams.
- Das Team besitzt eine gültige Versionskennung.

### Auslöser

Der Akteur wählt ein Team zum Löschen aus.

## Ablauf

1. Der Akteur startet „Team löschen“.
2. Das System fordert eine Bestätigung an.
3. Der Akteur bestätigt den Löschvorgang.
4. Das System prüft serverseitig die Versionskennung.
5. Das System setzt bei allen Mitarbeitern dieses Teams das Feld `team_id = null`.
6. Das System löscht das Team.

### Alternativabläufe

- Versionskonflikt → Das System antwortet mit 409 Conflict, keine Löschung.
- Abbruch durch den Akteur → Keine Löschung.
- Technischer Fehler → Das System antwortet mit 500, keine Teilpersistierung.

## Alternativen


## Ergebnis

- Das Team existiert nicht mehr.
- Alle ehemals zugeordneten Mitarbeiter besitzen `team_id = null`.
- Kein verwaister Zustand entsteht.
