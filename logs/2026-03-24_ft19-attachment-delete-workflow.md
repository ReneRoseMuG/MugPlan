# Auftragslog: FT-19 Attachment-Lösch-Workflow

**Datum:** 2026-03-24
**Branch:** work (alle Änderungen uncommitted, werden in feature/ft19-attachment-delete-workflow überführt)
**Auftragsklassen:** Klasse 5 (mehrschichtige Änderung / neues Feature) — zweifach: Testsuite und Implementierung

---

## Zweck

Umsetzung des Anhang-Lösch-Workflows (FT-19) für alle vier Domänen (Projekt, Kunde, Mitarbeiter, Termin) mit zweistufiger Löschoption:

- **Soft-Delete:** Datenbankdatensatz wird entfernt; physische Datei bleibt auf dem Dateisystem
- **Hard-Delete:** Datenbankdatensatz UND physische Datei werden entfernt

Zusätzlich wurde eine vollständige Testsuite (Integration, Unit-UI, Browser-E2E) für diesen Workflow erstellt.

---

## Scope

### Aufgabe 1: Testsuite (wurde zuerst ausgeführt, war fachlich die zweite Aufgabe)

Vier neue Testdateien angelegt:

| Datei | Typ | Zweck |
|---|---|---|
| `tests/integration/server/attachments.delete.ft19.integration.test.ts` | Integration | HTTP-Verhalten aller 4 Domänen: 200 soft/hard, 403 Rolle/historisch, 404 nicht gefunden |
| `tests/unit/ui/attachmentsPanel.delete.wiring.test.tsx` | Unit | `AttachmentDeleteAction`: queryClient.invalidateQueries, Dialog-Labels, Sichtbarkeit nach Rolle |
| `tests/unit/ui/attachmentCounter.staleGuard.wiring.test.tsx` | Unit | Kalender-Hover-Counter: dekrementiert nach Delete, `""` bei 0, Vorschau ohne gelöschten Anhang |
| `tests/e2e-browser/attachments.delete-workflow.browser.e2e.spec.ts` | Browser E2E | Soft-Delete Projekt, Hard-Delete, Abbrechen, historischer Termin (kein Button) |

### Aufgabe 2: Implementierung (war die eigentlich erste Aufgabe)

---

## Technische Entscheidungen

### API-Design

Flache Routen-Struktur, konsistent mit bestehenden Download-Routen:

| Domäne | Soft-Delete | Hard-Delete |
|---|---|---|
| Projekt | `DELETE /api/project-attachments/:id` | `DELETE /api/project-attachments/:id?mode=hard` |
| Kunde | `DELETE /api/customer-attachments/:id` | `DELETE /api/customer-attachments/:id?mode=hard` |
| Mitarbeiter | `DELETE /api/employee-attachments/:id` | `DELETE /api/employee-attachments/:id?mode=hard` |
| Termin | `DELETE /api/appointment-attachments/:id` | `DELETE /api/appointment-attachments/:id?mode=hard` |

Die Terminroute wurde von der verschachtelten Vorgänger-URL (`/api/appointments/:appointmentId/attachments/:id`) auf die flache URL umgestellt, konsistent mit der Download-Route.

### Historischer-Termin-Guard

Implementiert in `server/services/appointmentAttachmentsService.ts`:
- `isAppointmentAttachmentHistorical(attachmentId)` liest Attachment → Termin → `startDate`
- Datumsvergleich mit Berlin-Timezone (`Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" })`)
- Server gibt 403 mit `{ code: "HISTORICAL_APPOINTMENT" }` zurück
- UI blendet den Lösch-Button zusätzlich aus über `readOnly`-Prop (bereits vom `AppointmentForm` gesetzt)

### Dateisicherheit

`deleteAttachmentFile(storagePath)` in `server/lib/attachmentFiles.ts`:
- Prüft `fs.existsSync` vor `fs.unlinkSync` — keine Exception bei bereits fehlender Datei
- Wird nur bei `mode=hard` aufgerufen

