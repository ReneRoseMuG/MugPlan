# UC 05/03: Mitarbeiter-Termine anzeigen

## Metadaten

- Feature: [FT (05): Mitarbeiterverwaltung](../ft-05-mitarbeiterverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/19c06c719b6a45ef9b6b5da509e5b0c5
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent, Leser

## Ziel

Die Stammdaten eines Mitarbeiters einsehen und nachvollziehen, welchen Terminen dieser Mitarbeiter aktuell oder in der Vergangenheit zugeordnet ist.

## Vorbedingungen

- Der Mitarbeiter existiert.
- Der Nutzer ist berechtigt, Mitarbeiterdaten einzusehen.

**Auslöser**

Der Nutzer wählt einen Mitarbeiter zur Anzeige aus.

## Ablauf

1. Der Nutzer wählt einen bestehenden Mitarbeiter aus.
2. Das System zeigt die Stammdaten des Mitarbeiters an.
3. Das System ermittelt alle Termine (Terminauswahl in der Sidebar und alle Termine auf Anfrage), denen der Mitarbeiter zugewiesen ist, über die Termin-Mitarbeiter-Relation.
4. Das System zeigt zu jedem Termin die relevanten Informationen an.
5. Das System stellt sicher, dass auch vergangene Termine angezeigt werden.

**Alternativabläufe**

- Dem Mitarbeiter sind keine Termine zugewiesen: Das System zeigt eine leere Terminliste an.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

Die Stammdaten des Mitarbeiters sowie eine vollständige Ãœbersicht aller zugeordneten Termine sind sichtbar.

Die Terminliste bildet die Einsatzhistorie des Mitarbeiters ab.

**Angezeigte Informationen (Terminliste)**

- Terminzeitraum (Start- und ggf. Enddatum)
- Terminbezeichnung
- Zugeordnete Tour
- Zugeordneter Kunde

