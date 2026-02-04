# AppointmentsPanel

## Zweck
`AppointmentsPanel` ist eine rein darstellende UI-Komponente für Terminlisten in Formular-Seitenleisten. Sie kapselt die standardisierte Hülle mit `SidebarChildPanel`, rendert die Einträge als `TerminInfoBadge` und stellt im Footer den Toggle „Alle Termine“ bereit, ohne selbst Kontext- oder Fetch-Logik zu kennen. Der Header zeigt die Anzahl der aktuell gerenderten Termine als schlichten Text in Klammern direkt hinter dem Titel (z. B. „Termine (2)“), ohne Badge oder farbige Hervorhebung.

## Props
- `title: string` – Titel im Panel-Header.
- `icon: ReactNode` – Icon im Header.
- `items: AppointmentPanelItem[]` – Termin-Daten für die Anzeige.
- `showAll: boolean` – Steuerung des Toggle-Zustands („Alle Termine“).
- `onShowAllChange: (showAll: boolean) => void` – Meldet Toggle-Änderungen an den Wrapper.
- `isLoading?: boolean` – Zeigt den Ladezustand an.
- `helpKey?: string` – Optionaler Hilfetext-Schlüssel für den Header.
- `headerActions?: ReactNode` – Optionaler Actions-Slot im Header (überschreibt Default-Actions).
- `addAction?: { onClick: () => void; disabled?: boolean; ariaLabel?: string; testId?: string }` – Optionaler Add-Button (Icon) im Header.
- `closeAction?: { onClick: () => void; disabled?: boolean; ariaLabel?: string; testId?: string }` – Optionaler Close-Button (Icon) im Header.
- `onOpenAppointment?: (appointmentId: number | string) => void` – Callback, der bei Doppelklick auf einen `TerminInfoBadge` ausgelöst wird.
- `note?: ReactNode` – Hinweistext unterhalb der Liste.
- `emptyStateLabel?: string` – Text für leere Liste im „Alle Termine“-Modus.
- `emptyStateFilteredLabel?: string` – Text für leere Liste im „ab heute“-Modus.

### AppointmentPanelItem
- `id: number | string`
- `startDate: string` (ISO `YYYY-MM-DD` erwartet)
- `endDate?: string | null`
- `startTimeHour?: number | null`
- `mode?: "kunde" | "projekt" | "mitarbeiter"`
- `customerLabel?: string | null`
- `projectLabel?: string | null`
- `employeeLabel?: string | null`
- `icon?: ReactNode`
- `color?: string | null`
- `action?: "add" | "remove" | "none"`
- `onAdd?: () => void`
- `onRemove?: () => void`
- `actionDisabled?: boolean`
- `testId?: string`

## Toggle „Alle Termine“
Der Schalter ist standardmäßig **aus** und wird von den Wrappern kontrolliert. `AppointmentsPanel` filtert **nicht** selbst, sondern zeigt genau die `items`, die der Wrapper basierend auf dem Toggle-Status liefert. Der Footer enthält ausschließlich diesen Toggle und keine zusätzlichen Zähler oder Statusanzeigen.

## Header-Actions statt Body-CTA
`AppointmentsPanel` rendert **keine** Call-to-Action-Buttons im Panel-Body. Aktionen wie „Neuer Termin“ laufen ausschließlich über die Header-Action-Zone von `SidebarChildPanel` (`headerActions`, `addAction`, `closeAction`).

## Doppelklick-Verhalten
Ein Doppelklick auf einen `TerminInfoBadge` löst `onOpenAppointment` aus. Das Panel selbst enthält keine Routing- oder Kontextlogik, sondern meldet nur die `appointmentId` nach oben.

## Datenquelle
`AppointmentsPanel` kennt keine APIs oder Kontexte. Es erwartet, dass Wrapper-Komponenten die Daten bereitstellen und in `AppointmentPanelItem` mappen.

## Einbindung
Die Komponente wird von Wrappern wie `ProjectAppointmentsPanel` oder `CustomerAppointmentsPanel` verwendet und in Formular-Seitenleisten als eigenes Panel platziert.

## Hinweis zu Mitarbeitern
Mitarbeiter können im System **nur archiviert** werden und werden **nicht physisch gelöscht**. Implementationen dürfen daher nicht von einem Löschvorgang ausgehen.
