# UC 11/03: Team lÃ¶schen

## Metadaten

- Feature: [FT (11): Team Verwaltung](../ft-11-team-verwaltung.md)
- Notion-Quelle: https://app.notion.com/p/614216f215f24bd98396822215195c97
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent

## Ziel

Ein nicht mehr benÃ¶tigtes Team entfernen.

## Vorbedingungen

- Das Team existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Berechtigung zum LÃ¶schen von Teams.
- Das Team besitzt eine gÃ¼ltige Versionskennung.

### AuslÃ¶ser

Der Akteur wÃ¤hlt ein Team zum LÃ¶schen aus.

## Ablauf

1. Der Akteur startet â€žTeam lÃ¶schenâ€œ.
2. Das System fordert eine BestÃ¤tigung an.
3. Der Akteur bestÃ¤tigt den LÃ¶schvorgang.
4. Das System prÃ¼ft serverseitig die Versionskennung.
5. Das System setzt bei allen Mitarbeitern dieses Teams das Feld `team_id = null`.
6. Das System lÃ¶scht das Team.

### AlternativablÃ¤ufe

- Versionskonflikt â†’ Das System antwortet mit 409 Conflict, keine LÃ¶schung.
- Abbruch durch den Akteur â†’ Keine LÃ¶schung.
- Technischer Fehler â†’ Das System antwortet mit 500, keine Teilpersistierung.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Das Team existiert nicht mehr.
- Alle ehemals zugeordneten Mitarbeiter besitzen `team_id = null`.
- Kein verwaister Zustand entsteht.

