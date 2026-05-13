# W-23 - Wiki-Projekte ohne verpflichtende Masteraufgabe

## Metadaten

- Status: entschieden
- Priorität: Mittel
- Feature: Wiki-Projektstruktur
- Entdeckt: 14.05.26
- Art: Design-Entscheidung

## Befund

Wiki-Projekte bündeln Aufgaben und Arbeitsstände, sind aber nicht zwingend selbst über eine Masteraufgabe gesteuert. Eine verpflichtende Masteraufgaben-Spalte in der Projektübersicht stellt diese Struktur zu eng dar und erzeugt leere oder künstliche Pflichtfelder.

## Entscheidung

Projekte haben Aufgaben, aber nicht zwingend eine Masteraufgabe. Die Projektübersicht unterscheidet offene und geschlossene Projekte in zwei Tabellen und zeigt dort nur ID, Projekt, Status und Anzahl der Aufgaben. Masteraufgaben dürfen weiterhin in einzelnen Projektseiten dokumentiert werden, wenn sie fachlich sinnvoll sind.

## Auswirkungen

Die Wiki-Projektübersicht wird lesbarer und bildet abgeschlossene Projektklammern getrennt von laufenden Arbeitssträngen ab. Bestehende Projektseiten und der Relationsindex können optionale Masteraufgaben weiterhin speichern; sie sind nur nicht mehr Teil der Übersichtstabelle.

## Vorgeschlagene Maßnahme

Erledigt am 14.05.26 durch Anpassung der Projektübersicht, der Projekt-README und des Wiki-Generators.
