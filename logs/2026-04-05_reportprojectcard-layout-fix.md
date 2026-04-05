# Auftragslog: ReportProjectCard Layout-Fix

## Zweck

Die Produktionsplanung im Report wurde auf ein sauberes Kartenlayout mit generalisiertem Footer umgestellt. Ziel war, die sichtbaren Layout-Mängel der Projektkarten zu beheben, die Footer-Hover auf bestehende generische Bausteine auszurichten und die doppelte Hilfs- und Typ-Logik für die Produktionsplanung fachlich sauber zu entkoppeln.

## Scope

- Contract und Report-Repository für zusätzliche IDs und Einzel-Counts erweitert
- Produktionsplanungskarte in eigene wiederverwendbare Komponente extrahiert
- gemeinsame Artikellogik aus `ReportsPage.tsx` und `ProduktionsplanungPrintLayout.tsx` in ein Shared-Modul verschoben
- lokale Frontend-Response-Typkopien entfernt und durch Typen aus `shared/routes.ts` ersetzt
- Drucklayout auf `label: value`-Artikelliste umgestellt
- Unit- und Integrationstests für die neue Struktur ergänzt bzw. aktualisiert
- `docs/TEST_MATRIX.md` gepflegt

## Technische Entscheidungen

- Die Footer-Hover wurden bewusst generalisiert statt report-spezifisch verengt:
  - Notizen aggregieren jetzt Kunde + Projekt + repräsentativen Termin
  - Anhänge aggregieren jetzt Kunde + Projekt + repräsentativen Termin
- Der bestehende generische Attachment-Hover bleibt erhalten; die notwendige Konsistenz wurde dadurch erreicht, dass `attachmentsCount` im Report nun dieselbe Quellenmenge abbildet wie die Hover-Preview.
- Die geteilte fachliche Quelle für die Produktionsplanung-Response ist jetzt `shared/routes.ts`. Frontend-Dateien pflegen dafür keine eigenen Shape-Kopien mehr.
- Die doppelte Artikellogik wurde in ein kleines Shared-Frontend-Modul ausgelagert, damit Bildschirmkarte und Drucklayout dieselbe Ableitung verwenden.

## Betroffene Dateien

- `shared/routes.ts`
- `server/repositories/reportsRepository.ts`
- `client/src/components/ReportsPage.tsx`
- `client/src/components/reports/ProduktionsplanungProjectCard.tsx`
- `client/src/components/reports/produktionsplanungProjectCard.shared.ts`
- `client/src/components/reports/ProduktionsplanungPrintLayout.tsx`
- `tests/unit/ui/reportsPage.produktionsplanungArticles.test.ts`
- `tests/unit/ui/produktionsplanungProjectCard.wiring.test.tsx`
- `tests/unit/ui/produktionsplanungPrintLayout.wiring.test.tsx`
- `tests/integration/server/reports.produktionsplanung.integration.test.ts`
- `docs/TEST_MATRIX.md`

## Testen

Ausgeführt:

- `npm run test:unit -- tests/unit/ui/reportsPage.produktionsplanungArticles.test.ts tests/unit/ui/produktionsplanungProjectCard.wiring.test.tsx tests/unit/ui/produktionsplanungPrintLayout.wiring.test.tsx tests/unit/ui/reportsPage.wiring.test.tsx`
- `npm run test:integration -- --reporter=verbose tests/integration/server/reports.produktionsplanung.integration.test.ts`

Ergebnis:

- Alle gezielten Unit-Tests erfolgreich
- Der gezielte Integrationslauf für den Produktionsplanungs-Report erfolgreich
- Hinweis aus dem Integrationslauf: vorhandene Sourcemap-Warnung aus `node-cron`, ohne funktionale Auswirkung auf diesen Auftrag

## Bekannte Einschränkungen

- Es wurde kein voller Audit und kein voller Testlauf durchgeführt, sondern gezielte Verifikation für die betroffenen Bereiche.
- Die Print-Karte behält ihren bestehenden Header- und Footer-Aufbau; geändert wurde dort nur die Artikeldarstellung.
