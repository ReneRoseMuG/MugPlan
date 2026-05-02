# UC 01/18: Notiz am Termin bearbeiten

## Metadaten

- Feature: [FT (01): Kalendertermine](../feature.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Titel oder Inhalt einer bestehenden Notiz ändern, um Informationen zu aktualisieren oder zu korrigieren.

## Vorbedingungen

- Der Termin existiert.
- Dem Termin ist mindestens eine Notiz zugeordnet.

## Ablauf

1. Der Akteur öffnet einen bestehenden Termin im Terminformular.
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

Die Notiz ist mit den geänderten Daten gespeichert. Die aktualisierte Notiz wird in der Notizenliste des Termins angezeigt.
