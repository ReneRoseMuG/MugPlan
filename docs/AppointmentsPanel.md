# AppointmentsPanel

## Zweck
`AppointmentsPanel` ist eine rein darstellende UI-Komponente für Terminlisten in Formular-Seitenleisten. Sie kapselt die standardisierte Hülle mit `SidebarChildPanel`, rendert die Einträge als `TerminInfoBadge` und stellt im Footer den Toggle „Alle Termine“ bereit, ohne selbst Kontext- oder Fetch-Logik zu kennen.

## Props
- `title: string` – Titel im Panel-Header.
- `icon: ReactNode` – Icon im Header.
- `items: AppointmentPanelItem[]` – Termin-Daten für die Anzeige.
- `isLoading?: boolean` – Zeigt den Ladezustand an.
- `helpKey?: string` – Optionaler Hilfetext-Schlüssel für den Header.
- `headerActions?: ReactNode` – Optionaler Actions-Slot im Header (überschreibt Default-Actions).
- `addAction?: { onClick: () => void; disabled?: boolean; ariaLabel?: string; testId?: string }` – Optionaler Add-Button (Icon) im Header.
- `closeAction?: { onClick: () => void; disabled?: boolean; ariaLabel?: string; testId?: string }` – Optionaler Close-Button (Icon) im Header.
- `topContent?: ReactNode` – Inhalt oberhalb der Liste im Body (z. B. ein „Neuer Termin“-Button).
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
Der Schalter ist standardmäßig **aus**. In diesem Zustand filtert `AppointmentsPanel` die übergebenen Termine auf **heute und Zukunft** (lokal, per Berlin-Zeitzone). Bei aktiviertem Schalter wird der Filter entfernt und es werden alle übergebenen Termine angezeigt. Die Komponente lädt **keine** Daten nach – der Wrapper liefert die vollständige Liste.

## Datenquelle
`AppointmentsPanel` kennt keine APIs oder Kontexte. Es erwartet, dass Wrapper-Komponenten die Daten bereitstellen und in `AppointmentPanelItem` mappen.

## Einbindung
Die Komponente wird von Wrappern wie `ProjectAppointmentsPanel` oder `CustomerAppointmentsPanel` verwendet und in Formular-Seitenleisten als eigenes Panel platziert.

## Hinweis zu Mitarbeitern
Mitarbeiter können im System **nur archiviert** werden und werden **nicht physisch gelöscht**. Implementationen dürfen daher nicht von einem Löschvorgang ausgehen.
