# Preview Refactor Phase 1

## Ziel
Ein einheitliches, generisches HoverPreview-Subsystem fuer InfoBadge-Previews und Kalender-Previews einführen, ohne sichtbare Funktionsaenderungen.

## Betroffene Dateien
- `client/src/components/ui/hover-preview.tsx`
- `client/src/components/ui/info-badge.tsx`
- `client/src/components/calendar/CalendarAppointmentCompactBar.tsx`
- `client/src/components/calendar/CalendarWeekTourLaneHeaderBar.tsx`
- `client/src/components/EmployeeAppointmentsTableDialog.tsx`
- `docs/ft17-ui-komposition.md`
- `docs/logs/preview-refactor-phase1.md`

## Aenderungen
- Neue generische UI-Komponente `HoverPreview` eingefuehrt.
- `InfoBadge` intern von eigener Popover-/Timer-Logik auf `HoverPreview` migriert.
- Kalender-Termin-Preview in `CalendarAppointmentCompactBar` auf `HoverPreview` (Cursor-Modus) migriert.
- Eigenes Kalender-Popover (`CalendarAppointmentPopover`) entfernt.
- Kalender-Tour-Lane-Header-Preview auf `HoverPreview` (Cursor-Modus) migriert.
- Employee-Terminlisten-Preview (`EmployeeAppointmentsTableDialog`) ebenfalls auf `HoverPreview` migriert, damit kein Restverweis auf das alte Popover verbleibt.
- FT(17)-Doku um Abschnitt "Preview-System (HoverPreview)" erweitert.

## Testpunkte
- `npm run check` laeuft erfolgreich (TypeScript + Frontend-Encoding-Check).
- InfoBadge-Previews oeffnen/schliessen weiterhin wie erwartet.
- Kalender-Termin-Previews (Monat/Jahr) verhalten sich unveraendert (Cursor-nah, viewport-begrenzt).
- Kalender-Tour-Lane-Header-Preview bleibt visuell/funktional erhalten.
- Kein eigenes Kalender-Popover-/Tooltip-Subsystem mehr fuer die migrierten Preview-Faelle.
