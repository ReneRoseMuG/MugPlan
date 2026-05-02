# UC 09/18: Notiz am Kunde bearbeiten

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../feature.md)
- Notion-Quelle: https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Titel oder Inhalt einer bestehenden Notiz ändern, um Informationen zu aktualisieren oder zu korrigieren.

## Vorbedingungen

- Der Kunde existiert.
- Dem Kunden ist mindestens eine Notiz zugeordnet.
- Der Akteur besitzt Änderungsrechte.

## Ablauf

1. Der Akteur öffnet einen bestehenden Kunden im Kundenformular.
2. Der Akteur navigiert zum Bereich „Notizen".
3. Der Akteur wählt eine Notiz und klickt auf „Bearbeiten" oder doppelklickt die Notiz.
4. Das System öffnet die Notiz im Bearbeitungsmodus.
5. Der Akteur ändert Titel und/oder Inhalt.
6. Der Akteur speichert die Änderungen.
7. Das System prüft, dass Titel und Inhalt noch vorhanden sind.
8. Das System speichert die Änderungen.
9. Das System aktualisiert die Anzeige der Notiz in der Notizenliste.

## Alternativen

- Titel oder Inhalt wird gelöscht: Das System blockiert das Speichern.
- Abbruch: Der Akteur bricht ab. Die Notiz bleibt unverändert.

## Ergebnis

Die Notiz ist mit den geänderten Daten gespeichert. Die aktualisierte Notiz wird in der Notizenliste des Kunden angezeigt.
