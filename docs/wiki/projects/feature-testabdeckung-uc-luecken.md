# Feature-Testabdeckung, UC-Lücken und Präzisierungen

Dieses Projekt bündelte Aufgaben, die gezielt Testabdeckung, Use-Case-Lücken, fachliche Präzisierungen und Regressionserkennung verbessern. Es ist abgeschlossen; die geschlossenen Einzelaufgaben bleiben als Nachweis für die bearbeiteten Testlücken erhalten.

## Metadaten

- ID: P-02
- Status: abgeschlossen
- Dringlichkeit: Hoch
- Masteraufgabe: [Feature-Testabdeckung, UC-Lücken und Präzisierungen koordinieren](../tasks/closed/feature-testabdeckung-uc-luecken-koordinieren.md)
- Erstellt: 09.05.26

## Ziel

Das Projekt hat Feature-Testlücken, UC-Lücken und fachliche Präzisierungen sichtbar gebündelt und priorisiert, ohne bestehende Aufgaben in fachlich andere Themen umzudeuten. Die Masteraufgabe koordinierte Reihenfolge, Abdeckungsebene und offene Fachentscheidungen; die Einzelaufgaben dokumentieren die konkreten Testabschlüsse.

## Masteraufgabe

- [Feature-Testabdeckung, UC-Lücken und Präzisierungen koordinieren](../tasks/closed/feature-testabdeckung-uc-luecken-koordinieren.md)

## Einzelaufgaben

### Feature-Testabdeckung

- [FT-01, FT-04 und FT-33: Testabdeckung und UC-Lücken schließen](../tasks/closed/ft01-ft04-ft33-testabdeckung-uc-luecken.md)
- [FT-02 Projekte: Test-Lücken schließen](../tasks/closed/ft02-projekte-testluecken-schliessen.md)
- [FT-19 Attachment-Testlücken schließen](../tasks/closed/ft19-attachment-testluecken.md)
- [FT-26 Reports: verbleibende Testabdeckung schließen](../tasks/closed/ft26-reports-testabdeckung.md)
- [FT-34 Kalendermarker: Testlücken schließen](../tasks/closed/ft34-kalendermarker-testluecken.md)

## Abschluss

P-02 wurde am 14.05.26 abgeschlossen. Die testseitigen Lücken wurden in den Einzelaufgaben geschlossen; FT-34 wurde verworfen, weil der referenzierte Ursprungsauftrag leer war und die sieben Punkte nicht belastbar rekonstruiert werden konnten. Die verbliebenen Nicht-Testpunkte wurden fachlich entschieden: Kundenlöschung bleibt außerhalb des Produktumfangs, physische Dateilöschung bei Projektlöschung bleibt unverändert, und für die Auftragsliste wird kein eigener Print-Preview-Endpunkt ergänzt.

Verifikation: Die relevanten Integrationstests liefen gemeinsam mit 97 bestandenen Tests. Die relevanten Unit-Tests liefen gemeinsam mit 21 bestandenen Tests. Die geänderten Browser-E2E-Specs liefen gemeinsam mit 8 bestandenen Tests. Details stehen im Journal vom 14.05.26 und in den abgeschlossenen Aufgabendateien.

## Abgrenzung

Das Projekt ersetzte keine Testsuite-Aufträge und führte keine Tests automatisch aus. Jede Einzelaufgabe entschied selbst, welche Ebene fachlich belastbar ist: Unit, Integration, API, Browser-E2E oder ergänzende Dokumentationskorrektur.

Nicht aufgenommen bleiben reine Build-, Cache-, DB-Safety-, Performance- oder konkrete Refactoring-Aufgaben, solange sie keine unmittelbare Testlücke, UC-Klärung oder fachliche Präzisierung bündeln.

## Beziehungen

- Aufgaben: [Aufgabenübersicht](../tasks/README.md)
- Entscheidungen: [W-08 - Storno historischer Termine](../decisions/w-08-storno-historischer-termine.md) · [W-19 - FT-01, FT-04 und FT-33: Testabdeckung und UC-Lücken](../decisions/w-19-ft01-ft04-ft33-testabdeckung-und-uc-luecken.md) · [W-21 - FT-26 Reports: verbleibende Testabdeckung](../decisions/w-21-ft26-reports-testabdeckung.md)
- Journal: [14.05.26 - P02: Feature-Testabdeckung und UC-Lücken abgeschlossen](../journal/14-05-26-p02-feature-testabdeckung-uc-luecken-abgeschlossen.md)
