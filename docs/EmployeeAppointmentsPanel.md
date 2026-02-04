# EmployeeAppointmentsPanel

## Zweck
`EmployeeAppointmentsPanel` ist der Kontext-Wrapper für Terminlisten im Mitarbeiter-Detaildialog. Er lädt die (aktuellen) Termine des Mitarbeiters und rendert sie über `AppointmentsPanel`.

## Props
- `employeeId?: number | null` – ID des Mitarbeiters, dessen Termine geladen werden sollen.
- `employeeName?: string | null` – Optionaler Anzeigename (aktuell nicht im Label genutzt).

## Toggle „Alle Termine“
Der Toggle wird von `AppointmentsPanel` bereitgestellt. Der Wrapper liefert die Liste der Mitarbeitertermine; bei aktivem Schalter werden alle vom Endpoint gelieferten Termine gezeigt, bei deaktiviertem Schalter filtert `AppointmentsPanel` auf „ab heute“.

## Header-Action & Zähler
`EmployeeAppointmentsPanel` liefert keine Body-CTA. Aktionen laufen ausschließlich über die Header-Action-Zone von `AppointmentsPanel`, falls erforderlich. Der Termin-Zähler wird im Header als Text in Klammern direkt hinter dem Titel angezeigt (z. B. „Aktuelle Termine (2)“), ohne Badge und ohne Wiederholung im Footer.

## Doppelklick-Verhalten
Ein Doppelklick auf einen Termin-Badge kann über `AppointmentsPanel` einen `onOpenAppointment`-Callback auslösen. Dieser Wrapper stellt standardmäßig keinen Edit-Callback bereit und bleibt damit rein darstellend.

## Datenladung
- Termine über `GET /api/employees/<id>/current-appointments`.
- Die Antwort wird in `AppointmentPanelItem` gemappt (Mode: `"mitarbeiter"`), wobei `title` als Label angezeigt wird.

## Einbindung in Formularen
Im Mitarbeiter-Dialog wird die Komponente im rechten Bereich als Terminpanel gerendert und ersetzt die bisherigen Demo-Listen.

## Hinweis zu Mitarbeitern
Mitarbeiter können im System **nur archiviert** werden und werden **nicht physisch gelöscht**. Implementationen dürfen daher nicht von einem Löschvorgang ausgehen.
