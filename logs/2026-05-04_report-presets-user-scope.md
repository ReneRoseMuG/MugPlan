# Report-Presets mit User-Scope

Datum: 04.05.26
Branch: `codex/report-presets-user-scope`
Commits: `251cc4bb`, `b132aa47`, `9449a3f5`, `6ffe59c4`

## Zweck

Dieses Log dokumentiert die Umsetzung der Report-Konfigurationen als Presets mit USER- und GLOBAL-Scope. Ziel war, reportbezogene UI-Einstellungen nicht mehr still über alte User-Settings zu persistieren, sondern bewusst speicherbare Presets pro Benutzer einzuführen.

Zusätzlich wurde die Produktionsplanung fachlich geschärft: Projektkacheln entstehen nur noch für Projekte oder Termine mit Sondermaß-Tag.

## Scope

- Die Wiki-Seiten zu FT-26 wurden auf Presets, Rollen und das neue Produktionsplanung-Verhalten aktualisiert.
- Die Preset-Infrastruktur wurde als eigener API-/Service-/Repository-Pfad ergänzt.
- Presets unterstützen `USER` und `GLOBAL`, Datumsbereiche, aktuelle KW, kommende KW und Anzahl KW.
- Report-UI für Vorlaufliste, Produktionsplanung, Auftragsliste und Tourenplan kann Presets speichern, anwenden und löschen.
- Alte reportbezogene Settings-Persistenz wurde aus Registry, Nutzung und Tests entfernt.
- Ausnahme bleibt `reports.categoryLayout` als globale Admin-Konfiguration für das Produktionsplanungs-Layout.
- `reports.categoryLayout` kann zusätzlich Bestandteil eines Produktionsplanung-Presets sein.
- Produktionsplanung-Projektkacheln verwenden nur noch Sondermaß als Karten-Auslöser.

## Rollen und Persistenz

- `ADMIN`, `DISPONENT` und `LESER` dürfen Reports lesen und eigene USER-Presets verwalten.
- GLOBAL-Presets dürfen nur Admins schreiben oder löschen.
- GLOBAL-Presets sind für alle Report-Rollen lesbar.
- Die globale Layout-Persistenz `reports.categoryLayout` bleibt adminseitig und gilt zunächst für alle.
- Alte Report-Settings wie Zeiträume, Tabs, Spalten, Kategorieauswahl, Shortcodes, Tourenplan-Druckmodus und Schriftgröße werden nicht mehr als User-Settings ausgeliefert oder angenommen.

## Betroffene Dateien

- `shared/routes.ts`
- `server/repositories/reportConfigsRepository.ts`
- `server/services/reportConfigsService.ts`
- `server/controllers/reportConfigsController.ts`
- `server/routes/reportConfigsRoutes.ts`
- `server/routes.ts`
- `server/settings/registry.ts`
- `server/services/userSettingsService.ts`
- `server/lib/reportProduktionsplanung.ts`
- `client/src/components/ReportsPage.tsx`
- `client/src/components/reports/ReportPresetControls.tsx`
- `client/src/components/reports/TourenplanReportPanel.tsx`
- `client/src/hooks/useSettings.ts`
- `docs/wiki/features/ft-26-auswertungen-und-reports/`
- neue und angepasste Unit- und Integrationstests unter `tests/`

## Tests / Verifikation

Gezielt erfolgreich ausgeführt:

- `npm run typecheck`
- `npm run test:unit -- tests/unit/services/reportConfigsService.test.ts tests/unit/settings/reportSettings.persistenceRemoval.test.ts tests/unit/ui/reportsPage.behavior.test.tsx tests/unit/ui/reportsPage.wiring.test.tsx tests/unit/ui/tourenplanReportPanel.smoke.test.tsx`
- `npm run test:integration -- --reporter=verbose tests/integration/server/userSettings.reportPersistenceRemoval.integration.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/reportConfigs.presets.integration.test.ts tests/integration/server/reportConfigs.reportEffects.integration.test.ts tests/integration/server/userSettings.reportPersistenceRemoval.integration.test.ts tests/integration/server/reports.produktionsplanung.integration.test.ts tests/integration/server/reports.produktionsplanung.projectRowsConsistency.integration.test.ts`

## Bekannte Einschränkungen

- `npm run check` wurde nicht erneut als Abschluss-Gate ausgeführt. Aus der vorherigen Session ist eine unabhängige Encoding-Lint-Meldung in `client/src/components/TourEmployeeCascadeDialog.tsx` bekannt.
- Ein kompletter E2E-Browserlauf wurde für diese Server-/UI-Konfigurationsänderung nicht ausgeführt; stattdessen wurden API-, Service-, Settings- und UI-Wiring-Pfade gezielt abgesichert.
