# 04.05.26 | Änderung | FT-26: Report-Presets mit User-Scope

## Zusammenfassung

FT-26 wurde um Report-Presets erweitert. Benutzer können unabhängig von ihrer Rolle eigene USER-Presets für Vorlaufliste, Produktionsplanung, Auftragsliste und Tourenplan speichern, anwenden und löschen. Admins können zusätzlich GLOBAL-Presets bereitstellen, die für alle Report-Rollen sichtbar sind.

Die bisherige stille Persistenz reportbezogener User-Settings wurde entfernt. Erhalten bleibt nur `reports.categoryLayout` als globale Admin-Konfiguration für das Produktionsplanungs-Layout; dieses Layout kann zusätzlich Bestandteil eines Produktionsplanung-Presets sein.

## Art der Änderung

- Wiki und Use Cases zu FT-26 aktualisiert.
- Backend-Infrastruktur für Report-Presets ergänzt.
- Frontend-Steuerung zum Speichern, Anwenden und Löschen von Presets ergänzt.
- Alte reportbezogene Settings aus Registry, Service-Normalisierung, Hook-Nutzung und Tests entfernt.
- Produktionsplanung-Projektkacheln werden nur noch durch Sondermaß-Tags ausgelöst.
- Pro Report wurde eine Integrationstest-Abdeckung ergänzt, die Presets gegen echte Reportdaten ausführt.

## Betroffene Features

- [FT-26: Auswertungen und Reports](../features/ft-26-auswertungen-und-reports/ft-26-auswertungen-und-reports.md)
- [UC-26-01: Vorlaufliste erzeugen und drucken](../features/ft-26-auswertungen-und-reports/use-cases/uc-26-01-vorlaufliste-erzeugen-und-drucken.md)
- [UC-26-03: Produktionsplanung auswerten](../features/ft-26-auswertungen-und-reports/use-cases/uc-26-03-produktionsplanung-auswerten.md)
- [UC-26-06: Auftragsliste erzeugen](../features/ft-26-auswertungen-und-reports/use-cases/uc-26-06-auftragsliste-erzeugen.md)
- [UC-26-08: Tourenplan-Report erzeugen](../features/ft-26-auswertungen-und-reports/use-cases/uc-26-08-tourenplan-report-erzeugen.md)
- [UC-26-10: Report-Preset speichern und ausführen](../features/ft-26-auswertungen-und-reports/use-cases/uc-26-10-report-preset-speichern-und-ausfuehren.md)

## Rollen

- Reports und Presets sind für `ADMIN`, `DISPONENT` und `LESER` verfügbar.
- Alle Rollen dürfen eigene USER-Presets verwalten.
- Nur `ADMIN` darf GLOBAL-Presets schreiben oder löschen.
- Die globale Produktionsplanungs-Layoutpersistenz bleibt adminseitig.

## Tests / Verifikation

Erfolgreich ausgeführt:

- `npm run typecheck`
- `npm run test:unit -- tests/unit/services/reportConfigsService.test.ts tests/unit/settings/reportSettings.persistenceRemoval.test.ts tests/unit/ui/reportsPage.behavior.test.tsx tests/unit/ui/reportsPage.wiring.test.tsx tests/unit/ui/tourenplanReportPanel.smoke.test.tsx`
- `npm run test:integration -- --reporter=verbose tests/integration/server/userSettings.reportPersistenceRemoval.integration.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/reportConfigs.presets.integration.test.ts tests/integration/server/reportConfigs.reportEffects.integration.test.ts tests/integration/server/userSettings.reportPersistenceRemoval.integration.test.ts tests/integration/server/reports.produktionsplanung.integration.test.ts tests/integration/server/reports.produktionsplanung.projectRowsConsistency.integration.test.ts`

## Offene Punkte

- Ein kompletter E2E-Browserlauf wurde nicht ausgeführt.
- `npm run check` bleibt wegen einer bekannten unabhängigen Encoding-Lint-Meldung in `TourEmployeeCascadeDialog.tsx` separat zu behandeln.
