# Auftragsliste, Druckvorschau und Report-Öffnen

## Zweck

Abschlusslog für den Arbeitsbranch rund um die neue Auftragsliste, die Wiederverwendung der Report-Karte, das Öffnen der Reports im aktuellen oder neuen Tab sowie die nachträglichen Korrekturen an Layout, Druckvorschau und Kategorien.

## Scope

- Neuer Report `Auftragsliste` über Contract, Serverkette, Frontend-Panel, Persistenz und Kartenansicht
- Shortcode-Unterstützung und nutzbare Produkt- sowie Komponentenkategorie-Filter
- Wiederverwendete Report-Karte für Auftragsliste und Produktionsplanung
- Öffnen der drei Reports im aktuellen Kontext oder isoliert in einem neuen Tab
- Browser-, Unit- und Integrationstests für Report-Öffnen, Auftragsliste und Drucklogik
- Mehrere UI- und Druckkorrekturen an Header, Body, Footer, Schriftgrößen, Range-Anzeige und Druckformat

## Technische Entscheidungen

- Die Auftragsliste wurde als eigener Report-Typ mit eigenem Endpoint und eigener USER-Settings-Persistenz umgesetzt.
- Für die Kacheln wurde die aus der Produktionsplanung extrahierte Report-Karte verallgemeinert, statt ein drittes Layout parallel zu pflegen.
- Das Öffnen in einem neuen Tab nutzt eine gemeinsame Standalone-Reports-Route mit URL-basiertem Wiederaufbau des Reportzustands.
- Die Auftragslisten-Druckvorschau wurde auf ein eigenes Hochformat umgestellt und nicht auf dem Landscape-Standard der anderen Druckpfade belassen.
- Die Seitenbelegung der Auftragslisten-Druckvorschau wurde zuletzt nicht mit Platzhalterkarten, sondern über ein enger kalibriertes Höhenmodell der echten Karten korrigiert.

## Betroffene Dateien

- `shared/routes.ts`
- `server/routes/reportsRoutes.ts`
- `server/controllers/reportsController.ts`
- `server/services/reportsService.ts`
- `server/repositories/reportsRepository.ts`
- `server/settings/registry.ts`
- `server/services/userSettingsService.ts`
- `client/src/App.tsx`
- `client/src/pages/StandaloneDomainViews.tsx`
- `client/src/hooks/useSettings.ts`
- `client/src/components/ReportsPage.tsx`
- `client/src/components/reports/ReportConfigPanel.tsx`
- `client/src/components/reports/ReportOpenToggle.tsx`
- `client/src/components/reports/ReportProjectCard.tsx`
- `client/src/components/reports/ProduktionsplanungProjectCard.tsx`
- `client/src/components/reports/AuftragslisteProjectCard.tsx`
- `client/src/components/reports/AuftragslistePrintLayout.tsx`
- `client/src/components/print/PrintPreviewDialog.tsx`
- `client/src/components/print/PrintDocumentRoot.tsx`
- `client/src/lib/auftragsliste-print-model.ts`
- `tests/integration/server/reports.auftragsliste.integration.test.ts`
- `tests/integration/server/userSettings.reportsProduktionsplanung.persistence.test.ts`
- `tests/e2e-browser/reports.open-modes.browser.e2e.spec.ts`
- `tests/unit/settings/reportsAuftragsliste.registry.test.ts`
- `tests/unit/settings/useSettings.auftragsliste.test.ts`
- `tests/unit/lib/auftragsliste-print-model.test.ts`
- `tests/unit/ui/printComponents.primitives.test.tsx`
- `tests/unit/ui/reportsPage.behavior.test.tsx`
- `tests/unit/ui/reportsPage.wiring.test.tsx`
- `tests/unit/ui/auftragslisteProjectCard.wiring.test.tsx`
- `tests/unit/ui/auftragslistePrintLayout.wiring.test.tsx`
- `docs/TEST_MATRIX.md`

## Prüfschritte

Im Verlauf wurden gezielt unter anderem diese Kommandos erfolgreich ausgeführt:

- `npm run test:unit -- tests/unit/ui/reportsPage.behavior.test.tsx tests/unit/ui/reportsPage.wiring.test.tsx`
- `npm run test:e2e:browser -- tests/e2e-browser/reports.open-modes.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/reports.ft26.browser.e2e.spec.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/reports.auftragsliste.integration.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/userSettings.reportsProduktionsplanung.persistence.test.ts`
- `npm run test:unit -- tests/unit/ui/auftragslisteProjectCard.wiring.test.tsx tests/unit/ui/auftragslistePrintLayout.wiring.test.tsx`
- `npm run test:unit -- tests/unit/ui/printComponents.primitives.test.tsx tests/unit/ui/auftragslistePrintLayout.wiring.test.tsx tests/unit/ui/reportsPage.wiring.test.tsx`
- `npm run test:unit -- tests/unit/lib/auftragsliste-print-model.test.ts tests/unit/ui/auftragslistePrintLayout.wiring.test.tsx tests/unit/ui/reportsPage.wiring.test.tsx`
- `npm run check`

## Bekannte Einschränkungen

- Die Auftragslisten-Druckseiten werden über ein clientseitiges Höhenmodell belegt. Wenn sich Kartenhöhe oder Typografie künftig deutlich ändern, muss dieses Modell erneut nachgezogen werden.
- Nicht jeder während der Umsetzung einzeln ausgeführte Zwischen-Testlauf wurde zum Abschluss noch einmal als voller Testlauf wiederholt.
