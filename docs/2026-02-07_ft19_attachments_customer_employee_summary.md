# FT (19) Zusammenfassung: Attachments für Customer und Employee

## Zweck und Scope

Dieses Dokument fasst die Umsetzung von FT (19) zusammen: Erweiterung der bestehenden Projekt-Attachment-Funktion auf Kunden und Mitarbeiter bei gleichzeitiger Zentralisierung der Download-Logik und Deaktivierung von Delete.

Im Scope enthalten:

- neue Persistenz für `customer_attachment` und `employee_attachment`
- neue Contract-Definitionen und API-Routen für List/Upload/Download
- zentrale Download-/Streaming-Funktion für alle Attachment-Domänen
- Frontend-Wrapper für Projekt, Kunde und Mitarbeiter auf Basis eines generischen Panels
- UI-Entfernung der Delete-Aktion
- serverseitige Blockierung von Projekt-Delete

Nicht im Scope:

- physische Dateibereinigung/Retention
- neue Rechte-/Audit-Modelle für Downloads
- Re-Enable von Delete

## Wichtige technische Entscheidungen

1. **Domaingebundene Tabellen statt polymorpher Lösung**
- `customer_attachment` und `employee_attachment` wurden analog `project_attachment` eingeführt.
- Begründung: Konsistenz mit bestehendem Modell, klare Semantik je Domäne, niedrigeres Migrationsrisiko.

2. **Zentrale Download-Logik**
- Header- und Disposition-Handling wurde in eine gemeinsame Funktion ausgelagert.
- Domain-Controller laden nur den jeweiligen Datensatz und delegieren.

3. **Delete deaktiviert**
- Customer/Employee: kein Delete-Endpoint.
- Projekt: bestehender Delete-Endpoint liefert nur Blockierungsantwort.
- API-Message: `"Attachment deletion is disabled"`.

4. **Frontend über Wrapper-Pattern**
- generisches `AttachmentsPanel` für Struktur und Rendering
- domänenspezifische Wrapper kapseln Query, Upload und URL-Building
- keine Delete-Interaktion im UI

## API-Änderungen

### Customer

- `GET /api/customers/:customerId/attachments`
- `POST /api/customers/:customerId/attachments`
- `GET /api/customer-attachments/:id/download`

### Employee

- `GET /api/employees/:employeeId/attachments`
- `POST /api/employees/:employeeId/attachments`
- `GET /api/employee-attachments/:id/download`

### Project

- `GET /api/projects/:projectId/attachments`
- `POST /api/projects/:projectId/attachments`
- `GET /api/project-attachments/:id/download`
- `DELETE /api/project-attachments/:id` -> blockiert (`405`, `"Attachment deletion is disabled"`)

## Persistenz und Migration

- Schema erweitert in `shared/schema.ts`
- Migration ergänzt in `migrations/2026-02-07_ft19_customer_employee_attachments.sql`
- Beide neuen Tabellen enthalten FK-Cascade und Parent-Index analog Projektmodell

## Backend-Module (neu/angepasst)

Neu:

- `server/lib/attachmentFiles.ts`
- `server/lib/attachmentDownload.ts`
- `server/routes/customerAttachmentsRoutes.ts`
- `server/routes/employeeAttachmentsRoutes.ts`
- `server/controllers/customerAttachmentsController.ts`
- `server/controllers/employeeAttachmentsController.ts`
- `server/services/customerAttachmentsService.ts`
- `server/services/employeeAttachmentsService.ts`

Angepasst:

- `server/controllers/projectAttachmentsController.ts`
- `server/repositories/customersRepository.ts`
- `server/repositories/employeesRepository.ts`
- `server/routes.ts`

## Frontend-Module (neu/angepasst)

Neu:

- `client/src/components/AttachmentsPanel.tsx`
- `client/src/components/CustomerAttachmentsPanel.tsx`
- `client/src/components/EmployeeAttachmentsPanel.tsx`

Angepasst:

- `client/src/components/ProjectAttachmentsPanel.tsx`
- `client/src/components/ui/attachment-info-badge.tsx`
- `client/src/components/CustomerData.tsx`
- `client/src/components/EmployeePage.tsx`

## Verifikation

Technisch durchgeführt:

- `npm run check` erfolgreich
- `npm run build` erfolgreich

Manuelle Prüfpunkte:

1. Upload in Projekt/Kunde/Mitarbeiter funktioniert.
2. Open/Preview und Download (`download=1`) funktionieren in allen drei Domänen.
3. Delete ist im UI nicht verfügbar.
4. Projekt-Delete-API ist blockiert und liefert die definierte Fehlermeldung.

## Bekannte Einschränkungen / offene Punkte

1. Physische Dateien werden weiterhin nicht automatisch bereinigt.
2. Kein Download-Audit-Log im aktuellen Scope.
3. Kein fein granularer Berechtigungslayer pro Attachment-Domäne im aktuellen Scope.
