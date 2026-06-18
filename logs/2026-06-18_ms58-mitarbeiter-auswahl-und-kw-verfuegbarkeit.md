# Mitarbeiter-Auswahl vereinheitlichen und Wochenplanungs-Verfügbarkeit korrigieren

- Datum: 18.06.26
- Branch: `refactor/ms58-employee-picker-eligibility`
- Bezug: MS-58 (Mitarbeiter Auswahldialoge vereinheitlichen), TKT-99, TASK-394

## Zweck

Die Mitarbeiter-Auswahl wird auf eine Liste vereinheitlicht, die nicht verfügbare Mitarbeiter
sichtbar gesperrt mit Grund zeigt, statt sie zu verstecken. Zusätzlich wird die
Wochenplanungs-Verfügbarkeit korrigiert, damit Teil-Abwesenheit die Aufnahme in den
Wochen-Stamm nicht mehr blockiert.

## Umgesetzte Teile

1. `EmployeePickerDialogList` kann nicht verfügbare Mitarbeiter sichtbar gesperrt mit Grund
   anzeigen (neue optionale Prop `ineligibleReasonById`), in Listen- und Board-Ansicht, inklusive
   Auswahl-Guard. Ohne die Prop unverändert.
2. Kartenmenü „Mitarbeiter zuweisen" im Wochenkalender öffnet diesen Picker statt des gruppierten
   Kaskaden-Dialogs, gespeist aus der vorhandenen Server-Konfliktvorschau. Behebt TKT-99.
3. Terminformular: Die Mitarbeiter-Auswahl ruft beim Öffnen die Konfliktvorschau ab (sofern eine
   Tour gewählt ist) und zeigt belegte Mitarbeiter gesperrt mit Grund.
4. Wochen-Tourenplanung (Server-Regel): Nur wer an allen fünf Werktagen abwesend ist, wird aus der
   Aufnahme ausgeschlossen. Teil-Abwesenheit und Termin-Überschneidungen schließen nicht mehr aus;
   sie werden tagesgenau erst beim Buchen auf die einzelnen Termine geprüft.

## Technische Entscheidungen

- Konfliktanzeige nur für zeitbasierte Kontexte (Termin, Tour-KW); Mitgliedschaftsauswahl (Team/Tour)
  bleibt unverändert.
- Die mehrstufige Tour-KW-Kaskade bleibt als Orchestrierung erhalten.
- Wochen-Verfügbarkeit: kein neuer Server-Endpunkt, kein Schema- oder Contract-Eingriff — nur interne
  Logik in `tourWeekEmployeesService.ts`. „An allen Werktagen abwesend" wird über die bestehende
  Abwesenheits-Überlappungsabfrage pro Werktag (Mo–Fr) ermittelt.
- Kein Loch beim Buchen: Abwesenheiten sind ganztägige Termine auf der Abwesenheits-Tour und werden
  von `getConflictingEmployeesTx` bereits als Konflikt erkannt; ein Urlaubstag bleibt beim Buchen
  daher automatisch gesperrt.

## Betroffene Dateien

Code:
- `client/src/components/EmployeePickerDialogList.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/AppointmentForm.tsx`
- `server/services/tourWeekEmployeesService.ts`

Tests und Doku:
- `tests/unit/ui/employeePickerDialogList.eligibility.wiring.test.tsx` (neu)
- `tests/unit/ui/calendarWeekView.compactHeader.test.ts` (erweitert)
- `tests/integration/server/tourWeekEmployees.integration.test.ts` (angepasst und erweitert)
- `docs/TEST_MATRIX.md`
- `.claude/launch.json` (Dev-Preview-Konfig für die Verifikation)

## Hinweise zum Testen

- Unit: `npm run test:unit -- employeePickerDialogList calendarWeekView.compactHeader appointmentForm`
- Integration: `npm run test:integration -- tourWeekEmployees --reporter=verbose`
- Aktueller Stand: betroffene Unit-Tests grün, 33 Integrationstests grün, Typecheck (`tsc --noEmit`) sauber.
- Der Kartenmenü-Picker wurde zusätzlich im laufenden Programm geprüft (öffnet die vereinheitlichte Liste).

## Bekannte Einschränkungen / offen

- Beim Buchen wird ein Urlaubstag aktuell als „Überschneidung" angezeigt, nicht ausdrücklich als
  „Abwesenheit" (funktional korrekt gesperrt; die Beschriftung könnte noch getrennt werden).
- Die Richtlinien-Doku (`docs/UI-Komponenten-Referenz.md`) ist noch nicht nachgezogen.
- Ein voller Browser-E2E-Lauf steht noch aus, um sicherzustellen, dass kein weiterer Test das alte
  Verhalten erwartet. Der FT33-Abwesenheits-E2E wurde geprüft und ist nicht betroffen.
