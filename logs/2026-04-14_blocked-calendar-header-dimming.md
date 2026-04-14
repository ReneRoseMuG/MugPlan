# Auftragslog

## Zweck

Die farbigen Header-Bars der Terminkarten in Wochen- und Monatskalender sollten in blockierten Tour-Wochen sichtbar gedimmt werden, damit die kräftige Sperrfläche auch bei dichter Terminbelegung klar erkennbar bleibt.

## Scope

- Dimmung der farbigen Header-Flächen für Wochenkarten
- Dimmung der kompakten Monatsbalken in blockierten Slots
- Weitergabe des vorhandenen Blocked-Status an die betroffenen Kartenkomponenten
- Gezielte Erweiterung der vorhandenen Unit-Tests

## Technische Entscheidungen

- Keine neue Blockierungslogik eingeführt
- Vorhandenen `isBlocked`-Status aus Wochen- und Monatskalender direkt bis in die Kartenkomponenten verdrahtet
- Dimmung lokal auf den farbigen Header-/Bar-Flächen umgesetzt, damit die restliche Kartenlesbarkeit erhalten bleibt
- Bestehende Tests erweitert statt neue breite Teststruktur aufzubauen

## Betroffene Dateien

- `client/src/components/calendar/CalendarWeekAppointmentPanelHeader.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`
- `client/src/components/calendar/CalendarWeekSpanningTile.tsx`
- `client/src/components/calendar/CalendarAppointmentCompactBar.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/calendar/CalendarMonthSheetView.tsx`
- `tests/unit/ui/calendarAppointmentCompactBar.conflictBadge.test.tsx`
- `tests/unit/ui/calendarMonthSheetView.wiring.test.tsx`
- `tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx`
- `tests/unit/ui/calendarWeekView.blockedWeekBehavior.test.tsx`
- `docs/TEST_MATRIX.md`

## Testen

Erfolgreich ausgeführt:

- `npm run test:unit -- tests/unit/ui/calendarAppointmentCompactBar.conflictBadge.test.tsx`
- `npm run test:unit -- tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx`
- `npm run test:unit -- tests/unit/ui/calendarWeekView.blockedWeekBehavior.test.tsx`
- `npm run test:unit -- tests/unit/ui/calendarMonthSheetView.wiring.test.tsx`

## Bekannte Einschränkungen

- Kein voller Audit und kein voller Testlauf ausgeführt
- Architektur- und Implementierungsdokumente wurden in diesem Schritt nicht inhaltlich nachgeführt; vorhandene lokale Änderungen bleiben unverändert Bestandteil des Branch-Stands
