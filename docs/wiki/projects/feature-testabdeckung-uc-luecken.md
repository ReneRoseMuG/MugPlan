# Feature-Testabdeckung, UC-Lücken und Präzisierungen

Dieses Projekt bündelt Aufgaben, die gezielt Testabdeckung, Use-Case-Lücken, fachliche Präzisierungen und Regressionserkennung verbessern. Es ist als dauerhafte Projektklammer angelegt, weil weitere Aufgaben dieses Typs ergänzt werden können.

## Metadaten

- ID: P-02
- Status: offen
- Dringlichkeit: Hoch
- Masteraufgabe: [Feature-Testabdeckung, UC-Lücken und Präzisierungen koordinieren](../tasks/feature-testabdeckung-uc-luecken-koordinieren.md)
- Erstellt: 09.05.26

## Ziel

Das Projekt soll Feature-Testlücken, UC-Lücken und fachliche Präzisierungen sichtbar bündeln und priorisieren, ohne bestehende Aufgaben in fachlich andere Themen umzudeuten. Die Masteraufgabe koordiniert Reihenfolge, Abdeckungsebene und offene Fachentscheidungen; die Einzelaufgaben bleiben für konkrete Features, Testinfrastruktur oder klar abgegrenzte Präzisierungen zuständig.

## Masteraufgabe

- [Feature-Testabdeckung, UC-Lücken und Präzisierungen koordinieren](../tasks/feature-testabdeckung-uc-luecken-koordinieren.md)

## Einzelaufgaben

### Feature-Testabdeckung

- [FT-01, FT-04 und FT-33: Testabdeckung und UC-Lücken schließen](../tasks/ft01-ft04-ft33-testabdeckung-uc-luecken.md)
- [FT-02 Projekte: Test-Lücken schließen](../tasks/ft02-projekte-testluecken-schliessen.md)
- [FT-19 Attachment-Testlücken schließen](../tasks/ft19-attachment-testluecken.md)
- [FT-26 Reports: verbleibende Testabdeckung schließen](../tasks/ft26-reports-testabdeckung.md)
- [FT-34 Kalendermarker: Testlücken schließen](../tasks/ft34-kalendermarker-testluecken.md)

### Fachliche Präzisierungen

- [Storno historischer Termine fachlich entscheiden](../tasks/storno-historischer-termine-fachlich-entscheiden.md)
- [Systemgesteuerte Termin-Workflows gezielt generalisieren](../tasks/systemgesteuerte-termin-workflows-generalisieren.md)
- [Termintabellen in Formularen vereinheitlichen](../tasks/termintabellen-in-formularen-vereinheitlichen.md)

### Testinfrastruktur

- [Stryker Test Runner isoliert einführen](../tasks/stryker-test-runner.md)

## Abgrenzung

Das Projekt ersetzt keine Testsuite-Aufträge und führt keine Tests automatisch aus. Jede Einzelaufgabe muss selbst entscheiden, welche Ebene fachlich belastbar ist: Unit, Integration, API, Browser-E2E oder ergänzende Dokumentationskorrektur.

Nicht aufgenommen bleiben reine Build-, Cache-, DB-Safety-, Performance- oder konkrete Refactoring-Aufgaben, solange sie keine unmittelbare Testlücke, UC-Klärung oder fachliche Präzisierung bündeln.

## Beziehungen

- Aufgaben: [Aufgabenübersicht](../tasks/README.md)
- Entscheidungen: [W-08 - Storno historischer Termine](../decisions/w-08-storno-historischer-termine.md) · [W-09 - Systemgesteuerte Termin-Workflows](../decisions/w-09-systemgesteuerte-termin-workflows.md) · [W-11 - Termintabellen in Formularen](../decisions/w-11-termintabellen-in-formularen.md) · [W-16 - Stryker Test Runner](../decisions/w-16-stryker-test-runner.md) · [W-19 - FT-01, FT-04 und FT-33: Testabdeckung und UC-Lücken](../decisions/w-19-ft01-ft04-ft33-testabdeckung-und-uc-luecken.md) · [W-21 - FT-26 Reports: verbleibende Testabdeckung](../decisions/w-21-ft26-reports-testabdeckung.md)
