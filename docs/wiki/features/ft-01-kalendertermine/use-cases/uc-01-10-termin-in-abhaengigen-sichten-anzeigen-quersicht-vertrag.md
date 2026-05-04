# UC 01/10: Termin in abhängigen Sichten anzeigen (Quersicht-Vertrag)

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass nach jeder terminrelevanten Aktion die abhängigen Sichten, die ihre Terminlisten über API-Endpunkte beziehen, konsistent sind. Ein Termin muss dort erscheinen oder verschwinden, wo es fachlich aus den Beziehungen folgt, damit Projekt-, Kunden-, Mitarbeiter- und Tour-Formulare stets den gleichen Datenstand wie der Kalender widerspiegeln.

## Vorbedingungen

- Ein Termin existiert oder wird gerade neu angelegt.
- Der Termin ist einem Kunden direkt zugeordnet (customer_id NOT NULL).
- Optional: Der Termin ist einem Projekt zugeordnet; in diesem Fall gilt appointment.customer_id == project.customer_id.
- Optional: Dem Termin sind Mitarbeiter zugeordnet.
- Optional: Dem Termin ist eine Tour zugeordnet.

## Ablauf

1. Der Akteur führt eine terminrelevante Aktion aus, zum Beispiel Termin anlegen, Termin bearbeiten, Termin verschieben, Mitarbeiter zuweisen oder entfernen, Team als Einfügehilfe verwenden, Tour zuweisen oder Tour entfernen.
2. Das System speichert die Ã„nderung vollständig und atomar, sodass keine Teilzustände entstehen, insbesondere keine halbfertigen Join-Einträge Termin–Mitarbeiter.
3. Das System aktualisiert alle abhängigen Sichten, die Termine anzeigen.
4. Das System stellt sicher, dass die abhängigen Sichten denselben fachlichen Zustand ausliefern, der sich aus den Beziehungen ergibt.

## Alternativen

- Abbruch: Der Akteur bricht die Aktion ab. Es werden keine Ã„nderungen gespeichert, und folglich dürfen sich auch keine abhängigen Sichten ändern.
- Blockade durch Konflikt oder Regelverletzung: Wenn eine Aktion wegen Ãœberschneidung oder anderer Regeln blockiert wird, wird nichts gespeichert, und keine abhängige Sicht darf einen veränderten Zustand anzeigen.

## Ergebnis

Der Termin ist in allen relevanten Sichten konsistent sichtbar oder nicht sichtbar, abhängig vom Ergebnis der Aktion.

Das bedeutet insbesondere: Das Mitarbeiterformular zeigt den Termin in der Mitarbeiter-Terminliste für alle dem Termin aktuell zugeordneten Mitarbeiter, und zeigt ihn nicht für Mitarbeiter, die nicht (mehr) zugeordnet sind. Das Projektformular zeigt den Termin in der Projekt-Terminliste des zugeordneten Projekts. Das Kundenformular zeigt den Termin in der Terminliste des Kunden, dem der Termin direkt zugeordnet ist (appointment.customer_id). Wenn der Termin einer Tour zugeordnet ist, zeigt das Tour-Formular den Termin in der Tour-Terminliste, und wenn die Tourzuordnung entfernt wurde, ist der Termin in dieser Tour-Sicht nicht mehr sichtbar.

