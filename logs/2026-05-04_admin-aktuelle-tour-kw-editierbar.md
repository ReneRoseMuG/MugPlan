# Admins dürfen laufende Tour-KW bearbeiten

Datum: 04.05.26
Branch: `refactor/week-calendar-tour-personnel`
Commit: noch nicht erstellt; aktueller Ausgangs-Commit `b3cee030`

## Zweck

Dieses Log dokumentiert die Rollenänderung für die Tour-KW-Planung. Administratoren sollen die laufende Tour-KW bearbeiten können, analog zur bestehenden Admin-Ausnahme für historische Termine. Disponenten behalten die bisherige Sperre für laufende und vergangene Tour-KWs.

## Scope

- Laufende Tour-KW ist für `ADMIN` editierbar.
- Laufende Tour-KW bleibt für `DISPONENT` schreibgeschützt.
- Vergangene Tour-KWs bleiben für alle Rollen schreibgeschützt.
- Admins können in der laufenden Tour-KW Mitarbeiter hinzufügen, entfernen, die Planung anwenden sowie die Tour-KW blockieren oder freigeben.
- Die serverseitige Sperrentscheidung wurde rollenabhängig gemacht.
- Die lokale Sperre der Tour-KW-Spalte im Wochenkalender wurde an dieselbe Rollenregel angepasst.
- Architektur-, Implementierungs- und Feature-Doku wurden entsprechend aktualisiert.
- Zusätzlich sind im Arbeitsbaum offene Correction-Workflow-/Settings-Änderungen vorhanden. Sie werden gemäß Auftrag `save (Alles)` mitgesichert, wurden aber nicht im Rahmen dieses Logs fachlich auditiert.

## Rollen und Sperren

- `ADMIN`: darf die laufende Tour-KW mutieren und blockieren oder freigeben.
- `DISPONENT`: darf zukünftige Tour-KWs wie bisher bearbeiten, aber nicht die laufende oder vergangene Tour-KW.
- `LESER` / `READER`: bleibt read-only.
- Blockierte Wochen, Parkplatz-Ausnahmen, Overlap-Prüfung, Terminversionsschutz und bestehende Terminregeln bleiben serverseitig maßgeblich.

## Technische Entscheidungen

- Die bestehende Wochen-Sperrfunktion wurde um eine rollenabhängige Variante ergänzt.
- Controller geben `req.userContext.roleKey` an die Tour-KW-Services weiter.
- Listenprojektionen liefern `isLocked` abhängig von der Rolle des aktuellen Requests.
- Im Wochenkalender wurde die lokale Berechnung für die Tour-KW-Spalte auf dieselbe Admin-Ausnahme umgestellt.
- Für die UI-Regel wurde ein kleiner testbarer Helper ergänzt.

## Betroffene Dateien

- `server/services/tourWeeksService.ts`
- `server/services/tourWeekEmployeesService.ts`
- `server/controllers/tourWeeksController.ts`
- `server/controllers/tourWeekEmployeesController.ts`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `tests/integration/server/tourWeekEmployees.integration.test.ts`
- `tests/unit/ui/calendarWeekView.compactHeader.test.ts`
- `docs/architecture.md`
- `docs/implementation.md`
- `docs/wiki/features/ft-04-tourenplanung/ft-04-tourenplanung.md`

Zusätzlich im Save enthalten:

- offene Correction-Workflow-/Settings-Dateien aus dem Arbeitsbaum
- zugehörige Tests und Contract-/Routenänderungen

## Hinweise zum Testen

Gezielt grün gelaufen sind:

- `npm exec tsc`
- `npm run test:unit -- tests/unit/ui/calendarWeekView.compactHeader.test.ts --reporter=verbose`
- Safety-Gate für `.env.test`, `NODE_ENV=test`, `MUGPLAN_MODE=test`, Test-Datenbank-Allowlist und Test-Host-Allowlist
- `npm run test:integration -- tests/integration/server/tourWeekEmployees.integration.test.ts --reporter=verbose`

## Bekannte Einschränkungen

- Für die Correction-Workflow-/Settings-Änderungen wurden in dieser Session keine zusätzlichen Tests ausgeführt.
- Ein Browser-E2E-Lauf wurde für die Tour-KW-Rollenänderung nicht ausgeführt.
- Die Änderung erweitert bewusst nur `ADMIN`, nicht `DISPONENT`.
