# Workflow: Update Relations

## Zweck

Dieser Workflow aktualisiert Vernetzungs- und Querbeziehungsinformationen eines Features durch Abgleich mit allen anderen Features und der Codebase.

## Eingabe

- Feature-ID, zum Beispiel `FT (02)`

## Ablauf

1. Feature-Datei und alle zugehörigen Use Cases und Backlogs lesen.
2. Alle anderen Feature-Dateien nach direkten und indirekten Referenzen durchsuchen.
3. Entscheidungen und Journal-Einträge nach Featurebezug durchsuchen.
4. Relevante Codebereiche identifizieren und Abhängigkeiten gegenprüfen.
5. Beziehungen in die Kategorien `abhängig von`, `konsumiert von`, `Seiteneffekte`, `verwandte Backlogs`, `offene Entscheidungen` und `bekannte Abweichungen` einsortieren.
6. Unklare Beziehungen als offene Frage markieren.

## Ergebnis

Aktualisiert werden:

- `Architektur & Kontext` im Feature
- `Entscheidungen & Offene Punkte` im Feature
- [Querbeziehungen](../relations.md), falls eine globale Beziehung betroffen ist

## Verbot

Fachliche Beziehungen werden nicht geraten. Bei unklarer Zuordnung bleibt ein sichtbarer offener Punkt stehen.
