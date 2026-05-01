# Monatskalender Abwesenheiten Mitarbeiterlabel

## Anlass

Im Monatskalender zeigte der schmale Terminbalken bislang für alle Termine standardmäßig `Kundenname - Kundennummer`. Für FT-33-Abwesenheiten ist das fachlich unbrauchbar, weil dort nur der interne Systemkunde sichtbar wurde.

Entscheidung:

- Für Termine auf der Tour `Abwesenheiten` soll im Monatskalender stattdessen der am Termin hängende Mitarbeiter angezeigt werden.

## Umsetzung

Geändert in:

- [client/src/components/calendar/CalendarAppointmentCompactBar.tsx](/C:/Users/schro/source/repos/Plan/Releases/version02/client/src/components/calendar/CalendarAppointmentCompactBar.tsx)

Umgesetzte Regel:

- Normale Termine behalten weiterhin das bisherige Label `Kundenname - Kundennummer`.
- Termine auf der Tour `Abwesenheiten` zeigen stattdessen den ersten am Termin hängenden Mitarbeiternamen.
- Für diesen Sonderfall werden zusätzlich Kundennummer und PLZ im schmalen Monatsbalken nicht angezeigt, damit der vorhandene Platz vollständig für die relevante Mitarbeiterinfo genutzt wird.

## Tests

Aktualisiert:

- [tests/unit/ui/calendarAppointmentCompactBar.customerLabel.test.tsx](/C:/Users/schro/source/repos/Plan/Releases/version02/tests/unit/ui/calendarAppointmentCompactBar.customerLabel.test.tsx)

Verwendete bestehende Absicherung:

- [tests/unit/ui/calendarAppointmentCompactBar.conflictBadge.test.tsx](/C:/Users/schro/source/repos/Plan/Releases/version02/tests/unit/ui/calendarAppointmentCompactBar.conflictBadge.test.tsx)

Erfolgreich ausgeführt:

- `npm run typecheck`
- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test vitest run --config vitest.workspace.ts --project unit tests/unit/ui/calendarAppointmentCompactBar.customerLabel.test.tsx tests/unit/ui/calendarAppointmentCompactBar.conflictBadge.test.tsx`

## Rollen und Sichtbarkeit

- Keine Rollenänderung.
- Keine Änderung an serverseitiger Sichtbarkeit.
- Es wurde nur die bereits sichtbare Monatskalender-Beschriftung für FT-33-Abwesenheiten fachlich sinnvoller dargestellt.

## Ergebnis

Abwesenheiten im Monatskalender sind jetzt direkt über den betroffenen Mitarbeiter erkennbar, ohne dass normale Monatskalender-Terminlabels verändert werden.
