# Auftrag: Kalender-Menü für historische Termine und Löschaktion

## Zweck

Readonly-Verhalten der Wochenkalender-Terminkarten und Mehrtagestermin-Karten an das Terminformular angleichen. Historische Termine dürfen kein Header-Menü mehr zeigen. Für editierbare Termine wurde die bestehende Löschfunktion aus dem Terminformular als zusätzliche Menüoption übernommen.

## Scope

- Wochenkalender-Terminkarte ohne Mehrtages-Span
- Mehrtagestermin-Karte im Wochenkalender
- Gezielte Unit-Absicherung für Menütrigger und Löschaktion
- Pflege der Test-Matrix

## Technische Entscheidungen

- Die Historik-Sperre folgt derselben Startdatum-Regel wie im Terminformular.
- Das Header-Menü wird für historische Termine vollständig ausgeblendet statt nur partiell deaktiviert.
- Die Löschaktion verwendet denselben Delete-Pfad wie das Terminformular: Fresh-Version laden, DELETE mit Version senden, Versionskonflikte und Readonly-Fehler gezielt behandeln, Kalender- und Monitoring-Queries invalidieren.
- Der Eingriff bleibt lokal in den beiden Kalenderkarten; es wurden keine neuen Strukturen oder Architekturpfade eingeführt.

## Betroffene Dateien

- `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`
- `client/src/components/calendar/CalendarWeekSpanningTile.tsx`
- `tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx`
- `docs/TEST_MATRIX.md`

## Hinweise zum Testen

- Gezielter Testlauf: `npm run test:unit -- tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx`
- Erwartung im UI:
  - Historische Termine zeigen im Header kein Menü.
  - Nicht-historische Termine zeigen weiterhin Öffnen, Stornieren, Parken und zusätzlich Termin löschen.
  - Die Löschaktion öffnet einen Bestätigungsdialog und nutzt dieselbe fachliche Sperrlogik wie das Terminformular.

## Bekannte Einschränkungen

- Es wurde nur der direkt betroffene Unit-Test gezielt ausgeführt, kein voller Audit und kein voller Testlauf.
- Das Log wurde direkt aus dem umgesetzten Fix abgeleitet; zusätzliche Dokumentationssynchronisation wurde nicht durchgeführt.
