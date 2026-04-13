# Auftrag: Historische Parkplatz-Termine editierbar halten

**Datum:** 2026-04-13  
**Branch:** `parking-tour-appointment-edit`  
**Commit:** `618251f`  
**Auftragsklasse:** 5 — mehrschichtige Änderung

## Zweck

Historische Termine sollen grundsätzlich readonly bleiben. Für Termine auf der systemverwalteten Tour `Parkplatz` wurde diese Regel gezielt aufgehoben, damit geparkte Termine auch nach Ablauf ihres ursprünglichen Datums weiterhin bearbeitet, umgeplant, storniert oder gelöscht werden können.

## Scope

Umgesetzt wurden ausschließlich die für diese Fachregel nötigen Änderungen:

- zentrale Ausnahme in der serverseitigen Termin-Sperrlogik
- Angleichung der UI-Readonly-Verdrahtung im Terminformular
- Sichtbarkeitsanpassung der Aktionsmenüs in Wochenkalender-Karten
- gezielte Erweiterung vorhandener Unit- und Integrationstests
- Aktualisierung von `docs/TEST_MATRIX.md`

Nicht umgesetzt wurden:

- neue Endpunkte oder Contract-Änderungen
- allgemeine Lockerungen der Historienregel außerhalb von `Parkplatz`
- Änderungen an Storno-Regeln außerhalb der hier betroffenen Parkplatz-Ausnahme
- Browser-E2E für den neuen Sonderfall

## Technische Entscheidungen

- Die Ausnahme wurde zentral in `server/services/appointmentsService.ts` verankert, statt einzelne Mutationspfade separat mit Namensprüfungen zu versehen.
- Die bestehende `Parkplatz`-Erkennung wurde wiederverwendet und in einen gemeinsamen Entscheidungsweg für historische Termin-Mutationen überführt.
- Die Ausnahme greift nur für Termine, die aktuell der Tour `Parkplatz` zugeordnet sind. Historische Termine außerhalb dieser Tour bleiben unverändert gesperrt.
- Die Eingabevalidierung für Vergangenheitsdaten bleibt für reguläre Termine aktiv; sie wird nur für Updates eines bereits auf `Parkplatz` liegenden Termins gezielt aufgehoben.
- Im Frontend wurde die Editierbarkeit nicht nur über lokale Datumslogik, sondern auch über den konkret geladenen Tour-Kontext des Termins ausgerichtet, damit der freigegebene Zustand sofort sichtbar ist.

## Betroffene Dateien

- `server/services/appointmentsService.ts`
- `client/src/components/AppointmentForm.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`
- `client/src/components/calendar/CalendarWeekSpanningTile.tsx`
- `tests/integration/server/appointments.park.integration.test.ts`
- `tests/unit/invariants/lockingRules.test.ts`
- `tests/unit/services/appointments.park.test.ts`
- `tests/unit/services/appointments.cancellation.test.ts`
- `tests/unit/services/appointments.employee-removal.versioning.test.ts`
- `tests/unit/ui/appointmentForm.readOnlyModes.wiring.test.tsx`
- `tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx`
- `docs/TEST_MATRIX.md`

## Tests und Verifikation

Gezielt erfolgreich ausgeführt:

- `npm run test:unit -- tests/unit/ui/appointmentForm.readOnlyModes.wiring.test.tsx tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx tests/unit/services/appointments.park.test.ts tests/unit/services/appointments.cancellation.test.ts tests/unit/services/appointments.employee-removal.versioning.test.ts tests/unit/invariants/lockingRules.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/appointments.park.integration.test.ts`

Abgedeckt wurden dabei insbesondere:

- historische Nicht-`Parkplatz`-Termine bleiben gesperrt
- historische `Parkplatz`-Termine bleiben im Formular editierbar
- historische `Parkplatz`-Termine zeigen ihre Kalender-Aktionsmenüs weiterhin an
- Replanung, Tag-Mutationen, Storno und Löschen historischer `Parkplatz`-Termine funktionieren über die echte API

Nicht ausgeführt:

- voller Audit
- voller Testlauf
- Browser-E2E für den Sonderfall

## Bekannte Einschränkungen

- Die neue Regel ist gezielt auf `Parkplatz` beschränkt. Falls künftig weitere systemverwaltete Puffer-Touren eingeführt werden, muss die Ausnahme fachlich erweitert werden.
- Die Änderung nutzt weiterhin den fachlichen Sonderstatus der Tour `Parkplatz` anhand ihres bestehenden Systemnamens.
- Ein vollständiger Repo-weiter Regressionstest wurde in dieser Session nicht durchgeführt; verifiziert wurde nur die direkt betroffene Teststrecke.
