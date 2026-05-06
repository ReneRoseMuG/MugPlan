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

Umsetzbare Aufgaben werden unter `docs/wiki/tasks/` geführt. Jede Aufgabe verwendet die feste Vorlage aus [Aufgaben-Template](tasks/template.md) und enthält mindestens:

- Metadaten mit Status, Priorität, Typ, Quelle und Verantwortlichkeit
- Beziehungen zu Features, Use Cases, Entscheidungen und weiteren Bezügen
- Ziel
- Ausgangslage
- Umfang
- Umsetzungshinweise
- Anhänge
- Blocker und offene Fragen
- Abschluss

Architektur- und Designentscheidungen bleiben unter `docs/wiki/decisions/`. Eine Decision wird erst dann als Aufgabe übertragen, wenn ein konkreter Umsetzungspfad oder eine nachverfolgbare Arbeitsliste vorliegt.

## Datums- und Encoding-Regeln

Sichtbare, menschenlesbare Datumsangaben verwenden `dd.MM.yy`. ISO-Daten sind nur in technischen Kontexten wie Dateinamen, IDs, URLs oder maschinenlesbaren Werten zulässig. Deutsche Umlaute und `ß` werden als echte Zeichen geschrieben.
