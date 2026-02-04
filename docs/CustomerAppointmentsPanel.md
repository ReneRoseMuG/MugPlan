# CustomerAppointmentsPanel

## Zweck
`CustomerAppointmentsPanel` ist der Kontext-Wrapper für Terminlisten im Kundenformular. Er ermittelt die Projekte des Kunden, lädt die dazugehörigen Termine und übergibt die Daten an `AppointmentsPanel`. Kontextlogik bleibt damit außerhalb der UI-Komponente.

## Props
- `customerId?: number | null` – ID des Kunden, dessen Termine geladen werden sollen.
- `customerName?: string | null` – Optionaler Anzeigename des Kunden (derzeit nicht als Label verwendet).

## Toggle „Alle Termine“
Der Toggle wird von `AppointmentsPanel` gerendert. Der Wrapper lädt **alle** Termine zu den Projekten des Kunden, damit die Umschaltung zwischen „ab heute“ und „alle Termine“ rein clientseitig erfolgen kann.

## Datenladung
- Projekte des Kunden über `GET /api/projects?customerId=<id>&filter=all`.
- Termine je Projekt über `GET /api/projects/<projectId>/appointments?fromDate=1900-01-01`.
- Die Termine werden in `AppointmentPanelItem` gemappt (Mode: `"projekt"`), wobei der Projekttitel als Label angezeigt wird.

## Einbindung in Formularen
Im Kundenformular wird die Komponente als Seitenleisten-Panel gerendert (neben „Verknüpfte Projekte“). Sie übernimmt ausschließlich die Terminanzeige und nutzt `AppointmentsPanel` für das Layout.

## Hinweis zu Mitarbeitern
Mitarbeiter können im System **nur archiviert** werden und werden **nicht physisch gelöscht**. Implementationen dürfen daher nicht von einem Löschvorgang ausgehen.
