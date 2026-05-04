# Tour-KW-Kartenaktionen im Wochenkalender

Datum: 04.05.26
Branch: `feature/tour-kw-week-card-actions`
Commit: noch nicht erstellt; aktueller Ausgangs-Commit `b682f379`

## Zweck

Dieses Log dokumentiert die Umsetzung der Tour-KW-Aktionen im Wochenkalender. Ziel war, die Funktionen `Notiz hinzufügen`, `Wochenplanung blockieren` und `Wochenplanung freigeben` aus den Tour-Header-Bars herauszulösen und direkt an den Tour-KW-Kacheln der neuen KW-Plan-Spalte anzubieten. Zusätzlich sollte der Notizstand der Tour-KW-Notizen als Footer-Counter mit Hover-Vorschau an der Kachel sichtbar sein.

Ein zweiter fachlicher Punkt war die Rollenregel: Dispatcher dürfen die laufende Tour-KW-Planung ebenfalls ändern. Vergangene Tour-KWs bleiben weiterhin schreibgeschützt.

## Scope

- Die Tour-KW-Kachel im Wochenkalender erhält ein Drei-Punkt-Menü.
- Das Menü bietet je nach Sperrstatus `Notiz hinzufügen` oder `Notizen anzeigen`.
- Das Menü bietet für schreibbare Wochen `Wochenplanung blockieren` und für blockierte Wochen `Wochenplanung freigeben`.
- Die Tour-KW-Kachel erhält einen Footer mit Notiz-Counter und Hover-Vorschau für Tour-KW-Notizen.
- Die bisherigen Menü- und Notizmarker wurden aus der Tour-Header-Bar entfernt.
- Die laufende Tour-KW ist für Administratoren und Dispatcher editierbar.
- Reader bleiben ohne Mutationsrechte.
- Vergangene Tour-KWs bleiben für alle Rollen schreibgeschützt.

## Rollen und Sperren

- `ADMIN`: darf laufende und zukünftige Tour-KWs bearbeiten, blockieren, freigeben und Tour-KW-Notizen anlegen.
- `DISPONENT`: darf laufende und zukünftige Tour-KWs bearbeiten, blockieren, freigeben und Tour-KW-Notizen anlegen.
- `READER`: darf keine Tour-KW-Mutationen ausführen.
- Vergangene Tour-KWs liefern serverseitig weiterhin `PAST_WEEK_READONLY`.
- Die relevante Durchsetzung liegt serverseitig in den Tour-KW-Services. Die UI blendet Aktionen ergänzend passend aus, ersetzt aber keine Berechtigungsprüfung.

## Technische Entscheidungen

- Die bestehende Notizlogik über `CalendarWeekNotesButton` wurde weiterverwendet, damit der vorhandene Notizdialog unverändert ausgelöst wird.
- Die neue Aktionsebene sitzt in `CalendarWeekView` an der bereits vorhandenen KW-Plan-Spalte.
- `CalendarWeekTourLaneHeaderBar` wurde auf reine Header-Anzeige reduziert.
- Die Rollenprüfung nutzt weiter die bestehende Rollenfähigkeit für Tour-KW-Planung; die aktuelle KW wird nun für Rollen entsperrt, die Wochenplanung verwalten dürfen.
- Die Fehlertexte für vergangene Wochen wurden auf die neue Fachregel geschärft.

## Betroffene Dateien

- `server/services/tourWeekEmployeesService.ts`
- `server/services/tourWeeksService.ts`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/calendar/CalendarWeekTourLaneHeaderBar.tsx`
- `client/src/components/TourManagement.tsx`
- `docs/architecture.md`
- `docs/implementation.md`
- `docs/wiki/features/ft-04-tourenplanung/ft-04-tourenplanung.md`
- `tests/integration/server/tourWeekEmployees.integration.test.ts`
- `tests/e2e-browser/tour-week-form.browser.e2e.spec.ts`
- `tests/e2e-browser/calendar-week-tour-personnel-and-notes.browser.e2e.spec.ts`
- `tests/unit/ui/calendarWeekTourLaneHeaderBar.counters.test.tsx`
- `tests/unit/ui/calendarWeekTourLaneHeaderBar.notesForeground.test.tsx`
- `tests/unit/ui/calendarWeekView.blockedWeekBehavior.test.tsx`
- `tests/unit/ui/calendarWeekView.compactHeader.test.ts`
- `tests/unit/ui/calendarWeekView.layoutGrid.test.tsx`

## Hinweise zum Testen

Gezielt grün gelaufen sind:

- `npm exec tsc`
- `git diff --check`
- `npm run test:unit -- tests/unit/ui/calendarWeekTourLaneHeaderBar.counters.test.tsx tests/unit/ui/calendarWeekTourLaneHeaderBar.notesForeground.test.tsx tests/unit/ui/calendarWeekView.compactHeader.test.ts tests/unit/ui/calendarWeekView.layoutGrid.test.tsx tests/unit/ui/calendarWeekView.blockedWeekBehavior.test.tsx --reporter=verbose`
- Safety-Gate für `.env.test`, `NODE_ENV=test`, `MUGPLAN_MODE=test`, Test-Datenbank-Allowlist und Test-Host-Allowlist
- `npm run test:integration -- tests/integration/server/tourWeekEmployees.integration.test.ts --reporter=verbose`
- `npm run test:e2e:browser -- tests/e2e-browser/tour-week-form.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/calendar-week-tour-personnel-and-notes.browser.e2e.spec.ts`

## Bekannte Einschränkungen

- Die gezielten und betroffenen Browserdateien sind grün gelaufen; ein vollständiger Browser-Gesamtlauf über alle E2E-Dateien wurde nicht ausgeführt.
- Die Unit-Tests melden weiterhin bestehende React-SSR-Warnungen zu `useLayoutEffect` im Hover-Preview-Umfeld. Die Testläufe selbst sind grün.
- Es wurden keine Schemaänderungen vorgenommen.
