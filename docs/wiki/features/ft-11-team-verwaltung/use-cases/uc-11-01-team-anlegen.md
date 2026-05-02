# UC 11/01: Team anlegen

## Metadaten

- Feature: [FT (11): Team Verwaltung](../ft-11-team-verwaltung.md)
- Notion-Quelle: https://app.notion.com/p/614216f215f24bd98396822215195c97
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent

## Ziel

Ein neues Team anlegen, um hÃ¤ufig genutzte Mitarbeiterkombinationen schnell verwenden zu kÃ¶nnen.

## Vorbedingungen

- Es existieren aktive Mitarbeiter.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Berechtigung zur Teamanlage.

### AuslÃ¶ser

Der Akteur startet die Funktion â€žTeam anlegenâ€œ.

## Ablauf

1. Das System erzeugt automatisch eine Bezeichnung fÃ¼r das neue Team.
2. Das System lÃ¤dt ausschlieÃŸlich aktive Mitarbeiter ohne bestehende Teamzuordnung (`team_id = null`).
3. Der Akteur wÃ¤hlt einen oder mehrere angezeigte Mitarbeiter aus.
4. Der Akteur bestÃ¤tigt die Eingabe.
5. Das System prÃ¼ft serverseitig fÃ¼r jeden ausgewÃ¤hlten Mitarbeiter:
    - Der Mitarbeiter existiert.
    - Der Mitarbeiter ist aktiv.
    - Der Mitarbeiter besitzt keine bestehende Teamzuordnung.
6. Das System persistiert das Team.
7. Das System setzt fÃ¼r jeden ausgewÃ¤hlten Mitarbeiter das Feld `team_id` auf die ID des neu angelegten Teams.
8. Das System erzeugt eine Versionskennung fÃ¼r das Team.

### AlternativablÃ¤ufe

- Keine Mitarbeiter ausgewÃ¤hlt â†’ Das System lehnt die Speicherung ab und fordert zur Auswahl auf.
- Ein ausgewÃ¤hlter Mitarbeiter ist zwischenzeitlich einem anderen Team zugeordnet worden â†’ Das System antwortet mit 409 Conflict, es erfolgt keine Persistierung.
- Versionskonflikt bei paralleler Anlage mit identischer Bezeichnung â†’ Das System behandelt dies gemÃ¤ÃŸ allgemeiner Persistenzregeln.
- Abbruch durch den Akteur â†’ Keine Persistierung.
- Technischer Fehler â†’ Das System antwortet mit 500, keine Teilpersistierung erfolgt.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Ein neues Team existiert persistent.
- Alle zugeordneten Mitarbeiter besitzen `team_id = neuesTeam`.
- Kein Mitarbeiter ist mehreren Teams zugeordnet.
- Die Teamliste ist konsistent.

