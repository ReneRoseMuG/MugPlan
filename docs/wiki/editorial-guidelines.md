# Redaktionsregeln

## Führende Quelle

Das Repo ist nach der Migration die führende redaktionelle Quelle. Notion bleibt als Quellenreferenz in den Metadaten erhalten.

## Importregeln

- Jedes Feature wird vollständig übernommen, sobald der vollständige Notion-Body verfügbar ist.
- Der Notion-Bereich `Projekt Management` wird nicht als eigener Abschnitt in `feature.md` übernommen.
- Inhalte aus `Projekt Management` werden nur übernommen, wenn sie fachlich relevant sind, zum Beispiel Backlog-Verweise, Teststrategie-Links oder Quellenhinweise.
- Jedes Feature wird auf die Feature-Vorlage gehoben.
- Jeder Use Case wird in eine eigene Datei übernommen und auf die Use-Case-Vorlage gehoben.
- Fehlende Vorlagenabschnitte werden mit `Nicht angegeben in der Notion-Quelle.` markiert.
- Unklare fachliche Beziehungen werden nicht geraten, sondern als offene Frage dokumentiert.

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

## Datums- und Encoding-Regeln

Sichtbare, menschenlesbare Datumsangaben verwenden `dd.MM.yy`. ISO-Daten sind nur in technischen Kontexten wie Dateinamen, IDs, URLs oder maschinenlesbaren Werten zulässig. Deutsche Umlaute und `ß` werden als echte Zeichen geschrieben.
