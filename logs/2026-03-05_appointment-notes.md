# Termin-Notizen + Hover-Preview (FT01/FT09/FT13)

## Zweck
Implementierung von Termin-Notizen als eigener Scope inkl. Wiederverwendung der Hover-Preview-Komponente auf WeeklyAppointmentCard sowie EntityCards (Kunde/Projekt), plus Editierbarkeit im AppointmentForm.

## Scope
- Neue DB-Join-Tabelle `appointment_note`.
- Neue API-Endpunkte fuer Termin-Notizen (list/create/delete).
- Erweiterung der Terminprojektionen um `appointmentNotesCount`.
- Wiederverwendbare Hover-Preview fuer Notizen mit zwei Modi:
  - `cumulative` (Kunde/Projekt/Termin)
  - `single-parent` (ein Parent)
- Integration im `AppointmentForm` ueber bestehende `NotesSection`.
- Ersetzung statischer Notiz-Counter in Kunden-/Projekt-EntityCards durch Hover-Trigger.

## Technische Entscheidungen
- Kein neues UI-System: Nutzung bestehender `HoverPreview` + `NotesSection`.
- Kalenderrelevante Notizzaehler werden serverseitig in vorhandenen Aggregationen geliefert.
- Optimistic-Locking bleibt zentral auf `note.version`.
- Termin-spezifisches Delete loescht nur Relation `appointment_note` (nicht zwingend den `note`-Datensatz), analog zum benoetigten Scope-Verhalten.

## Betroffene Dateien
- Schema/Contract:
  - `shared/schema.ts`
  - `shared/routes.ts`
- Backend:
  - `server/routes.ts`
  - `server/routes/appointmentNotesRoutes.ts`
  - `server/controllers/appointmentNotesController.ts`
  - `server/services/appointmentNotesService.ts`
  - `server/repositories/notesRepository.ts`
  - `server/repositories/appointmentsRepository.ts`
  - `server/services/appointmentsService.ts`
  - `server/services/notesService.ts`
- Frontend:
  - `client/src/components/notes/EntityNotesHoverPreview.tsx`
  - `client/src/components/calendar/CalendarWeekAppointmentNotesHover.tsx`
  - `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`
  - `client/src/components/AppointmentForm.tsx`
  - `client/src/components/CustomersPage.tsx`
  - `client/src/components/ProjectsPage.tsx`
  - `client/src/lib/calendar-appointments.ts`
- SQL:
  - `script/sql/2026-03-05_add_appointment_note.sql`
  - `script/sql/reset_safe_dev_test.sql`
  - `script/sql/reset_absolute_state.sql`
- Tests/Doku:
  - `tests/unit/ui/appointmentForm.notes.wiring.test.tsx`
  - `tests/unit/ui/appointmentPreviews.notesCounters.wiring.test.ts`
  - `tests/unit/ui/calendarWeekAppointmentNotesHover.preview.wiring.test.tsx`
  - `tests/unit/ui/calendarWeekAppointmentPanel.weekCalendarNotesPreview.wiring.test.tsx`
  - `tests/unit/ui/customersPage.currentAppointmentsCounter.wiring.test.tsx`
  - `tests/unit/ui/projectsPage.currentAppointmentsCounter.wiring.test.tsx`
  - `tests/integration/server/calendar.appointments.notes-counts.integration.test.ts`
  - `docs/TEST_MATRIX.md`

## Ausfuehrung in anderen Repos / Server
1. SQL-Migration ausfuehren: `script/sql/2026-03-05_add_appointment_note.sql`
2. Bei Voll-Reset-Szenarien sind die Reset-Skripte bereits aktualisiert.
3. Danach App starten und Termin-Notizen-Endpunkte pruefen.

## Testhinweise
- `npm run check` (gruen)
- Zielgerichtete Unit-Wiring-Tests (gruen)
- Isolierter Integrationstest fuer Kalender-Notizzaehler benoetigt vorhandene Tabelle `appointment_note` in der Test-DB.

## Bekannte Einschraenkungen
- Vollstaendige Integrationstest-Suite kann in dieser Instanz unabhaengige Bestandsfehler enthalten; fuer diese Aenderung relevant ist insbesondere der DB-Stand mit neuer Join-Tabelle in Test.
