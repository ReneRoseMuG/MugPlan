# ProjectAppointmentsPanel

## Zweck
`ProjectAppointmentsPanel` ist der Kontext-Wrapper für Terminlisten im Projektformular. Er lädt die projektbezogenen Termine, ermöglicht das Löschen (inklusive Sperrlogik) und rendert die Liste über `AppointmentsPanel`.

## Props
- `projectId?: number | null` – ID des Projekts.
- `projectName?: string | null` – Anzeigename für die Badge-Zeile.
- `isEditing: boolean` – Steuert, ob Termine geladen und Aktionen angezeigt werden.
- `onOpenAppointment?: (context: { projectId?: number; appointmentId?: number }) => void` – Callback für „Neuer Termin“ (nur `projectId`) und für das Öffnen bestehender Termine (mit `appointmentId`).

## Toggle „Alle Termine“
Der Toggle wird von `AppointmentsPanel` gerendert und meldet seinen Zustand an den Wrapper. Standardmäßig werden nur Termine **ab heute** (Berlin-Zeitzone) serverseitig geladen. Erst wenn der Toggle aktiviert wird, lädt `ProjectAppointmentsPanel` die vollständige Historie nach und zeigt anschließend alle Termine an.

## Header-Action & Zähler
Der „Neuer Termin“-Trigger wird über die Header-Action-Zone (`addAction`) von `AppointmentsPanel` bereitgestellt, nicht im Panel-Body. Der Termin-Zähler wird im Panel-Header als Text in Klammern direkt hinter dem Titel angezeigt (z. B. „Termine (2)“), ohne Badge oder Footer-Wiederholung.

## Doppelklick-Verhalten
Ein Doppelklick auf einen Termin-Badge ruft `onOpenAppointment` mit `appointmentId` (und dem aktuellen `projectId`) auf, sodass das bestehende Terminformular im Edit-Modus geöffnet werden kann.

## Datenladung
- Standard (ab heute): `GET /api/projects/<projectId>/appointments?fromDate=<heute>` (Berlin-Zeitzone).
- „Alle Termine“: `GET /api/projects/<projectId>/appointments?fromDate=1900-01-01`.
- Löschen über `DELETE /api/appointments/<appointmentId>` mit `x-user-role`-Header.
- Mapping in `AppointmentPanelItem` (Mode: `"projekt"`) inkl. Border-Farbe (vergangene Termine grau, zukünftige grün) und Sperr-Status.

## Einbindung in Formularen
Im Projektformular ersetzt `ProjectAppointmentsPanel` die bisherige projektspezifische Terminliste und nutzt `AppointmentsPanel` als gemeinsame Darstellung.

## Hinweis zu Mitarbeitern
Mitarbeiter können im System **nur archiviert** werden und werden **nicht physisch gelöscht**. Implementationen dürfen daher nicht von einem Löschvorgang ausgehen.
