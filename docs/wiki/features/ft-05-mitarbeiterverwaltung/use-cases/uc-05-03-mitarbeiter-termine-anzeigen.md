# UC 05/03: Mitarbeiter-Termine anzeigen

## Metadaten

- Feature: [FT (05): Mitarbeiterverwaltung](../ft-05-mitarbeiterverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/19c06c719b6a45ef9b6b5da509e5b0c5
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator, Disponent, Leser

## Ziel

Die Stammdaten eines Mitarbeiters einsehen und nachvollziehen, welchen Terminen dieser Mitarbeiter aktuell oder in der Vergangenheit zugeordnet ist.

## Vorbedingungen

- Der Mitarbeiter existiert.
- Der Nutzer ist berechtigt, Mitarbeiterdaten einzusehen.

**AuslÃ¶ser**

Der Nutzer wÃ¤hlt einen Mitarbeiter zur Anzeige aus.

## Ablauf

1. Der Nutzer wÃ¤hlt einen bestehenden Mitarbeiter aus.
2. Das System zeigt die Stammdaten des Mitarbeiters an.
3. Das System ermittelt alle Termine (Terminauswahl in der Sidebar und alle Termine auf Anfrage), denen der Mitarbeiter zugewiesen ist, Ã¼ber die Termin-Mitarbeiter-Relation.
4. Das System zeigt zu jedem Termin die relevanten Informationen an.
5. Das System stellt sicher, dass auch vergangene Termine angezeigt werden.

**AlternativablÃ¤ufe**

- Dem Mitarbeiter sind keine Termine zugewiesen: Das System zeigt eine leere Terminliste an.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

Die Stammdaten des Mitarbeiters sowie eine vollstÃ¤ndige Ãœbersicht aller zugeordneten Termine sind sichtbar.

Die Terminliste bildet die Einsatzhistorie des Mitarbeiters ab.

**Angezeigte Informationen (Terminliste)**

- Terminzeitraum (Start- und ggf. Enddatum)
- Terminbezeichnung
- Zugeordnete Tour
- Zugeordneter Kunde

