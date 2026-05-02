# W-16 - Stryker Test Runner isoliert einführen

## Metadaten

- Status: offen
- Priorität: Mittel
- Feature: Testinfrastruktur und lokale Qualitätsanalyse
- Entdeckt: 02.05.26
- Art: Technische Schuld

## Befund

Für Mutation Testing soll ein erster StrykerJS-Lauf in der bestehenden Codebasis eingerichtet werden, aber strikt getrennt von Audit-, Check-, Build- und normalen Test-Runs. Ziel ist kein Umbau der Testpipeline, sondern ein kontrollierter, bewusst manuell startbarer Einstieg aus VS Code mit eigener Konfiguration, eigenem npm-Skript und kleinem, praktikablem Zielbereich.

## Optionen

- A) Stryker direkt breit in bestehende Test- oder CI-Abläufe einkoppeln
- B) Stryker als lokale, isolierte Entwicklerfunktion einführen: eigene Konfiguration, eigener Run-Befehl, optional klare VS-Code-Task und ein klein abgegrenzter erster Mutationsbereich
- C) Mutation Testing vorerst gar nicht anfassen und bei klassischer Testabdeckung bleiben

## Auswirkungen eines Eingriffs

Variante B schafft einen sicheren Einstieg in Mutation Testing, ohne bestehende Qualitätssicherungsroutinen zu verändern oder zu verlangsamen. Betroffen sind vor allem lokale Dev-Dependencies, eine eigenständige Stryker-Konfiguration, ein dediziertes npm-Skript und gegebenenfalls VS-Code-Tasking. Die bestehende Testarchitektur soll semantisch unverändert bleiben; Stryker wird nur bewusst manuell ausgeführt.

## Schadenspotential

Mittel. Das Risiko liegt weniger in Produktionslogik als in versehentlicher Kopplung an bestehende Test-, Check- oder CI-Pfade, in einer zu großen ersten Mutationsfläche oder in einem schwer benutzbaren Setup. Ein kleiner isolierter Einstieg begrenzt diese Risiken deutlich.

## Vorgeschlagene Maßnahme

Variante B als bevorzugten Pfad behandeln. Nach Analyse der tatsächlich genutzten Test-Runner einen kleinen, fachlich sinnvollen Startbereich wählen, Stryker lokal mit passendem Plugin einführen, ein klar benanntes manuelles npm-Skript anlegen und den Startweg in VS Code eindeutig dokumentieren oder per Task bereitstellen. Bestehende Test-, Audit- und Build-Abläufe dürfen nicht verändert werden.

## Quelle

- Notion: https://www.notion.so/34bda094354e8009a561fc692e2f7d6d
