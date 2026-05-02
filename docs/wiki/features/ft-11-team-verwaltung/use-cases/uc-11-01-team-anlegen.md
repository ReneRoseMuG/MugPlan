# UC 11/01: Team anlegen

## Metadaten

- Feature: [FT (11): Team Verwaltung](../feature.md)
- Notion-Quelle: https://app.notion.com/p/614216f215f24bd98396822215195c97
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent

## Ziel

Ein neues Team anlegen, um häufig genutzte Mitarbeiterkombinationen schnell verwenden zu können.

## Vorbedingungen

- Es existieren aktive Mitarbeiter.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Berechtigung zur Teamanlage.

### Auslöser

Der Akteur startet die Funktion „Team anlegen“.

## Ablauf

1. Das System erzeugt automatisch eine Bezeichnung für das neue Team.
2. Das System lädt ausschließlich aktive Mitarbeiter ohne bestehende Teamzuordnung (`team_id = null`).
3. Der Akteur wählt einen oder mehrere angezeigte Mitarbeiter aus.
4. Der Akteur bestätigt die Eingabe.
5. Das System prüft serverseitig für jeden ausgewählten Mitarbeiter:
    - Der Mitarbeiter existiert.
    - Der Mitarbeiter ist aktiv.
    - Der Mitarbeiter besitzt keine bestehende Teamzuordnung.
6. Das System persistiert das Team.
7. Das System setzt für jeden ausgewählten Mitarbeiter das Feld `team_id` auf die ID des neu angelegten Teams.
8. Das System erzeugt eine Versionskennung für das Team.

### Alternativabläufe

- Keine Mitarbeiter ausgewählt → Das System lehnt die Speicherung ab und fordert zur Auswahl auf.
- Ein ausgewählter Mitarbeiter ist zwischenzeitlich einem anderen Team zugeordnet worden → Das System antwortet mit 409 Conflict, es erfolgt keine Persistierung.
- Versionskonflikt bei paralleler Anlage mit identischer Bezeichnung → Das System behandelt dies gemäß allgemeiner Persistenzregeln.
- Abbruch durch den Akteur → Keine Persistierung.
- Technischer Fehler → Das System antwortet mit 500, keine Teilpersistierung erfolgt.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Ein neues Team existiert persistent.
- Alle zugeordneten Mitarbeiter besitzen `team_id = neuesTeam`.
- Kein Mitarbeiter ist mehreren Teams zugeordnet.
- Die Teamliste ist konsistent.
