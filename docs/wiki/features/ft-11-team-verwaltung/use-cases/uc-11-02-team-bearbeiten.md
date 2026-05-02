# UC 11/02: Team bearbeiten

## Metadaten

- Feature: [FT (11): Team Verwaltung](../ft-11-team-verwaltung.md)
- Notion-Quelle: https://app.notion.com/p/614216f215f24bd98396822215195c97
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent

## Ziel

Ein bestehendes Team anpassen, indem Mitarbeiter hinzugefÃ¼gt oder entfernt werden.

## Vorbedingungen

- Das Team existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Berechtigung zur Teambearbeitung.
- Das Team besitzt eine gÃ¼ltige Versionskennung.

### AuslÃ¶ser

Der Akteur Ã¶ffnet ein bestehendes Team zur Bearbeitung.

## Ablauf

1. Das System lÃ¤dt Teamdaten inklusive aktueller Versionskennung.
2. Das System lÃ¤dt als auswÃ¤hlbare Mitarbeiter:
    - alle aktiven Mitarbeiter ohne Teamzuordnung (`team_id = null`),
    - alle aktiven Mitarbeiter, die bereits diesem Team zugeordnet sind.
3. Der Akteur verÃ¤ndert die Mitarbeiterliste.
4. Der Akteur bestÃ¤tigt die Ã„nderungen.
5. Das System prÃ¼ft serverseitig:
    - Versionskennung ist unverÃ¤ndert.
    - Jeder neu hinzugefÃ¼gte Mitarbeiter existiert.
    - Jeder neu hinzugefÃ¼gte Mitarbeiter ist aktiv.
    - Kein neu hinzugefÃ¼gter Mitarbeiter ist einem anderen Team zugeordnet.
6. Das System entfernt `team_id` bei Mitarbeitern, die aus dem Team entfernt wurden.
7. Das System setzt `team_id` bei neu hinzugefÃ¼gten Mitarbeitern auf die Team-ID.
8. Das System erhÃ¶ht die Versionskennung des Teams.
9. Das System persistiert die Ã„nderungen atomar.

### AlternativablÃ¤ufe

- Versionskennung hat sich zwischenzeitlich geÃ¤ndert â†’ Das System antwortet mit 409 Conflict, keine Persistierung.
- Ein neu hinzugefÃ¼gter Mitarbeiter wurde parallel einem anderen Team zugeordnet â†’ Das System antwortet mit 409 Conflict, keine Persistierung.
- Abbruch durch den Akteur â†’ Keine Persistierung.
- Technischer Fehler â†’ Das System antwortet mit 500, keine Teilpersistierung erfolgt.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Die Mitarbeiterliste des Teams ist aktualisiert.
- Kein Mitarbeiter ist mehreren Teams zugeordnet.
- Die Team-Version ist erhÃ¶ht.
- Der Datenzustand ist konsistent.

