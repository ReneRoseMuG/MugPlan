# UC 09/19: Notiz von Kunde entfernen

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../feature.md)
- Notion-Quelle: https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Eine Notiz vom Kunden entfernen, ohne dass dies Auswirkungen auf andere Kunden-Daten oder andere Notizen hat.

## Vorbedingungen

- Der Kunde existiert.
- Dem Kunden ist mindestens eine Notiz zugeordnet.
- Der Akteur besitzt Änderungsrechte.

## Ablauf

1. Der Akteur öffnet einen bestehenden Kunden im Kundenformular.
2. Der Akteur navigiert zum Bereich „Notizen".
3. Der Akteur wählt eine Notiz und klickt auf „Entfernen" oder eine Delete-Action.
4. Optional: Das System fordert eine Bestätigung an.
5. Der Akteur bestätigt das Löschen.
6. Das System entfernt die Zuordnung zwischen Kunde und Notiz.
7. Das System aktualisiert die Notizenliste und die Notiz ist nicht mehr sichtbar.

## Alternativen

- Abbruch: Der Akteur bricht ab. Die Notiz bleibt dem Kunden zugeordnet.

## Ergebnis

Die Notiz ist vom Kunden entfernt. Die Notiz selbst bleibt in der Datenbank bestehen (sofern sie nicht anderswo zugeordnet ist). Der Kunde und alle anderen Kunden sind unverändert.
