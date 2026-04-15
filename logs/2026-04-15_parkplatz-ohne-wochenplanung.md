# Auftragslog: Parkplatz ohne Wochenplanung

## Zweck

Die Tour `Parkplatz` sollte aus der Kalenderwochen-Planung fachlich sauber ausgeschlossen werden. Statt einer leeren Mitarbeiterliste im Tourformular sollte die App klar kommunizieren, dass es für diese Systemtour keine Wochenplanung gibt. Zusätzlich sollte sichergestellt werden, dass bestehende oder alte KW-Zuordnungen der Parkplatz-Tour nicht mehr in angrenzenden Ansichten wie Mitarbeiter-Wochenplänen oder Kalender-Hover-Previews auftauchen.

## Scope

- Serverseitige Wochenplan-Regeln für `Parkplatz` auf Lese-, Preview- und Mutationspfaden vereinheitlicht.
- Seed-Verhalten beim Öffnen der Tour-Wochenplanung für `Parkplatz` unterdrückt.
- Tourformular auf einen expliziten Hinweiszustand statt leerer Wochenkacheln umgestellt.
- Legacy-KW-Zuordnungen der Parkplatz-Tour in Employee-Week-Plans und Kalender-Lane-Previews ausgeblendet.
- Relevante Unit- und Integrationstests erweitert.
- `docs/TEST_MATRIX.md` passend zu den geänderten Tests aktualisiert.

## Technische Entscheidungen

- Die fachliche Regel bleibt serverseitig führend: `Parkplatz` wird als Tour ohne Wochenplanung behandelt, nicht nur als UI-Sonderfall.
- Bestehende Response-Contracts wurden beibehalten, wo möglich: Listen- und Verfügbarkeits-Reads liefern für `Parkplatz` leere Ergebnisse, Assignment-Previews liefern `hasWeekPlan: false`, und Wochen-Mutationen werden mit `BUSINESS_CONFLICT` abgewiesen.
- Die Wochenplanung im Tourformular bleibt sichtbar, rendert für `Parkplatz` aber bewusst einen erklärenden Infozustand statt einer scheinbar defekten Leerliste.
- Altbestände in `tour_week_employees` werden nicht destruktiv gelöscht, sondern read-seitig unterdrückt.

## Betroffene Dateien

- `server/services/tourWeekEmployeesService.ts`
- `server/services/tourWeeksService.ts`
- `server/services/appointmentsService.ts`
- `server/services/employeesService.ts`
- `client/src/components/TourEditForm.tsx`
- `tests/integration/server/tourWeekEmployees.integration.test.ts`
- `tests/integration/server/calendarWeekLaneEmployeePreviews.integration.test.ts`
- `tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx`
- `docs/TEST_MATRIX.md`

## Hinweise zum Testen

- Erfolgreich ausgeführt:
  - `npm run test:unit -- tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx`
  - `npm run test:integration -- --reporter=verbose tests/integration/server/tourWeekEmployees.integration.test.ts tests/integration/server/calendarWeekLaneEmployeePreviews.integration.test.ts`

## Bekannte Einschränkungen

- Bereits persistierte Parkplatz-KW-Zuordnungen bleiben in der Datenbank bestehen und werden derzeit nur in den relevanten Read-Modellen ausgeblendet.
- Ein voller Audit oder voller Gesamttestlauf wurde im Rahmen dieses Auftragsabschlusses nicht ausgeführt.
