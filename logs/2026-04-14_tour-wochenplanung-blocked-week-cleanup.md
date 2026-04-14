# Auftragslog: Blockierte Wochenplanung räumt Zuordnungen auf

## Zweck

Die Tour-Wochenplanung sollte beim Blockieren einer Woche nicht nur Termin-Mitarbeiter leeren, sondern auch die zugehörigen Wochen-Zuordnungen entfernen. Zusätzlich sollte die UI keine stille Termin-Tag-Mutation als sichtbare Termin-Anpassung im Toast kommunizieren.

## Scope

- Blockierpfad der Tour-Wochenplanung um das Entfernen der `tour_week_employees`-Zuordnungen ergänzt
- Integrationstest für Blockieren/Freigeben auf leere Wochen-Zuordnungen umgestellt
- Toast-Texte in Tour-Dialog und Wochenkalender für Blockieren/Freigeben auf reine Statusbestätigung reduziert
- `docs/TEST_MATRIX.md` für die betroffenen Tests nachgeführt

## Technische Entscheidungen

- Die Bereinigung der Wochen-Zuordnungen erfolgt im bestehenden Blockierpfad und bleibt damit an derselben fachlichen Aktion gebündelt.
- Beim Freigeben werden keine Mitarbeiter rekonstruiert; die Woche bleibt leer.
- Der Serververtrag mit `affectedAppointmentCount` bleibt unverändert, die UI spielt die stille Tag-Mutation aber nicht mehr als sichtbare Termin-Anpassung aus.

## Betroffene Dateien

- `server/repositories/tourWeekEmployeesRepository.ts`
- `server/services/tourWeeksService.ts`
- `client/src/components/TourManagement.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `tests/integration/server/tourWeekEmployees.integration.test.ts`
- `tests/unit/ui/tourManagement.versioning.test.tsx`
- `docs/TEST_MATRIX.md`

## Tests und Prüfungen

Ausgeführt:

- `npm run test:integration -- --reporter=verbose tests/integration/server/tourWeekEmployees.integration.test.ts`
- `npm run test:unit -- tests/unit/ui/tourManagement.versioning.test.tsx`

## Bekannte Hinweise

- Bereits vorhandene Altbestände blockierter Wochen mit stale `tour_week_employees`-Zeilen werden durch diesen Auftrag nicht automatisch bereinigt.
- Kein voller Audit und kein voller Testlauf über alle Pflichtkommandos ausgeführt.
