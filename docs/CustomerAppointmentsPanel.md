# CustomerAppointmentsPanel

## Zweck
`CustomerAppointmentsPanel` ist der Kontext-Wrapper für Terminlisten im Kundenformular. Er ermittelt die Projekte des Kunden, lädt die dazugehörigen Termine und übergibt die Daten an `AppointmentsPanel`. Kontextlogik bleibt damit außerhalb der UI-Komponente.

## Props
- `customerId?: number | null` – ID des Kunden, dessen Termine geladen werden sollen.
- `customerName?: string | null` – Optionaler Anzeigename des Kunden (derzeit nicht als Label verwendet).

## Toggle „Alle Termine“
Der Toggle wird von `AppointmentsPanel` gerendert und meldet seinen Zustand an den Wrapper. Standardmäßig werden nur Termine **ab heute** (Berlin-Zeitzone) serverseitig geladen. Wird der Toggle aktiviert, lädt `CustomerAppointmentsPanel` die vollständige Historie der Termine zu den Projekten des Kunden nach und zeigt anschließend alle Termine an.

## Header-Action & Zähler
`CustomerAppointmentsPanel` liefert keine Body-CTA. Aktionen laufen ausschließlich über die Header-Action-Zone von `AppointmentsPanel`, falls erforderlich. Der Termin-Zähler wird im Header als Text in Klammern direkt hinter dem Titel angezeigt (z. B. „Termine (2)“), ohne Badge und ohne Wiederholung im Footer.

## Doppelklick-Verhalten
Ein Doppelklick auf einen Termin-Badge kann über `AppointmentsPanel` einen `onOpenAppointment`-Callback auslösen. Dieser Wrapper stellt standardmäßig keinen Edit-Callback bereit und bleibt damit rein darstellend.

## Datenladung
- Projekte des Kunden über `GET /api/projects?customerId=<id>&filter=all`.
- Standard (ab heute): `GET /api/projects/<projectId>/appointments?fromDate=<heute>` (Berlin-Zeitzone).
- „Alle Termine“: `GET /api/projects/<projectId>/appointments?fromDate=1900-01-01`.
- Die Termine werden in `AppointmentPanelItem` gemappt (Mode: `"projekt"`), wobei der Projekttitel als Label angezeigt wird.

## Einbindung in Formularen
Im Kundenformular wird die Komponente als Seitenleisten-Panel gerendert (neben „Verknüpfte Projekte“). Sie übernimmt ausschließlich die Terminanzeige und nutzt `AppointmentsPanel` für das Layout.

## Hinweis zu Mitarbeitern
Mitarbeiter können im System **nur archiviert** werden und werden **nicht physisch gelöscht**. Implementationen dürfen daher nicht von einem Löschvorgang ausgehen.
