# Ergebnisdokumentation: Wochenkalender Abwesenheitsspur

## Zweck

Diese Dokumentation beschreibt die Layout- und Render-Korrektur der schmalen Abwesenheitsspur im Wochenkalender.

## Auftrag

Im Wochenkalender sollte die passive Abwesenheitsspur klarer in das bestehende Kalenderlayout integriert werden. Die Spur sollte einen eigenen kompakten Header in der Farbe der Tour `Abwesenheiten` erhalten, Abwesenheiten am Wochenende sollten die Wochenendspalten nicht mehr verbreitern, und die Mitarbeiter-Badges sollten im selben Namensmodus wie die Mitarbeiter-Badges in Terminkarten erscheinen. Später wurde festgelegt, dass die Spur immer sichtbar ist und der optionale Toggle entfällt. Zusätzlich wurde die Render-Regel für Mitarbeiter-Badges geändert: In Wochen-Terminkarten und in der Abwesenheitsspur werden die Standard-Badges ohne farbige Avatar-Kreise gerendert.

## Umsetzung

- `client/src/components/calendar/CalendarWeekView.tsx`
  - Die Abwesenheitsspur wurde in eine eigene `CalendarWeekAbsenceRow` ausgelagert.
  - Die Spur rendert immer direkt unter dem Tageskopf.
  - Der Abwesenheiten-Toggle im Kalenderkopf wurde entfernt.
  - Der Spur-Header zeigt `Abwesenheiten` kompakt in der Farbe der Tour `Abwesenheiten`.
  - Wochenendspalten werden nur durch reguläre Termine verbreitert; reine Abwesenheiten am Samstag oder Sonntag lassen die schmalen Wochenendspalten unverändert.
  - Die Mitarbeiter-Badges in der Spur sind links ausgerichtet, nutzen `renderMode="standard"` und werden ohne Avatar-Kreis gerendert.
- `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`
  - Standard-Mitarbeiter-Badges in Wochenterminkarten rendern ohne Avatar-Kreis.
- `client/src/components/calendar/CalendarWeekSpanningTile.tsx`
  - Standard-Mitarbeiter-Badges in mehrtägigen Wochenterminkarten rendern ohne Avatar-Kreis.
- `client/src/components/ui/info-badge.tsx`
  - `InfoBadge` unterstützt ein optional fehlendes Icon.
- `client/src/components/ui/person-info-badge.tsx`
  - `PersonInfoBadge` unterstützt `showAvatar={false}`.
- `client/src/components/ui/employee-info-badge.tsx`
  - `EmployeeInfoBadge` reicht `showAvatar` an die Personen-Badge weiter.

## Tests

Aktualisiert wurden:

- `tests/unit/ui/calendarWeekView.headerControls.test.tsx`
- `tests/unit/ui/calendarWeekView.layoutGrid.test.tsx`
- `tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx`
- `tests/unit/ui/person-info-badge.test.tsx`

Erfolgreich ausgeführt:

- `npm run test:unit -- tests/unit/ui/calendarWeekView.headerControls.test.tsx tests/unit/ui/calendarWeekView.layoutGrid.test.tsx --reporter=verbose`
- `npm run test:unit -- tests/unit/ui/person-info-badge.test.tsx tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx --reporter=verbose`
- `npm run typecheck`

Die statischen Wochenkalender-Render-Tests melden weiterhin die bekannte React-SSR-Warnung aus `HoverPreview`; die Testläufe waren erfolgreich.

## Rollen- und Rechteprüfung

Keine Rollen-, Sichtbarkeits- oder Berechtigungslogik wurde geändert. Die Änderung betrifft ausschließlich bestehende UI-Darstellung im Wochenkalender und die lokale Badge-Darstellung. Admin-, Disponent- und Reader-Verhalten bleibt fachlich unverändert; es wurden keine neuen Aktionen, Mutationen, Endpunkte oder serverseitigen Pfade eingeführt.

## Ergebnis

Die Abwesenheitsspur ist im Wochenkalender dauerhaft sichtbar, besitzt einen eigenen kompakten Header und verändert die Breite von Wochenendspalten nicht mehr durch reine Abwesenheiten. Mitarbeiter-Badges wirken in Terminkarten und Abwesenheitsspur ruhiger, weil Standard-Badges ohne farbige Avatar-Kreise dargestellt werden.
