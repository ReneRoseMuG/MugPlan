# Feiertagsmarker

Datum: 01.05.26

## Zweck

Umsetzung einer informativen Feiertags- und Kalendermarker-Verwaltung für Wochen- und Monatskalender inklusive Admin-Pflege, automatischen gesetzlichen Feiertagen und Server-FS-Persistenz.

## Scope

- Neue Kalendermarker-Contracts und API-Endpunkte für Kalenderlesen sowie Admin-Pflege.
- Backend-Schichtung nach Route, Controller, Service und Repository.
- Persistenz manueller Marker und automatischer Overrides über `ServerScopedFileStore`.
- Automatische deutsche Feiertage über `date-holidays`.
- Kompakte Markeranzeige im Wochen- und Monatskalender.
- Admin-Tab `Feiertage` in den Stammdaten.
- Gezielte Unit-, UI-Render- und Integrationstests.

## Technische Entscheidungen

- API- und JSON-Datumswerte bleiben technisch im ISO-Format `yyyy-MM-dd`.
- Sichtbare Datumswerte im Frontend laufen über `formatDisplayDate` und erscheinen im Kurzformat `dd.MM.yy`.
- Automatische Feiertage werden nicht gespeichert; gespeichert werden nur Admin-Marker und Overrides.
- Teilregionale Feiertage ohne passendes Orts-/Unterregionsmodell werden nicht auf ganze Bundesländer ausgeweitet.
- Rollen werden serverseitig geprüft: Lesen für `ADMIN`, `DISPONENT`, `LESER`; Admin-Pflege ausschließlich für `ADMIN`.

## Betroffene Dateien

- `shared/routes.ts`
- `server/routes.ts`
- `server/routes/calendarMarkersRoutes.ts`
- `server/controllers/calendarMarkersController.ts`
- `server/services/calendarMarkersService.ts`
- `server/repositories/calendarMarkersRepository.ts`
- `client/src/lib/calendar-markers.ts`
- `client/src/components/CalendarMarkersAdminPage.tsx`
- `client/src/components/calendar/CalendarMarkerBadges.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/calendar/CalendarMonthSheetView.tsx`
- `client/src/components/MasterDataPage.tsx`
- `docs/architecture.md`
- `docs/implementation.md`
- `docs/TEST_MATRIX.md`
- `package.json`
- `package-lock.json`
- `tests/unit/calendarMarkersService.test.ts`
- `tests/unit/ui/calendarMarkerBadges.render.test.tsx`
- `tests/integration/server/calendarMarkers.integration.test.ts`

## Tests und Verifikation

- `npm run typecheck`
- `npm run test:unit -- tests/unit/calendarMarkersService.test.ts tests/unit/ui/calendarMarkerBadges.render.test.tsx`
- `npm run test:integration -- tests/integration/server/calendarMarkers.integration.test.ts --reporter=verbose`
- `npm run check`
- `npm run lint`
- Datumsformat-Suche gemäß `agents.md`; neue Treffer in den geänderten Kalenderstellen sind technische ISO-Werte für Query-Parameter, Schlüssel und interne Berechnung.

## Bekannte Einschränkungen

- Keine DB-Migration erforderlich.
- Keine Planungswirkung: Feiertage erzeugen keine Konflikte, Locks, Abwesenheiten oder Reporteffekte.
- Browser-E2E wurde für dieses Feature nicht ergänzt; die UI ist über Typecheck, Lint und Render-Test abgesichert.
