# Auftragslog: Audit-Fixes und Encoding-Bereinigung

## Zweck

Bereinigung kleiner, risikoarmer Restpunkte auf dem Branch `feature/leser-ui-readonly-release`, ohne Fachlogik oder Rollenverhalten auszuweiten. Der Schwerpunkt lag auf UTF-8-/Mojibake-Korrekturen, veralteten Test-Erwartungen sowie kleinen Audit-/Knip-Fixes.

## Bearbeitete Problemblöcke

- Mojibake- und Encoding-Probleme in UI-Texten und einzelnen Kommentaren
- veraltete Reader-Test-Erwartung nach Entfernen des Hinweisblocks `Nur Lesemodus`
- fragiler Browser-Testpfad bei der Tour-Wochenblockierung
- `knip`-Hinweise zu unlisted dependency `nanoid` und unlisted binary `powershell`
- `npm audit`-Fund bei `postcss`
- Dokumentation des verbleibenden Third-Party-Restpunkts `exceljs` / `uuid`

## Technische Entscheidungen

- UI-Texte mit kaputten Umlauten wurden direkt in den betroffenen Komponenten auf echte UTF-8-Zeichen korrigiert.
- Die Artikellistenlogik in `shared/projectArticleList.ts` wurde nicht fachlich umgebaut. Statt verstreuter ASCII-/Mojibake-Aliase wurde die Erkennung zentral über die Normalisierung robuster gemacht.
- Der veraltete Unit-Test zum Terminformular wurde nur an das bereits bewusst geänderte UI-Verhalten angepasst.
- Die blockierte Browser-Interaktion in der Tour-Wochenplanung wurde testseitig robuster gemacht, ohne Produktivlogik zu ändern.
- `nanoid` wurde als direkte Dependency eingetragen, weil der Import in `server/vite.ts` bereits vorhanden war.
- `powershell` wurde in `knip` als ignoriertes Binary hinterlegt, um reinen Tooling-Noise zu entfernen.
- `postcss` wurde auf einen sicheren Stand aktualisiert.
- Der verbleibende Audit-Befund `uuid` über `exceljs` wurde bewusst nicht per `--force` angefasst, sondern separat dokumentiert, weil der Exportpfad produktiv relevant ist.

## Betroffene Dateien

- Produktivcode und geteilte Logik:
  `client/src/components/EmployeeForm.tsx`
  `client/src/components/TourEditForm.tsx`
  `server/repositories/usersRepository.ts`
  `server/services/appointmentsService.ts`
  `shared/projectArticleList.ts`
  `shared/schema.ts`
- Tests:
  `tests/unit/ui/appointmentForm.readOnlyModes.wiring.test.tsx`
  `tests/e2e-browser/tour-week-form.browser.e2e.spec.ts`
- Tooling und Audit:
  `package.json`
  `package-lock.json`
  `knip.config.ts`
- Logs:
  `logs/2026-04-25_audit-restpunkt-exceljs-uuid.md`

## Verifikation

- `npm run check`
  - grün
- `npx vitest run tests/unit/ui/appointmentForm.readOnlyModes.wiring.test.tsx`
  - grün
- `npx vitest run tests/unit/lib/projectArticleList.reports.test.ts tests/unit/lib/projectArticleList.render-options.test.ts`
  - grün
- `npx playwright test tests/e2e-browser/employee-appointment-mutation-tracking.browser.e2e.spec.ts tests/e2e-browser/ft04.tour-employee-cascade.browser.e2e.spec.ts -c playwright.config.ts`
  - grün
- `npx playwright test tests/e2e-browser/tour-week-form.browser.e2e.spec.ts -c playwright.config.ts`
  - grün
- `npm run analyze:knip`
  - unlisted dependency und unlisted binary bereinigt, weitere Hygiene-Hinweise bleiben bestehen
- `npm audit`
  - `postcss`-Fund bereinigt, Restpunkt `uuid` über `exceljs` bleibt dokumentiert offen

## Offene Hinweise

- Ein vollständiger erneuter Gesamtlauf von `npm run test:unit` und `npm run test:e2e:browser` wurde in dieser Runde nicht mehr gefahren.
- Der verbleibende Audit-Restpunkt `exceljs` / `uuid` ist dokumentiert in:
  `logs/2026-04-25_audit-restpunkt-exceljs-uuid.md`
- Die restlichen `knip`-Hinweise sind überwiegend Hygiene-Befunde zu ungenutzten Dateien, Exports und Typflächen und wurden in dieser Runde nicht bereinigt.
