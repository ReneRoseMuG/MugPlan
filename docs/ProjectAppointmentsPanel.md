# ProjectAppointmentsPanel

## Zweck
`ProjectAppointmentsPanel` ist der Kontext-Wrapper für Terminlisten im Projektformular. Er lädt die projektbezogenen Termine, ermöglicht das Löschen (inklusive Sperrlogik) und rendert die Liste über `AppointmentsPanel`.

## Props
- `projectId?: number | null` – ID des Projekts.
- `projectName?: string | null` – Anzeigename für die Badge-Zeile.
- `isEditing: boolean` – Steuert, ob Termine geladen und Aktionen angezeigt werden.
- `onOpenAppointment?: (projectId: number) => void` – Callback für „Neuer Termin“.

## Toggle „Alle Termine“
Der Toggle wird von `AppointmentsPanel` gerendert. `ProjectAppointmentsPanel` lädt alle Termine (inkl. Vergangenheit), damit der Filter „ab heute“ ausschließlich im UI erfolgt.

## Datenladung
- Termine über `GET /api/projects/<projectId>/appointments?fromDate=1900-01-01`.
- Löschen über `DELETE /api/appointments/<appointmentId>` mit `x-user-role`-Header.
- Mapping in `AppointmentPanelItem` (Mode: `"projekt"`) inkl. Border-Farbe (vergangene Termine grau, zukünftige grün) und Sperr-Status.

## Einbindung in Formularen
Im Projektformular ersetzt `ProjectAppointmentsPanel` die bisherige projektspezifische Terminliste und nutzt `AppointmentsPanel` als gemeinsame Darstellung.

## Hinweis zu Mitarbeitern
Mitarbeiter können im System **nur archiviert** werden und werden **nicht physisch gelöscht**. Implementationen dürfen daher nicht von einem Löschvorgang ausgehen.
