# Log: Termine-Filter "ab heute" / "Alle Termine"

## Geänderte Dateien
- client/src/components/AppointmentsPanel.tsx
- client/src/components/ProjectAppointmentsPanel.tsx
- client/src/components/CustomerAppointmentsPanel.tsx
- client/src/components/EmployeeAppointmentsPanel.tsx
- server/controllers/employeesController.ts
- server/services/appointmentsService.ts
- server/repositories/appointmentsRepository.ts
- shared/routes.ts
- docs/AppointmentsPanel.md
- docs/ProjectAppointmentsPanel.md
- docs/CustomerAppointmentsPanel.md
- docs/EmployeeAppointmentsPanel.md

## Query-/Endpoint-Strategie pro Panel
- **Projekt**: Default-Abfrage `GET /api/projects/:projectId/appointments?fromDate=<heute>` (Berlin-Zeitzone). Beim Toggle auf „Alle Termine“ wird eine zweite Abfrage mit `fromDate=1900-01-01` ausgelöst; die Anzeige nutzt jeweils die aktuell geladene Liste.
- **Kunde**: Projekte werden über `GET /api/projects?customerId=<id>&filter=all` geladen. Termine werden anschließend pro Projekt abgefragt. Standard ist `fromDate=<heute>`, beim Toggle wird `fromDate=1900-01-01` verwendet. Die Liste wird erst gerendert, wenn die jeweilige Sammel-Abfrage abgeschlossen ist.
- **Mitarbeiter**: Endpoint `GET /api/employees/:id/current-appointments` akzeptiert `fromDate`. Standard ist `fromDate=<heute>`, beim Toggle `fromDate=1900-01-01`. Der Endpoint nutzt `appointment_employee`, sodass zugewiesene Termine erscheinen.

## Manuelle Prüfschritte
1. Mitarbeiter öffnen, sicherstellen, dass der Mitarbeiter einen Eintrag in `appointment_employee` zu einem Termin hat.
2. Mitarbeiterpanel prüfen: Standardansicht zeigt nur Termine ab heute.
3. Toggle „Alle Termine“ aktivieren: vollständige Historie wird nachgeladen, inklusive vergangener, zugewiesener Termine.
4. Toggle zurücksetzen: Ansicht zeigt wieder nur Termine ab heute.

Hinweis: Die Prüfschritte wurden in dieser Session nicht ausgeführt.
