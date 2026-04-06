# Auftragslog: Auftragsliste Shortcodes und Report-Karte

## Zweck

Die neue Auftragsliste wurde als dritter Report in die bestehende FT26-Reportstruktur integriert. Zusätzlich wurde die vergessene Shortcode-Ersetzung für Artikelnamen ergänzt und die zuletzt extrahierte Produktionsplanungs-Kachel zu einer wiederverwendbaren Report-Karte verallgemeinert, damit Auftragsliste und Produktionsplanung dieselbe Kartenbasis nutzen.

## Scope

- neuer Contract und neuer Endpoint `GET /api/reports/auftragsliste`
- serverseitige Aggregation für die Auftragsliste auf Basis des bestehenden Report-Musters
- Shortcode-Ersetzung in `articleValues`, wenn `useShortCodes=true`
- eigene USER-Settings für:
  - `reports.auftragsliste.selection`
  - `reports.auftragsliste.rangeConfig`
- neuer Auftragslisten-Block in `ReportsPage.tsx` mit:
  - Datum-/KW-Modus
  - Komponenten-Kategorieauswahl
  - Shortcode-Toggle
  - Karten-Overlay
  - Druckvorschau
- gemeinsame Report-Karte für Produktionsplanung und Auftragsliste
- neue clientseitige Print-Paginierung für Auftragslisten-Karten ohne Umbruch innerhalb einer Karte
- gezielte Unit- und Integrationstests sowie Pflege von `docs/TEST_MATRIX.md`

## Technische Entscheidungen

- Die bestehende Report-Schichtung blieb unverändert: `shared/routes.ts` -> Route -> Controller -> Service -> Repository.
- Die Auftragsliste verwendet dieselbe serverseitige Projekt-/Terminbasis wie die Vorlaufliste:
  - erster gültiger Termin im Zeitraum
  - Fallback auf den ersten stornierten Termin
  - Reklamation bleibt harter Ausschluss
- Die Shortcode-Ersetzung erfolgt serverseitig über die bestehende Hilfsfunktion `resolveArticleName`, damit Screen- und Druckansicht dasselbe Ergebnis erhalten.
- Die frühere Produktionsplanungs-Karte wurde nicht kopiert, sondern in `ReportProjectCard` generalisiert und von beiden Reports verwendet.
- Die Auftragslisten-Druckvorschau wurde bewusst clientseitig paginiert. Karten werden paarweise zeilenweise betrachtet; passt eine Zeile nicht mehr vollständig auf die Seite, wandert sie komplett auf die nächste Seite.
- Die Auftragsliste speichert ihre Auswahl bewusst wie die bestehenden Reports benutzerspezifisch in eigenen Settings-Schlüsseln.

## Betroffene Dateien

- `shared/routes.ts`
- `server/routes/reportsRoutes.ts`
- `server/controllers/reportsController.ts`
- `server/services/reportsService.ts`
- `server/repositories/reportsRepository.ts`
- `server/settings/registry.ts`
- `server/services/userSettingsService.ts`
- `client/src/hooks/useSettings.ts`
- `client/src/components/ReportsPage.tsx`
- `client/src/components/reports/ReportProjectCard.tsx`
- `client/src/components/reports/ProduktionsplanungProjectCard.tsx`
- `client/src/components/reports/AuftragslisteProjectCard.tsx`
- `client/src/components/reports/AuftragslistePrintLayout.tsx`
- `client/src/lib/auftragsliste-print-model.ts`
- `tests/unit/settings/reportsAuftragsliste.registry.test.ts`
- `tests/unit/settings/useSettings.auftragsliste.test.ts`
- `tests/unit/ui/auftragslisteProjectCard.wiring.test.tsx`
- `tests/unit/lib/auftragsliste-print-model.test.ts`
- `tests/unit/ui/reportsPage.behavior.test.tsx`
- `tests/unit/ui/reportsPage.wiring.test.tsx`
- `tests/integration/server/reports.auftragsliste.integration.test.ts`
- `tests/integration/server/userSettings.reportsProduktionsplanung.persistence.test.ts`
- `docs/TEST_MATRIX.md`

## Testen

Ausgeführt:

- `npm run check`
- `npm run test:unit -- tests/unit/settings/reportsAuftragsliste.registry.test.ts tests/unit/settings/useSettings.auftragsliste.test.ts tests/unit/ui/auftragslisteProjectCard.wiring.test.tsx tests/unit/lib/auftragsliste-print-model.test.ts tests/unit/ui/reportsPage.behavior.test.tsx tests/unit/ui/reportsPage.wiring.test.tsx tests/unit/ui/produktionsplanungProjectCard.wiring.test.tsx`
- `npm run test:integration -- --reporter=verbose tests/integration/server/reports.auftragsliste.integration.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/userSettings.reportsProduktionsplanung.persistence.test.ts`

Ergebnis:

- `check` erfolgreich
- alle gezielten Unit-Tests erfolgreich
- beide gezielten Integrationsläufe erfolgreich
- Hinweis aus den Integrationsläufen: vorhandene Sourcemap-Warnung aus `node-cron`, ohne erkennbare funktionale Auswirkung auf diesen Auftrag

## Bekannte Einschränkungen

- Es wurde kein voller Audit und kein voller Testlauf über alle Pflichtkommandos aus `agents.md` ausgeführt.
- Für die neue Auftragsliste wurde noch kein eigener Browser-E2E-Test ergänzt; die neue UI ist aktuell über Unit-/Wiring-Tests und Server-Integrationstests abgesichert.
