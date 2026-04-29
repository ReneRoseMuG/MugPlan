# Auftragslog: Fass-Sauna Projektnamen korrigieren

## Zweck

Einmalige Korrektur von Projektnamen in der Dev-Datenbank auf Basis der in `project_order_items` referenzierten Produkte aus der Produktkategorie `Fass Saunen`.

Ziel war, dass der Projektname dem konkret zugeordneten Sauna-Modell (`products.name`) entspricht, ohne andere fachliche Daten zu verändern.

## Scope

- Nur Dev-Datenbank `mugplan_dev`
- Keine Produktionsdaten
- Keine dauerhafte App-Implementierung
- Zwei Ausführungsläufe:
  - Hauptlauf für alle abweichenden `Fass Saunen`-Projekte
  - Nachlauf für Restfälle nach Umbenennung des Produkts `Premium` auf `Premium IV`

## Technische Entscheidungen

- Die Grundmenge wurde über `project_order_items.product_id -> products.id -> product_categories.id` bestimmt.
- Der Zielwert für den Projektnamen wurde aus `products.name` des zugeordneten Produkts gelesen.
- Vor und nach jedem Lauf wurde ein vollständiger Dump erzeugt.
- Der Dump-Vergleich war streng:
  - Alle Tabellen außer `projects` mussten unverändert bleiben.
  - In `projects` durften nur `name` und das technisch mitlaufende `updatedAt` bei den tatsächlich geänderten Projekten abweichen.
- Die temporär erstellten Einmalskripte wurden nach Abschluss wieder verworfen und nicht im Repository belassen.

## Ergebnis

- Hauptlauf:
  - 183 Projekte umbenannt
  - 0 übersprungen
  - 0 Fehler
  - Dump-Vergleich erfolgreich
- Nachlauf `Premium IV`:
  - 43 Projekte umbenannt
  - 0 übersprungen
  - 0 Fehler
  - Dump-Vergleich erfolgreich

## Betroffene Dateien

- Nachweis-Reports:
  - [2026-04-29_fass-sauna-projektnamen-dump-check-report.md](/c:/Users/r.rose/repos/Plan/releases/work_version02/logs/2026-04-29_fass-sauna-projektnamen-dump-check-report.md)
  - [2026-04-29_premium-iv-projektnamen-dump-check-report.md](/c:/Users/r.rose/repos/Plan/releases/work_version02/logs/2026-04-29_premium-iv-projektnamen-dump-check-report.md)
- Referenz-Checkliste aus dem Vorlauf:
  - [2026-04-29_fass-sauna-projektnamen-checkliste.md](/c:/Users/r.rose/repos/Plan/releases/work_version02/logs/2026-04-29_fass-sauna-projektnamen-checkliste.md)
- Dumps:
  - [dump_2026-04-29T14-01-20-183Z.zip](/c:/Users/r.rose/repos/Plan/releases/work_version02/backups/dumps/dump_2026-04-29T14-01-20-183Z.zip)
  - [dump_2026-04-29T14-01-23-913Z.zip](/c:/Users/r.rose/repos/Plan/releases/work_version02/backups/dumps/dump_2026-04-29T14-01-23-913Z.zip)
  - [dump_2026-04-29T14-07-25-308Z.zip](/c:/Users/r.rose/repos/Plan/releases/work_version02/backups/dumps/dump_2026-04-29T14-07-25-308Z.zip)
  - [dump_2026-04-29T14-07-29-061Z.zip](/c:/Users/r.rose/repos/Plan/releases/work_version02/backups/dumps/dump_2026-04-29T14-07-29-061Z.zip)

## Hinweise zum Testen

- Die belastbare Prüfung erfolgte nicht über UI-Tests, sondern über vollständige Vorher/Nachher-Dumps.
- Für eine manuelle Nachkontrolle kann in der App stichprobenartig geprüft werden:
  - Projektname in der Projektansicht
  - zugeordnetes Sauna-Modell in der Artikelliste oben links
  - Übereinstimmung zwischen beiden Werten

## Bekannte Einschränkungen

- Das Log dokumentiert den ausgeführten Zustand auf der Dev-Datenbank zum Zeitpunkt der Läufe am 29.04.2026.
- Weitere spätere Änderungen an Produkten oder Projektnamen sind nicht Teil dieses Logs.
- Die temporären Ausführungsskripte wurden bewusst gelöscht; die dauerhaften Nachweise liegen in Reports und Dumps.
