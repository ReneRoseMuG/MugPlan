Am 2026-02-04 um 08:47 habe ich eine neue, wiederverwendbare Terminliste eingeführt und bestehende Demo-Listen ersetzt.

Ich habe die Komponenten AppointmentsPanel, CustomerAppointmentsPanel, EmployeeAppointmentsPanel und ProjectAppointmentsPanel neu erstellt (client/src/components/AppointmentsPanel.tsx, client/src/components/CustomerAppointmentsPanel.tsx, client/src/components/EmployeeAppointmentsPanel.tsx, client/src/components/ProjectAppointmentsPanel.tsx), um die Terminanzeige zu zentralisieren und kontextspezifische Datenlogik auszulagern.

Im Projektformular wurde die bisherige projektspezifische Terminliste entfernt und durch ProjectAppointmentsPanel ersetzt, während im Kundenformular und im Mitarbeiter-Dialog die Demo-Listen durch CustomerAppointmentsPanel bzw. EmployeeAppointmentsPanel ersetzt wurden (client/src/components/ProjectForm.tsx, client/src/components/CustomerData.tsx, client/src/components/EmployeePage.tsx).

Ich habe die zentrale Filterlogik für „ab heute“ in AppointmentsPanel implementiert und dabei den heutigen Tag lokal über die Berlin-Zeitzone bestimmt. Der Schalter „Alle Termine“ ist standardmäßig deaktiviert, wodurch Termine erst ab einschließlich heute angezeigt werden; bei Aktivierung wird die Filterung entfernt und die gesamte geladene Liste gezeigt (client/src/components/AppointmentsPanel.tsx).

Damit „Alle Termine“ auch vergangene Termine anzeigen kann, werden in den Wrappern sämtliche Termine geladen, indem project-appointments-Aufrufe mit fromDate=1900-01-01 erfolgen. Dafür wurde die Serverseite so angepasst, dass bei gesetztem fromDate keine automatische Kappung auf „heute“ erfolgt (client/src/components/ProjectAppointmentsPanel.tsx, client/src/components/CustomerAppointmentsPanel.tsx, client/src/lib/project-appointments.ts, server/services/appointmentsService.ts).

Ich habe zusätzlich die Invalidierung in AppointmentForm auf die neue Abfragebasis angepasst, damit Terminänderungen die vollständige Liste aktualisieren (client/src/components/AppointmentForm.tsx).

Für die Dokumentation wurden eigene Komponentenseiten in docs/ erstellt, damit die Verwendung der neuen Panels nachvollziehbar ist (docs/AppointmentsPanel.md, docs/CustomerAppointmentsPanel.md, docs/EmployeeAppointmentsPanel.md, docs/ProjectAppointmentsPanel.md).

Annahmen: Das Backend liefert Termin-Daten im ISO-Format (YYYY-MM-DD) für startDate, sodass ein lexikographischer Vergleich zur Filterung zuverlässig funktioniert. Das Mitarbeiter-Endpoint /api/employees/:id/current-appointments bleibt vorerst optional, liefert aber in Zukunft ISO-Daten.

Tests oder manuelle Prüfpfade: Es wurden keine automatisierten Tests ausgeführt. Für eine manuelle Prüfung sollten im Projektformular ein vergangener und ein zukünftiger Termin existieren, sodass der Toggle „Alle Termine“ die Vergangenheit einblendet und das Entfernen von Terminen (inkl. Sperrlogik) sichtbar wird.
