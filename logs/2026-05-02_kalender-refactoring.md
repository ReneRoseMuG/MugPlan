# Ergebnisdokumentation: Kalender-Refactoring

## Zweck

Diese Dokumentation beschreibt die Umsetzung des ersten Kalender-Refactoring-Pakets auf Branch `refactor/kalender-refactoring`.

## Scope

- Wochenkalender mit kompakter Tagesspalten-Beschriftung.
- Optionale Termin-Notizkarten im Wochenkalender.
- Direkte Terminkarten-Aktionen für Notizanlage und Mitarbeiterzuweisung.
- Passive Abwesenheitszeile im Wochenkalender.
- Personalübersicht je Tour-Lane aus bestehender Tour-KW-Planung.
- Druckvorschau für Wochen- und Monatskalender.
- Contract-Erweiterung für optionale Termin-Notizvorschau in der Kalenderaggregation.

## Technische Entscheidungen

1. Termin-Notizvorschau wird optional über `includeAppointmentNotes=true` an `/api/calendar/appointments` geladen.
2. Termin-Notizkarten sind read-only und werden außerhalb der gemessenen Terminkarte gerendert, damit die Kachelhöhenlogik stabil bleibt.
3. Terminkarten-Aktionen verwenden bestehende Serverpfade.
   - Notizen: `POST /api/appointments/:appointmentId/notes`
   - Mitarbeiter: Tour-KW-Preview plus normale Terminmutation
4. Leser werden serverseitig für Termin-Notiz-Mutationen blockiert.
5. Die kompakte Wochenkopf-Darstellung `Mo 27 Apr` ist eine ausdrücklich dokumentierte Ausnahme von der allgemeinen sichtbaren Datumsregel.
6. Die Personalübersicht wird als User-Setting `calendar.weekPersonnelColumn.visible` gespeichert.

## Betroffene Bereiche

### Backend

- `shared/routes.ts`
- `server/controllers/appointmentsController.ts`
- `server/controllers/appointmentNotesController.ts`
- `server/services/appointmentsService.ts`
- `server/services/appointmentNotesService.ts`
- `server/repositories/notesRepository.ts`
- `server/settings/registry.ts`

### Frontend

- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`
- `client/src/components/calendar/CalendarMonthSheetView.tsx`
- `client/src/lib/calendar-appointments.ts`
- `client/src/hooks/useSettings.ts`

### Tests und Wiki

- `tests/unit/ui/calendarWeekView.compactHeader.test.ts`
- `docs/wiki/features/ft-03-kalenderansichten/ft-03-kalenderansichten.md`

## Rollen- und Rechteprüfung

- Termin-Notiz-Mutationen sind serverseitig auf `ADMIN` und `DISPONENT` beschränkt; `READER` erhält `403 FORBIDDEN`.
- Historische Termine bleiben für neue Termin-Notizen serverseitig gesperrt.
- Mitarbeiterzuweisung aus der Terminkarte nutzt bestehende Terminmutation und bestehende Tour-KW-Vorschau; es wurden keine neuen Rollenpfade eingeführt.
- Druckvorschauen sind read-only und verändern keine Daten.

## Wiki-Check

Die Wiki musste angepasst werden, weil sich sichtbares Kalenderverhalten und der Kalenderdaten-Contract geändert haben.

Aktualisiert wurden:

- `docs/wiki/features/ft-03-kalenderansichten/ft-03-kalenderansichten.md`
- `docs/implementation.md`
- `docs/wiki/journal/02-05-26-kalender-refactoring.md`
- `docs/wiki/journal/README.md`

Keine Schema-Migration und keine Architekturindex-Anpassung waren erforderlich.

## Prüfung

Ausgeführt:

- `npm run check` - fehlgeschlagen im Schritt `check:encoding`; der Scanner meldet vorhandene Mojibake-Muster im bestehenden Wiki-Importbestand.
- `npm run check:destructive-inventory` - erfolgreich.
- `npm run lint:encoding` - erfolgreich.
- `npm exec tsc` - erfolgreich.
- `npm run lint` - erfolgreich.
- `npm run test:unit -- tests/unit/ui/calendarWeekView.compactHeader.test.ts --reporter=verbose` - erfolgreich.
- `npm run test:unit -- tests/unit/ui/calendarAppointments.queryOptions.test.ts tests/unit/ui/calendarWeekView.blockedWeekBehavior.test.tsx --reporter=verbose` - erfolgreich.
- `npm test -- --reporter=verbose` - erfolgreich.
- `npm run audit:local` - 7 erfolgreich, 1 fehlgeschlagen; nur `check` scheitert am bestehenden Wiki-Encoding-Blocker.

Die Datumsformat-Suche wurde mit `rg -n 'dd\.MM\.yyyy|yyyy-MM-dd|MM/DD/YYYY|dd/MM/yyyy|toLocaleDateString\(|toLocaleString\("de-DE"\)' client server tests docs agents.md CLAUDE.md` wiederholt. Verbleibende Treffer wurden als technische ISO-Keys, API-Parameter, Testdaten oder bestehende Regeltexte abgegrenzt. Die neue Anzeige `Mo 27 Apr` ist eine dokumentierte Fachausnahme.

## Offene Risiken

- Der vollständige `npm run check` bleibt blockiert, bis die bestehenden Mojibake-Muster im Wiki-Importbestand bereinigt sind.
- Die Personalübersicht ist als Tour-Lane-Bereich umgesetzt und nicht als separate linke Rasterspalte mit eigenem Layoutcontract.
