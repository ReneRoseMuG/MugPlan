# UC 01/19: Notiz von Termin entfernen

## Metadaten

- Feature: [FT (01): Kalendertermine](../feature.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Eine Notiz vom Termin entfernen, ohne dass dies Auswirkungen auf andere Termin-Daten oder andere Notizen hat.

## Vorbedingungen

- Der Termin existiert.
- Dem Termin ist mindestens eine Notiz zugeordnet.

## Ablauf

1. Der Akteur öffnet einen bestehenden Termin im Terminformular.
2. Der Akteur navigiert zum Bereich „Notizen".
3. Der Akteur wählt eine Notiz und klickt auf „Entfernen" oder eine Delete-Action.
4. Optional: Das System fordert eine Bestätigung an.
5. Der Akteur bestätigt das Löschen.
6. Das System entfernt die Zuordnung zwischen Termin und Notiz.
7. Das System aktualisiert die Notizenliste und die Notiz ist nicht mehr sichtbar.

## Alternativen

- Abbruch: Der Akteur bricht ab. Die Notiz bleibt dem Termin zugeordnet.

## Ergebnis

Die Notiz ist vom Termin entfernt. Die Notiz selbst bleibt in der Datenbank bestehen (sofern sie nicht anderswo zugeordnet ist). Der Termin und alle anderen Termine sind unverändert.
