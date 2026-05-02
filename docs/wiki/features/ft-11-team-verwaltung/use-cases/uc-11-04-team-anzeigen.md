# UC 11/04: Team anzeigen

## Metadaten

- Feature: [FT (11): Team Verwaltung](../ft-11-team-verwaltung.md)
- Notion-Quelle: https://app.notion.com/p/614216f215f24bd98396822215195c97
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent

## Ziel

Eine Ãœbersicht Ã¼ber vorhandene Teams und deren Zusammensetzung erhalten.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leseberechtigung.

### AuslÃ¶ser

Der Akteur ruft die TeamÃ¼bersicht auf oder wÃ¤hlt ein Team aus.

## Ablauf

1. Das System lÃ¤dt alle Teams.
2. Das System lÃ¤dt zu jedem Team die aktuell zugeordneten aktiven Mitarbeiter (`team_id = teamId`).
3. Das System zeigt Bezeichnung und Mitarbeiterliste an.

### AlternativablÃ¤ufe

- Keine Teams vorhanden â†’ Das System zeigt eine entsprechende Information an.
- Technischer Fehler â†’ Das System antwortet mit 500.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Die Zusammensetzung der Teams ist vollstÃ¤ndig und konsistent sichtbar.

