# 10.05.26 | Abschluss | P01 Reports- und Druck-Dialoge

## Zusammenfassung

Der P-01-Schritt Reports- und Druck-Dialoge ist technisch umgesetzt und als Wiki-Aufgabe abgeschlossen. Spaltenauswahl und Produktionsplanung-Kategorie-Layout nutzen die gemeinsame Dialogbasis, Report-, Preset- und Druckvorschaufehler werden normalisiert inline angezeigt, und Auftragslisten- sowie Tourenplan-Druckvorschauen bleiben während der Browser-Messphase durch geschätzte Seiten sichtbar.

## Verifikation

- Typecheck: `npm run typecheck` erfolgreich.
- Unit-Tests: `npm run test:unit -- tests/unit/ui/reportsPage.behavior.test.tsx tests/unit/ui/reportsPage.wiring.test.tsx tests/unit/ui/reportPresetControls.disabled.test.tsx tests/unit/ui/printComponents.primitives.test.tsx tests/unit/ui/auftragslistePrintLayout.wiring.test.tsx tests/unit/ui/tourenplanReportPanel.smoke.test.tsx tests/unit/ui/spaltenDialog.dialogBase.test.tsx` erfolgreich mit 37 bestandenen Tests in 7 Dateien.
- Integrationstests: `npm run test:integration -- tests/integration/server/reports.auftragsliste.integration.test.ts tests/integration/server/reports.produktionsplanung.integration.test.ts tests/integration/server/reportConfigs.presets.integration.test.ts tests/integration/server/reportConfigs.reportEffects.integration.test.ts --reporter=verbose` erfolgreich mit 20 bestandenen Tests in 4 Dateien.
- Browser-E2E: `npm run test:e2e:browser -- tests/e2e-browser/reports.ft26.browser.e2e.spec.ts tests/e2e-browser/reports.tourenplan.browser.e2e.spec.ts tests/e2e-browser/reports.open-modes.browser.e2e.spec.ts` erfolgreich mit 9 bestandenen Tests.
- Encoding: `npm run check:encoding` erfolgreich.
- Diff-Prüfung: `git diff --check` erfolgreich.
- Wiki-Build: `node scripts/build-wiki-site.mjs` am 10.05.26 erfolgreich.

## Rollen

- `ADMIN`, `DISPONENT` und `LESER` dürfen Reports lesen; die serverseitige Reportprüfung bleibt maßgeblich.
- `ADMIN`, `DISPONENT` und `LESER` dürfen persönliche Presets lesen und schreiben; globale Presets bleiben serverseitig `ADMIN`-only.
- Das Produktionsplanung-Kategorie-Layout bleibt über globale Settings und bestehende Serverregeln `ADMIN`-only.
- UI-Sichtbarkeit und Dialoge bleiben Bedienführung; die serverseitigen Guards sind die verbindliche Durchsetzung.

## Verknüpfungen

- Aufgabe: [Reports- und Druck-Dialoge](../tasks/closed/reports-und-druck-dialoge.md)
- Projekt: [P01 Dialog-Rollout Masterplan](../projects/dialog-rollout.md)
- Grundlagen: [Fehler-Normalisierung](../tasks/closed/fehler-normalisierung.md) · [Dialog-Basiskomponenten](../tasks/closed/dialog-basiskomponenten.md)
