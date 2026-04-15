# Auftrag: Stammdaten Komponenten-Duplikate

## Zweck

Die Stammdatenverwaltung wurde so angepasst, dass gleiche Komponentennamen in verschiedenen Komponentenkategorien erlaubt sind, innerhalb derselben Kategorie aber weiterhin als Dublette blockiert werden. Zusaetzlich wurden die sichtbaren CSV-Import-Ausloeser in den Kategorietabellen entfernt und die `Default`-Spalte in beiden Kategorietabellen auf Inhaltsbreite reduziert.

## Scope

- Komponenten-Eindeutigkeit von globalem `name` auf `category_id + name` umgestellt
- Fehlerabbildung fuer Drizzle-Query-Fehler mit MySQL-Duplicate-Cause auf `BUSINESS_CONFLICT` erweitert
- FT27-Unit- und Integrationstests fuer differenzierte Komponenten-Duplikatpruefung ergaenzt
- Test-Matrix aktualisiert
- Sichtbare CSV-Import-Buttons in den Stammdaten-Kategorietabellen entfernt
- `Default`-Spalte in beiden Kategorietabellen verschlankt
- Neue Migration `0026_components_category_name_unique.sql` inklusive Migrations-Metadaten hinzugefuegt

## Technische Entscheidungen

- Die Datenbank modelliert die Fachregel jetzt direkt ueber einen eindeutigen Index auf `components(category_id, name)`.
- Der Dump-Pfad wurde bewusst nicht veraendert, damit Export/Import weiterhin zeilen- und ID-basiert bleibt.
- Die Service-Fehlererkennung wertet nun auch verschachtelte DB-Fehler in `error.cause` aus, damit Drizzle-Fehler nicht als generischer 500 enden.
- Die Breitenanpassung der `Default`-Spalte wurde zentral in `renderCategorySection(...)` vorgenommen, damit beide Tabellen mit einem kleinen Eingriff konsistent bleiben.

## Betroffene Dateien

- `client/src/components/ProductManagementPage.tsx`
- `shared/schema.ts`
- `server/services/masterDataService.ts`
- `tests/unit/services/masterDataService.ft27.test.ts`
- `tests/integration/server/masterData.ft27.integration.test.ts`
- `docs/TEST_MATRIX.md`
- `migrations/0026_components_category_name_unique.sql`
- `migrations/meta/_journal.json`
- `migrations/meta/0026_snapshot.json`

## Testen

Erfolgreich ausgefuehrt:

- `npm run db:migrate:dev`
- `npm run db:migration-status:dev`
- `npm run db:migrate:test`
- `npm run db:migration-status:test`
- `npm run typecheck`
- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test vitest run --config vitest.workspace.ts --project unit tests/unit/services/masterDataService.ft27.test.ts`
- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test vitest run --config vitest.workspace.ts --project integration tests/integration/server/masterData.ft27.integration.test.ts --reporter=verbose`

## Bekannte Einschraenkungen

- Legacy-CSV-Import-Routen im Backend bleiben bestehen; entfernt wurden in diesem Auftrag nur die sichtbaren UI-Ausloeser.
- Es wurde kein voller Audit und kein voller Testlauf ueber alle Projektebenen ausgefuehrt, sondern nur die fuer den Auftrag relevanten Migrationen und gezielten Pruefungen.
