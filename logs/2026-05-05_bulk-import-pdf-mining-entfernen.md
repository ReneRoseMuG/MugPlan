# Bulk-Import und PDF-Mining entfernen

## Datum

05.05.26

## Zweck

Der verwaiste Bulk-Import- und Admin-PDF-Mining-Stack wurde entfernt. Die fachliche Schutzgrenze war, FT-21 Dokumentenextraktion und die aktiv genutzte Projekt-Duplikatauflösung nicht zu beschädigen.

## Scope

- Mehrschichtiger Cleanup in Server, Shared-Contracts, Client und Tests.
- Keine Datenbankmigration und keine Änderung am Persistenzmodell.
- Keine Änderung an FT-21 Doc Extract, Dokumentenparsern, Dokumentenverarbeitung oder Projekt-Duplikatauflösungsdialog.

## Technische Entscheidungen

- `adminBulkImportRoutes` wurde aus der zentralen Routenregistrierung entfernt.
- Bulk-Import-, PDF-Mining-Services und der zugehörige Admin-Controller wurden gelöscht.
- Bulk-Import- und PDF-Mining-Contracts wurden aus `shared/routes.ts` entfernt.
- Nur verwaiste Client-Artefakte wurden gelöscht: Kunden-Bulk-Import, Projekt-Bulk-Import und Admin-PDF-Mining.
- `ProjectDuplicateResolutionDialog` blieb erhalten, weil er von `AppointmentForm` und `ProjectForm` genutzt wird.
- `isOrderNumberAlreadyImported` blieb erhalten, weil der bestehende Integrationstest ihn als FT-21-Duplikatprüfung absichert.

## Betroffene Dateien

- `server/routes.ts`
- `server/routes/adminBulkImportRoutes.ts`
- `server/controllers/adminBulkImportController.ts`
- `server/services/bulkImportService.ts`
- `server/services/masterDataPdfMiningService.ts`
- `shared/routes.ts`
- `client/src/components/CustomerBulkImportDialog.tsx`
- `client/src/components/ProjectBulkImportDialog.tsx`
- `client/src/components/MasterDataPdfMiningPage.tsx`
- `client/src/lib/masterDataPdfMining.ts`
- `tests/unit/services/bulkImportService.limits.test.ts`
- `tests/unit/services/masterDataPdfMiningService.test.ts`
- `tests/unit/lib/masterDataPdfMining.test.ts`

## Rollen und Berechtigungen

Die entfernten Endpunkte waren Admin-nahe Bulk-/PDF-Mining-Routen unterhalb der globalen API-Middlewares.

- Nach der Änderung darf keine Rolle diese Bulk-/PDF-Mining-Endpunkte ausführen, weil sie serverseitig nicht mehr registriert sind.
- Es wurde keine bestehende Rollenprüfung gelockert oder verschoben.
- FT-21-Routen und deren bestehende technische Durchsetzung blieben unverändert.

## Tests / Verifikation

Erfolgreich ausgeführt:

- `npm run typecheck`
- `npm run audit:local -- --skip-coverage`: Nicht-Coverage-Schritte erfolgreich; der Runner führte trotz Skip-Argument zusätzlich `analyze:coverage` aus.
- `npm run test:extraction`
- `npm run test:integration -- --reporter=verbose tests/integration/server/projects.order-number-conflict.integration.test.ts tests/integration/server/documentExtraction.routes.test.ts`

Fehlgeschlagen, ohne nachträgliche Fixes:

- `npm run audit:local -- --skip-coverage`: Gesamtstatus fehlgeschlagen, weil der lokale Runner trotz Skip-Argument `analyze:coverage` ausführte. Coverage meldete zwei fehlgeschlagene EmployeeForm-Testdateien.
- `npm run test:run`: zwei fehlgeschlagene EmployeeForm-Testdateien, fünf fehlgeschlagene Tests, Ursache laut Report `HelpIcon` mit `Cannot read properties of undefined (reading 'trim')`.

## Bekannte Einschränkungen

- Die ursprüngliche Decision enthielt die falsche Annahme, `ProjectDuplicateResolutionDialog` sei verwaist. Diese Datei wurde deshalb bewusst nicht entfernt.
- Die fehlgeschlagenen EmployeeForm-Tests liegen außerhalb des Bulk-/PDF-Mining-Cleanups und wurden gemäß Auftrag nicht repariert.
