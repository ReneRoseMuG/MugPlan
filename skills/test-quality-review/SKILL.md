---
name: test-quality-review
description: Use in the MuGPlan / Projekt Manager repository when the user asks for a test analysis, test quality review, test coverage review, test strategy compliance check, structured report on the test suite, "Testanalyse", "Testbericht", "Testqualität prüfen", "Testabdeckung prüfen", or "Tests analysieren". This is a report workflow and must not change code, tests, config, or documentation unless separately requested.
---

# Test Quality Review

Nutze diesen Skill für eine reproduzierbare Qualitäts- und Abdeckungsanalyse des Testbestands. Der Auftrag ist ein reiner Report, solange der Nutzer nicht ausdrücklich Änderungen verlangt.

`agents.md` bleibt verbindlich. Nutze zusätzlich `projekt-manager-test-entwurfsleitplanken`, wenn Teststrategie oder Testqualität bewertet werden.

## Vorbereitung

1. Klassifiziere den Auftrag als reinen Analyse-, Audit- oder Test-Report.
2. Ändere keine Code-, Test-, Konfigurations- oder Dokumentationsdateien.
3. Erfasse alle Testdateien unter `tests/` mit passenden Suchbefehlen wie `rg --files tests`.
4. Zähle Testdateien und Testfunktionen pro Ebene, nicht nur Dateien.

Typische Ebenen:

- `tests/unit/`
- `tests/integration/`
- `tests/browser/`
- `tests/fixtures/`
- `tests/setup/`
- `tests/.runtime/` als generierte Testlaufdaten, nicht als Quelltestbestand

Passe die Ebenen an die tatsächlich vorhandene Struktur an.

## Prüfbereiche

### Teststrategie-Konformität

Prüfe gezielt:

- Unit-Tests mit echten DB-Verbindungen oder echten Serverinstanzen.
- Tests mit Zugriff auf produktive oder nicht isolierte Datenpfade.
- Integrationstests ohne echte Daten, echte Services oder passende DB-/FS-Isolation.
- Browser-/E2E-Tests mit gestubbten Hooks, API-Clients oder Berechtigungen.
- undokumentierte `skip`-Tests.
- fehlende oder unvollständige Test-Scope-Kommentare, soweit `agents.md` sie verlangt.

### Rollen Und Permissions

Prüfe bei geschützten Routen und Workflows:

- positiver Fall mit passender Berechtigung,
- negativer Fall ohne ausreichende Berechtigung,
- Schreiboperationen mit Reader- oder Custom-Role-Negativfall,
- UI-Gating plus serverseitige Verweigerung, wo beides relevant ist.

### Fachliche Abdeckung

Bewerte, ob Kerndomänen und Querschnittsbereiche durch sinnvolle Tests abgedeckt sind. Verwende die tatsächlichen Projektstrukturen statt starrer Domänenlisten, wenn das Repository abweicht.

### Fixture-, Dump- Und Migrationsnähe

Prüfe, ob Test-Fixtures, Truncate-/Cleanup-Helper, Dump- oder Seed-Tests zu den aktuellen Schemas und Migrationen passen. Fehlende Tabellen, veraltete Felder oder Schema-Mismatches sind hohe Risiken.

### Methodische Qualität

Suche nach schwachen Mustern:

- `toBeTruthy()` oder `toBeDefined()` statt konkreter fachlicher Erwartung,
- mehrere akzeptierte Statuscodes für eine Route ohne Begründung,
- Snapshots ohne fachliche Aussage,
- Filtertests ohne Gegenbeispiele,
- Permission-Tests mit gestubbtem Auth-Hook,
- Integrationstests mit gemocktem Repository oder Service.

## Bericht

Gib den Bericht im Chat aus, sofern der Nutzer kein Artefakt verlangt. Verwende sichtbare Datumsangaben im Format `dd.MM.yy`.

Struktur:

```markdown
# Test Quality Review
**Datum:** <dd.MM.yy>

## Kennzahlen
| Ebene | Dateien | Testfunktionen |
|---|---:|---:|

## Befunde Nach Schweregrad

### Kritisch

### Hoch

### Mittel

### Niedrig

## Empfehlungen

## Offene Fragen Oder Grenzen Der Analyse
```

Findings stehen vor Zusammenfassung. Jede Feststellung nennt Datei, Linie oder Suchbasis, soweit möglich.

## Änderungsaufträge

Wenn der Nutzer Änderungsaufträge wünscht, formuliere pro kritischem oder hohem Befund einen eigenständigen Auftrag. Mittlere Befunde können gebündelt werden. Niedrige Befunde bleiben in der Gesamtliste.

Erzeuge keine Projekt-Manager-Objekte ohne ausdrücklichen Auftrag.
