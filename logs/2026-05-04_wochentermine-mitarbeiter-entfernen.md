# Wochenterminkarten: Mitarbeiter entfernen

Datum: 04.05.26
Branch: `refactor/week-calendar-tour-personnel`
Commit: noch nicht erstellt; aktueller Ausgangs-Commit `9d9abbfb`

## Zweck

Dieses Log dokumentiert die Ergänzung der Wochenterminkarten um eine direkte Entfernen-Aktion auf Mitarbeiter-Badges. Ziel war, Mitarbeiter aus einem Termin entfernen zu können, ohne den Termin erst im Formular öffnen zu müssen.

## Scope

- Mitarbeiter-Badges auf normalen Wochenterminkarten erhalten optional einen Minus-Button.
- Mitarbeiter-Badges auf mehrtägigen Wochenterminkarten erhalten dieselbe optionale Aktion.
- Die Mutation nutzt den bestehenden Endpoint `DELETE /api/appointments/:id/employees/:employeeId`.
- Nach erfolgreicher Entfernung werden Kalendertermine, Wochen-Lane-Mitarbeiter-Previews und Monitoring aktualisiert.
- Nicht Bestandteil waren neue Endpoints, Schemaänderungen, neue Rollenregeln oder Änderungen am Terminformular.

## Rollen und Sperren

- Zulässige Rollen für die Aktion bleiben `ADMIN` und `DISPATCHER`.
- `READER` erhält keinen Remove-Handler aus der Wochenansicht.
- Historische Nicht-Parkplatz-Termine bleiben für Disponenten gesperrt.
- Admins behalten die bestehende historische Ausnahme.
- Stornierte oder anderweitig gesperrte Karten zeigen keine Badge-Entfernen-Aktion.
- Die serverseitige Durchsetzung bleibt maßgeblich über `appointmentsService.removeEmployeeFromAppointment`.

## Technische Entscheidungen

- Die Kartenkomponenten erhalten nur eine optionale Prop `onRemoveAppointmentEmployee`.
- Die eigentliche Mutation liegt zentral in `CalendarWeekView`, analog zur bestehenden Mitarbeiter-Zuweisung.
- Die Badges verwenden die bereits vorhandene `EmployeeInfoBadge`-Aktion `remove`, statt eigene Button-UI zu bauen.
- Die bestehende Query-Invalidierung wurde wiederverwendet: `calendarAppointments` und `calendarWeekLaneEmployeePreviews`.
- `refreshMonitoringWithNotification` wird nach erfolgreicher Entfernung ausgeführt, weil die Mitarbeiterzahl monitoringrelevant sein kann.

## Betroffene Dateien

- `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`
- `client/src/components/calendar/CalendarWeekSpanningTile.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx`

## Hinweise zum Testen

Gezielt grün gelaufen sind:

- `npm run test:unit -- tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx`
  - Ergebnis: 1 Datei, 15 Tests grün
- `npm run typecheck`
  - Ergebnis: grün

## Bekannte Einschränkungen

- Ein voller Testlauf über alle Testebenen wurde für diesen kleinen UI-Mutationspfad nicht ausgeführt.
- Der Worktree enthielt bereits weitere offene Änderungen außerhalb dieses Auftrags; diese wurden nicht zurückgesetzt oder inhaltlich mitbearbeitet.
- Die sichtbare UI-Aktion ist bewusst nur eine Komfortfunktion. Direkte API-Aufrufe bleiben weiterhin durch die bestehende serverseitige Rollen- und Sperrlogik abgesichert.
