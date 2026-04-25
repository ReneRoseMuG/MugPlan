# Log: Doc-Extract-Fallbeispiele als vollständige Fixture-Suite

## Zweck

Dieses Log dokumentiert den Ausbau der bestehenden Doc-Extract-Regressionstests für mehrere reale PDF-Fallbeispiele aus `tests/fixtures/Doc Extract`.

Ziel war, für jedes hinterlegte Fallbeispiel einen vollständigen `project_form`-Extract über den echten Verarbeitungsweg auszuführen und testseitig auszuwerten:

- wurden die relevanten Daten erkannt,
- fehlen erwartete Felder sauber im Feldreport,
- treten Warnings oder harte Fehler auf.

## Scope

- Übernahme der vorhandenen PDF-Fallbeispiele aus dem bisherigen Arbeitsstand in den neuen Arbeitsbranch
- Ausbau des bestehenden Integrationstests für Projekt-Fixtures zu einer parametrisierten Suite
- Absicherung der Fallvarianten:
  - fehlender Personenname bei Firmenkunde
  - `company` statt Personenname
  - zusätzlicher Firmenname neben Person
  - unterschiedliche Telefonlabels
  - Ausland / abweichendes Land
- Aktualisierung von `docs/TEST_MATRIX.md` für die erweiterte Extract-Abdeckung

Nicht Teil des Scopes:

- keine Änderung an Extract-Parsern oder Produktivlogik
- keine Erweiterung der API-Routen
- keine UI-Anpassung

## Technische Entscheidungen

- Die neuen Fallbeispiele wurden nicht über Mocks, sondern über den echten `extractFromPdf`-Pfad abgesichert.
- Die bestehende Datei `tests/integration/extraction/documentProcessing.project.fixture.test.ts` wurde als zentraler Einstiegspunkt beibehalten, statt eine parallele Teststruktur einzuführen.
- Die Erwartungen wurden aus dem aktuellen realen Extract-Verhalten je Fixture abgeleitet, damit nur beobachtbares Verhalten regressionssicher festgeschrieben wird.
- Warnings und harte Fehler werden pro Fixture explizit mitgeprüft; aktuell müssen alle Beispiele warning-frei und fehlerfrei durchlaufen.

## Betroffene Dateien

- `tests/integration/extraction/documentProcessing.project.fixture.test.ts`
- `tests/fixtures/Doc Extract/BSP CompanyName Only.pdf`
- `tests/fixtures/Doc Extract/BSP Country.pdf`
- `tests/fixtures/Doc Extract/BSP Customer CompanyName.pdf`
- `tests/fixtures/Doc Extract/BSP Customer.pdf`
- `tests/fixtures/Doc Extract/BSP Mobil.pdf`
- `tests/fixtures/Doc Extract/BSP Tel.pdf`
- `tests/fixtures/Doc Extract/BSP default.pdf`
- `docs/TEST_MATRIX.md`

## Ergebnis der Fallauswertung

Alle sieben Fallbeispiele laufen aktuell ohne harte Fehler und ohne Warnings durch.

Beobachtete Besonderheiten:

- `BSP CompanyName Only.pdf`
  - Firmenkunde wird korrekt erkannt
  - `firstName` und `lastName` fehlen erwartungsgemäß im Feldreport
- `BSP Customer CompanyName.pdf`
  - Person und zusätzlicher Firmenname werden korrekt erkannt
  - `phone` fehlt erwartungsgemäß im Feldreport
- `BSP Country.pdf`
  - Ausland mit `Luxemburg` und `1 Tommesknapp` wird korrekt erkannt
- `BSP Customer.pdf`, `BSP Mobil.pdf`, `BSP Tel.pdf`, `BSP default.pdf`
  - Personen- und Adressdaten werden korrekt erkannt
  - `company` fehlt erwartungsgemäß im Feldreport

## Durchgeführte Prüfung

Seriell ausgeführt:

- `npm run test:integration -- --reporter=verbose tests/integration/extraction/documentProcessing.project.fixture.test.ts`

Ergebnis:

- 1 Testdatei grün
- 7 Einzeltests grün
- keine Warnings
- keine harten Extract-Fehler

## Abschlussstatus

Der Arbeitsstand ist bereit zum Commit. Die Testlandschaft deckt jetzt alle vorhandenen PDF-Fallbeispiele im Unterordner `tests/fixtures/Doc Extract` als vollständige `project_form`-Extract-Regression ab.
