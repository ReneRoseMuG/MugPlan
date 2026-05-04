# UC 11/04: Team anzeigen

## Metadaten

- Feature: [FT (11): Team Verwaltung](../ft-11-team-verwaltung.md)
- Notion-Quelle: https://app.notion.com/p/614216f215f24bd98396822215195c97
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent

## Ziel

Eine Ãœbersicht über vorhandene Teams und deren Zusammensetzung erhalten.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leseberechtigung.

### Auslöser

Der Akteur ruft die Teamübersicht auf oder wählt ein Team aus.

## Ablauf

1. Das System lädt alle Teams.
2. Das System lädt zu jedem Team die aktuell zugeordneten aktiven Mitarbeiter (`team_id = teamId`).
3. Das System zeigt Bezeichnung und Mitarbeiterliste an.

### Alternativabläufe

- Keine Teams vorhanden → Das System zeigt eine entsprechende Information an.
- Technischer Fehler → Das System antwortet mit 500.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Die Zusammensetzung der Teams ist vollständig und konsistent sichtbar.

