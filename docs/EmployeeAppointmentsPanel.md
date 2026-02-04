# EmployeeAppointmentsPanel

## Zweck
`EmployeeAppointmentsPanel` ist der Kontext-Wrapper für Terminlisten im Mitarbeiter-Detaildialog. Er lädt die (aktuellen) Termine des Mitarbeiters und rendert sie über `AppointmentsPanel`.

## Props
- `employeeId?: number | null` – ID des Mitarbeiters, dessen Termine geladen werden sollen.
- `employeeName?: string | null` – Optionaler Anzeigename (aktuell nicht im Label genutzt).

## Toggle „Alle Termine“
Der Toggle wird von `AppointmentsPanel` bereitgestellt. Der Wrapper liefert die Liste der Mitarbeitertermine; bei aktivem Schalter werden alle vom Endpoint gelieferten Termine gezeigt, bei deaktiviertem Schalter filtert `AppointmentsPanel` auf „ab heute“.

## Datenladung
- Termine über `GET /api/employees/<id>/current-appointments`.
- Die Antwort wird in `AppointmentPanelItem` gemappt (Mode: `"mitarbeiter"`), wobei `title` als Label angezeigt wird.

## Einbindung in Formularen
Im Mitarbeiter-Dialog wird die Komponente im rechten Bereich als Terminpanel gerendert und ersetzt die bisherigen Demo-Listen.

## Hinweis zu Mitarbeitern
Mitarbeiter können im System **nur archiviert** werden und werden **nicht physisch gelöscht**. Implementationen dürfen daher nicht von einem Löschvorgang ausgehen.