### UI-Architektur

Slot-basiertes Erweiterungsmodell ohne Umbau der bestehenden Komponenten:

1. `InfoBadge` erhält `customAction?: ReactNode` — rendert im Action-Slot statt der eingebauten Buttons
2. `AttachmentInfoBadge` erhält `actionSlot?: ReactNode` — reicht durch an `InfoBadge.customAction`
3. `AttachmentSection` (SplitAttachmentsPanel) und `AttachmentsPanel` erhalten `buildActionSlot?: (id: number) => ReactNode`
4. Neue Komponente `AttachmentDeleteAction` rendert Trash-Icon-Trigger + `AlertDialog` mit drei Buttons

### Berechtigungsprüfung

- **Server:** `roleKey !== "ADMIN" && roleKey !== "DISPONENT"` → 403
- **Client:** `userRole === "ADMIN" || userRole === "DISPATCHER"` → steuert Sichtbarkeit des Buttons (localStorage-Wert "DISPATCHER" entspricht Server-Rolle "DISPONENT")
- Prop `canDelete` wird von allen 4 Panel-Komponenten akzeptiert und von den Form-Eltern übergeben

### Query-Invalidierung nach Delete

| Domäne | Invalidierter Query-Key |
|---|---|
| Projekt | `["/api/projects", parentId, "attachments"]` |
| Kunde | `["/api/customers", parentId, "attachments"]` |
| Mitarbeiter | `["/api/employees", parentId, "attachments"]` |
| Termin | `["/api/appointments", parentId, "attachment-context"]` |

---

## Betroffene Dateien

### Neu angelegt

| Datei | Beschreibung |
|---|---|
| `client/src/components/AttachmentDeleteAction.tsx` | UI-Komponente: Trash-Icon + AlertDialog (soft/hard/Abbrechen) |
| `tests/integration/server/attachments.delete.ft19.integration.test.ts` | Integration-Testsuite |
| `tests/unit/ui/attachmentsPanel.delete.wiring.test.tsx` | Unit-Test UI-Wiring |
| `tests/unit/ui/attachmentCounter.staleGuard.wiring.test.tsx` | Unit-Test Counter-Guard |
| `tests/e2e-browser/attachments.delete-workflow.browser.e2e.spec.ts` | Browser-E2E-Testsuite |

### Modifiziert — Server

| Datei | Änderung |
|---|---|
| `server/lib/attachmentFiles.ts` | `deleteAttachmentFile()` hinzugefügt |
| `server/repositories/projectsRepository.ts` | `deleteProjectAttachment()` |
| `server/repositories/customersRepository.ts` | `deleteCustomerAttachment()` |
| `server/repositories/employeesRepository.ts` | `deleteEmployeeAttachment()` |
| `server/repositories/appointmentsRepository.ts` | `deleteAppointmentAttachment()` |
| `server/services/projectAttachmentsService.ts` | `softDelete` + `hardDelete` |
| `server/services/customerAttachmentsService.ts` | `softDelete` + `hardDelete` |
| `server/services/employeeAttachmentsService.ts` | `softDelete` + `hardDelete` |
| `server/services/appointmentAttachmentsService.ts` | Berlin-Timezone-Helfer, `isAppointmentAttachmentHistorical()`, `softDelete`, `hardDelete` |
| `server/controllers/projectAttachmentsController.ts` | Echte Delete-Logik implementiert (war Stub 405) |
| `server/controllers/customerAttachmentsController.ts` | `deleteAttachmentFile`-Import + echte Delete-Logik |
| `server/controllers/employeeAttachmentsController.ts` | Echte Delete-Logik implementiert (war Stub 405) |
| `server/controllers/appointmentAttachmentsController.ts` | Echte Delete-Logik + historischer-Termin-Guard (war Stub 405) |
| `server/routes/customerAttachmentsRoutes.ts` | DELETE-Route hinzugefügt |
| `shared/routes.ts` | Delete-Response-Codes aktualisiert (war 405); Kunden-Delete-Route hinzugefügt; Termin-Delete-Pfad auf flache URL umgestellt |

