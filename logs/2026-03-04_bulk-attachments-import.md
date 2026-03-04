# Ergebnisdokumentation: Attachment-Panels + Bulk-Import (Phase 1-5)

## Zweck
Diese Dokumentation beschreibt die Umsetzung der Aufgaben zu Attachment-Panels, Dokumentenextraktion mit Dateireuse und Bulk-Import (Kunden/Projekte) auf Branch `implement/bulk`.

## Scope
- Attachment-Panel-Struktur mit wiederverwendbarer Split-Komponente
- Termin-Kontextpanel fuer Kunden-/Projektdokumente (read-only)
- Duplicate-Check nach `originalName` fuer Attachment-Reuse
- Bulk-Import Endpunkte (Analyze/Apply) fuer Kunden und Projekte
- Hard-Limits fuer Analyze-Uploads
- Admin-UI fuer Bulk-Import in Kunden- und Projektlisten
- Unit- und Integrationstests plus Test-Matrix-Ergaenzung

## Technische Entscheidungen
1. Bestehender Upload-Endpunkt wurde weiterverwendet.
   - Phase 3 nutzt weiterhin `POST /api/projects/:id/attachments` mit `multipart/form-data`.
   - Die extrahierte Originaldatei bleibt im Frontend-State (`File`) und wird nach Projektanlage erneut hochgeladen.
2. Duplikatpruefung wurde als eigener Query-Endpunkt umgesetzt.
   - `POST /api/attachments/duplicates/check-original-name`
   - Treffer ueber Customer/Project/Employee zusammengefasst.
3. Bulk-Import-Limits wurden hart definiert.
   - Max Dateien: 100
   - Max Einzeldatei: 10 MB
   - Max Gesamtgroesse: 250 MB
   - Ueberschreitungen: `413 BULK_IMPORT_LIMIT_EXCEEDED`
4. Apply-New fuer Bulk ist atomar pro Request ausgelegt.
   - Kunden: transaktionale Erstellung
   - Projekte: transaktionale Erstellung, Attachment-Linking anschliessend per bestehendem Attachment-Muster
5. Query-Invalidierung wurde explizit verdrahtet.
   - Kunden: `[/api/customers]`, `[/api/customers,{scope:active}]`, `[/api/customers,{scope:inactive}]`
   - Projekte: `[/api/projects]`, `[/api/projects?filter=all&scope=all]`

## Betroffene Dateien
### Backend
- `shared/routes.ts`
- `server/lib/multipart.ts`
- `server/routes.ts`
- `server/routes/attachmentQueriesRoutes.ts`
- `server/controllers/attachmentQueriesController.ts`
- `server/services/attachmentQueriesService.ts`
- `server/repositories/attachmentQueriesRepository.ts`
- `server/routes/adminBulkImportRoutes.ts`
- `server/controllers/adminBulkImportController.ts`
- `server/services/bulkImportService.ts`

### Frontend
- `client/src/components/SplitAttachmentsPanel.tsx`
- `client/src/components/CustomerAttachmentsPanel.tsx`
- `client/src/components/ProjectAttachmentsPanel.tsx`
- `client/src/components/AppointmentAttachmentsPanel.tsx`
- `client/src/components/ProjectForm.tsx`
- `client/src/components/AppointmentForm.tsx`
- `client/src/components/CustomerBulkImportDialog.tsx`
- `client/src/components/ProjectBulkImportDialog.tsx`
- `client/src/components/CustomersPage.tsx`
- `client/src/components/ProjectsPage.tsx`

### Tests / Doku
- `tests/unit/services/bulkImportService.limits.test.ts`
- `tests/unit/ui/bulkImportDialogs.wiring.test.ts`
- `tests/unit/ui/appointmentForm.extractionAttachmentLinking.wiring.test.tsx`
- `tests/integration/server/attachmentQueries.ft24.integration.test.ts`
- `docs/TEST_MATRIX.md`

## Testausfuehrung
Ausgefuehrt:
- `npm run check`
- `npm run test:run -- tests/unit/services/bulkImportService.limits.test.ts tests/unit/ui/bulkImportDialogs.wiring.test.ts tests/unit/ui/appointmentForm.extractionAttachmentLinking.wiring.test.tsx tests/integration/server/attachmentQueries.ft24.integration.test.ts`

Ergebnis:
- Statischer Check erfolgreich
- 4 Testdateien / 8 Tests erfolgreich

## Bekannte Einschraenkungen
- Bulk-Import-Analyze ist synchron; fuer sehr grosse Lasten gibt es noch kein Async-Job-Tracking.
- Attachment-Linking nach Projektanlage ist als Folgeaktion umgesetzt; bei Upload-Fehler bleibt das Projekt bestehen und der Fehler wird als nicht-fatal behandelt.
- `docs/TEST_MATRIX.md` wurde um neue Eintraege erweitert (append), ohne bestehende Reihenfolge zu reorganisieren.
