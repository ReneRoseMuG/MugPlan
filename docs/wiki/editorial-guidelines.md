# Redaktionsregeln

## Führende Quelle

Das Repo ist die führende redaktionelle Quelle.


## Feature-Vorlage

Jedes Feature verwendet diese Abschnitte:

- Ziel / Zweck
- Fachliche Beschreibung
- Regeln & Randbedingungen
- Use Cases
- Backlogs
- Architektur & Kontext
- Entscheidungen & Offene Punkte

## Use-Case-Vorlage

Jede Use-Case-Datei verwendet diese Abschnitte:

- Akteur
- Ziel
- Vorbedingungen
- Ablauf
- Alternativen
- Ergebnis

## Backlog-Vorlage

Jede Backlog-Datei verwendet diese Abschnitte:

- Ziel / Zweck
- Fachliche Beschreibung
- Regeln & Randbedingungen

## Aufgaben-Vorlage

Umsetzbare Aufgaben werden unter `docs/wiki/tasks/` geführt. Die lesbare Übersicht unter [Aufgaben](tasks/README.md) enthält nur offene Aufgaben. Pflege- und Strukturregeln stehen unter [Aufgabenpflege](tasks/meta/README.md). Jede Aufgabe verwendet die feste Vorlage aus [Aufgaben-Template](tasks/template.md) und enthält mindestens:

- Metadaten mit Status, Dringlichkeit, Thema, Typ, Quelle, Verantwortlichkeit und Journalbezug
- Beziehungen zu Features, Use Cases, Entscheidungen und weiteren Bezügen
- Ziel
- Ausgangslage
- Umfang
- Umsetzungshinweise
- Anhänge
- Blocker und offene Fragen
- Abschluss

Abgeschlossene oder verworfene Aufgaben werden aus der offenen Übersicht entfernt und nach `docs/wiki/tasks/closed/` verschoben.

## Journal-Vorlage

Das Wiki-Journal unter `docs/wiki/journal/` ersetzt ab 07.05.26 neue Auftragslogs. Pflegehinweise stehen unter [Journalpflege](journal/meta/README.md). Der Ordner `logs/` bleibt historischer Altbestand.

Architektur- und Designentscheidungen bleiben unter `docs/wiki/decisions/`. Eine Decision wird erst dann als Aufgabe übertragen, wenn ein konkreter Umsetzungspfad oder eine nachverfolgbare Arbeitsliste vorliegt.

## Datums- und Encoding-Regeln

Sichtbare, menschenlesbare Datumsangaben verwenden `dd.MM.yy`. ISO-Daten sind nur in technischen Kontexten wie Dateinamen, IDs, URLs oder maschinenlesbaren Werten zulässig. Deutsche Umlaute und `ß` werden als echte Zeichen geschrieben.