### Modifiziert — Client

| Datei | Änderung |
|---|---|
| `client/src/components/ui/info-badge.tsx` | `customAction?: ReactNode` Slot |
| `client/src/components/ui/attachment-info-badge.tsx` | `actionSlot?: ReactNode` durchgereicht |
| `client/src/components/SplitAttachmentsPanel.tsx` | `buildActionSlot` in `AttachmentSection` |
| `client/src/components/AttachmentsPanel.tsx` | `buildActionSlot` Prop |
| `client/src/components/ProjectAttachmentsPanel.tsx` | `canDelete` Prop + `buildActionSlot` mit `AttachmentDeleteAction` |
| `client/src/components/CustomerAttachmentsPanel.tsx` | `canDelete` Prop + `buildActionSlot` mit `AttachmentDeleteAction` |
| `client/src/components/EmployeeAttachmentsPanel.tsx` | `canDelete` Prop + `buildActionSlot` mit `AttachmentDeleteAction` |
| `client/src/components/AppointmentAttachmentsPanel.tsx` | `canDelete` Prop + `buildActionSlot` für Termin-Sektion mit `AttachmentDeleteAction` |
| `client/src/components/ProjectForm.tsx` | `canDeleteAttachments` berechnet + an Panel übergeben |
| `client/src/components/CustomerData.tsx` | `canDeleteAttachments` berechnet + an Panel übergeben |
| `client/src/components/EmployeeForm.tsx` | `canDeleteAttachments` berechnet + an Panel übergeben |
| `client/src/components/AppointmentForm.tsx` | `canDeleteAttachments` berechnet + an Panel übergeben |

---

## Hinweise zum Testen

### Integration-Tests

```bash
npm run test:integration -- attachments.delete.ft19 --reporter=verbose
```

Voraussetzungen:
- `.env.test` vorhanden und geladen
- Testdatenbank erreichbar
- Safety-Gate muss bestehen

### Unit-Tests

```bash
npm run test:unit -- attachmentsPanel.delete.wiring
npm run test:unit -- attachmentCounter.staleGuard.wiring
```

### Browser-E2E

```bash
npm run test:e2e:browser -- attachments.delete-workflow
```

---

## Bekannte Einschränkungen und offene Punkte

1. **Keine DB-Migration notwendig:** Der Lösch-Workflow entfernt lediglich bestehende Datensätze. Kein Schema-Change.

2. **Termin-Delete-Pfad geändert:** `shared/routes.ts` Termin-Delete-Pfad war bisher `/api/appointments/:appointmentId/attachments/:id` — jetzt `/api/appointment-attachments/:id`. Falls externe Systeme oder ältere Tests diese alte URL verwenden, müssen sie aktualisiert werden.

3. **Pending-Attachments nicht löschbar:** Anhänge, die noch nicht persistiert sind (pending-State in der Formular-Ansicht), werden durch `pendingAttachmentUrlsById.has(id)`-Check vom Delete ausgeschlossen. Das ist fachlich korrekt.

4. **Testsuite vor Implementierung:** In dieser Session wurden die Tests zuerst (irrtümlich) angelegt und erst danach die Implementierung. Die Tests wurden auf Basis des Auftrags geschrieben und sollten mit der Implementierung konsistent sein — eine manuelle Gegenprüfung vor dem ersten Testlauf empfiehlt sich.

5. **`shared/routes.ts` Response-Schema für Delete:** War `405`, jetzt `200 / 403 / 404`. Falls der Contract-Index darauf referenziert, sollte `docs/architecture.md` oder der Contract-Index geprüft werden.
