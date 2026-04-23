# Auftragslog: Auftragsliste Filter und Print

## Zweck

Die bestehende Auftragsliste wurde um zusätzliche Filter für reduzierte Tags und Sauna-Modelle erweitert. Die gefilterte Ergebnismenge sollte konsistent in Overlay, Druckvorschau und Browserdruck ankommen. Zusätzlich wurde die Sortierung auf Tour vor Datum umgestellt und die Tourfarbe in Karten- und Druckkopf sichtbar gemacht. Im Nachgang wurden die Filter-UIs für Auftragsliste und Tourenplan in gebündelte Filterboxen überführt.

## Scope

- Contract-Erweiterung für Auftragsliste-Filter und zusätzliche Response-Daten
- Serverseitige Filterung nach Tags und Sauna-Modell
- Sortierung nach Tour-Logik und Datum
- Tourfarbe in Karten- und Druckansicht
- Persistenz der neuen Auftragslisten-Filter
- Standalone-Übergabe der Filter
- Browser-, Unit- und Integrationstests für Filter-, Druck- und Persistenzpfade
- UI-Nacharbeit: Filterbox für Auftragsliste und Tourenplan

## Technische Entscheidungen

- Die Auftragsliste filtert serverseitig, damit Browseransicht, Druckvorschau und Browserdruck dieselbe Datenbasis verwenden.
- Für die Sauna-Modell-Erkennung wird die gemeinsame Alias-Logik aus `shared/projectArticleList.ts` genutzt. Dadurch werden reale Stammdatenkategorien wie `Fass Saunen` korrekt erkannt; `Sauna Modell` bleibt als Alias kompatibel.
- Die finale Sortierung der Auftragsliste erfolgt nur auf der Ergebnisliste selbst, damit andere Reportpfade nicht unbeabsichtigt mitverändert werden.
- Neue Auftragslisten-Filter werden in den USER-Settings mitpersistiert und in Standalone-URLs mitgeführt.
- Die UI-Filter wurden in begrenzte Boxen zusammengeführt, damit die Panels stabil bleiben und sich an der Höhe des Date-/KW-Blocks orientieren.

## Betroffene Dateien

- `shared/routes.ts`
- `shared/projectArticleList.ts`
- `server/controllers/reportsController.ts`
- `server/services/reportsService.ts`
- `server/repositories/reportsRepository.ts`
- `server/services/userSettingsService.ts`
- `server/settings/registry.ts`
- `client/src/hooks/useSettings.ts`
- `client/src/pages/StandaloneDomainViews.tsx`
- `client/src/components/ReportsPage.tsx`
- `client/src/components/reports/ReportProjectCard.tsx`
- `client/src/components/reports/AuftragslisteProjectCard.tsx`
- `client/src/components/reports/AuftragslistePrintLayout.tsx`
- `client/src/components/reports/TourenplanReportPanel.tsx`
- `tests/unit/settings/useSettings.auftragsliste.test.ts`
- `tests/unit/settings/reportsAuftragsliste.registry.test.ts`
- `tests/unit/lib/auftragsliste-print-model.test.ts`
- `tests/unit/lib/projectArticleList.reports.test.ts`
- `tests/unit/ui/reportsPage.behavior.test.tsx`
- `tests/unit/ui/reportsPage.wiring.test.tsx`
- `tests/unit/ui/auftragslisteProjectCard.wiring.test.tsx`
- `tests/unit/ui/auftragslistePrintLayout.wiring.test.tsx`
- `tests/unit/ui/tourenplanReportPanel.wiring.test.tsx`
- `tests/integration/server/reports.auftragsliste.integration.test.ts`
- `tests/integration/server/userSettings.reportsProduktionsplanung.persistence.test.ts`
- `tests/e2e-browser/reports.ft26.browser.e2e.spec.ts`

## Hinweise zum Testen

Gezielt erfolgreich ausgeführt:

- `npm run test:unit`
- `npm run test:integration -- --reporter=verbose`
- `npm run test:e2e:browser -- tests/e2e-browser/reports.ft26.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/reports.ft26.browser.e2e.spec.ts tests/e2e-browser/reports.tourenplan.browser.e2e.spec.ts`

Zusätzlich wurden während der Umsetzung einzelne fokussierte Unit- und Integrationssuiten mehrfach seriell nachgezogen.

## Bekannte Einschränkungen

- Die Sauna-Modell-Filterung hängt fachlich daran, dass Modelle in der Artikelliste über eine als Sauna-Produktkategorie erkannte Kategorie gepflegt werden.
- Für diesen Auftrag wurden keine Architektur- oder Doku-Sync-Dateien außerhalb des Logs aktualisiert.
