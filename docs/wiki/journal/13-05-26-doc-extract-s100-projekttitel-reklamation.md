# 13.05.26 | Implementierung | Doc Extract: S100-Projekttitel für Reklamations-PDFs

## Zusammenfassung

Der Doc-Extract-Projektpfad wurde für Reklamations- und Sonderpositionslisten erweitert. Wenn der Master-Data-Parser keinen Produktmarker findet, sucht der Fallback in der einfachen Positionsliste nach einem Block mit Produktnummer `S100...` bzw. `S 100...` und nutzt diesen Block als Projekttitel.

Damit wird bei `BSP Rekla falsche Reihenfolge.pdf` nicht mehr die Liefermodalität `eigene Anlieferung` als erster Block relevant, sondern der Produktnummernblock `S1004637 ...`. Die Variante mit richtiger Reihenfolge wird ebenfalls über denselben Pfad abgesichert.

## Art der Änderung

- Backend-Parser-Fix im bestehenden deterministischen Doc-Extract-Pfad.
- Testausbau über Unit-, Integration- und Browser-E2E-Ebene.
- Keine DB-Migration, keine neue Abhängigkeit und keine Änderung an Rollen oder Berechtigungen.

## Betroffene Features

- FT21 / FT24: Dokumentextraktion und Projektanlage aus PDF.
- Notion-Feature-Links wurden für diesen Auftrag nicht zusätzlich herangezogen.

## Konkrete Änderungen

- `documentArticleDeterministicParser` erkennt und normalisiert Produktnummernblöcke für die Projekttitel-Ableitung.
- `documentProcessingService` nutzt den neuen S100-Fallback nur dann, wenn der Master-Data-Parser für `project_form` oder `appointment_form` keinen Produktmarker findet.
- Die echten Fixtures `BSP Rekla falsche Reihenfolge.pdf` und `BSP Rekla richtige Reihenfolge.pdf` wurden in die Projekt-Extract-Integrationstests aufgenommen.
- Der bestehende Fixture-Pfad wurde fachlich angepasst: Auch `BSP PLZ.pdf`, `BSP CompanyName Only.pdf` und `BSP Customer CompanyName.pdf` erhalten jetzt konkrete S100-Projekttitel, wenn ein solcher Block vorhanden ist.
- Pro Reklamations-PDF gibt es einen vollständigen Browser-E2E-Pfad: PDF hochladen, Dialogdaten prüfen, übernehmen, Kunde anlegen, Projekt speichern und persistierte Kunden- sowie Projektdaten per API prüfen.

## Tests / Verifikation

- `npm run test:run -- tests/unit/services/documentArticleDeterministicParser.test.ts tests/integration/extraction/documentProcessing.project.fixture.test.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/project-form.create-sidebar-persistence.browser.e2e.spec.ts --grep "renders Doc Extract result dialog fields"`
- `npm run test:e2e:browser -- tests/e2e-browser/project-form.create-sidebar-persistence.browser.e2e.spec.ts --grep "persists customer and project data from BSP Rekla"`
- `npm run check`

Alle genannten Prüfungen liefen erfolgreich ohne Coverage-Lauf.

## Offene Punkte

- Keine fachlichen Restpunkte aus diesem Fix bekannt.
- Der Arbeitsbaum enthielt bereits weitere Wiki-/Package-/Script-Änderungen aus vorherigen Schritten; sie wurden nicht fachlich neu bewertet.
