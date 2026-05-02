# Feiertage Marker Visualisierung

Datum: 02.05.26

## Zweck

Refactor der Feiertagslogik: automatisch berechnete gesetzliche Feiertage werden nun in den bestehenden Kalendermarker-Bestand des Tabs `Stammdaten > Feiertage` geseedet. Die Kalenderansichten lesen aktive Marker aus diesem gespeicherten Bestand und visualisieren Feiertage, Betriebsfeiertage und Betriebsferien mit global einstellbarer Farbintensität.

## Scope

- Persistierter Feiertags-Seed für das aktuelle Jahr bis aktuelles Jahr plus fünf Jahre.
- Seed-Anbindung an den System-Seed und an den ersten erfolgreichen Admin-Login des Tages.
- Idempotenz über fachliche Marker-Identität aus Datum, Typ, Quelle, Geltung und Bundesländern.
- Keine Überschreibung editierter Werte wie Name, Notiz, Aktiv-Status oder Version.
- Kalender-Leseendpunkt liefert aktive gespeicherte Marker im Zeitraum; Live-Berechnung entfällt aus der Anzeige.
- Globales Setting `calendar.markerVisualizationStyle` mit `Dezent`, `Standard`, `Hervorgehoben`.
- Typabhängige Farbgebung: gesetzliche Feiertage rot, Betriebsfeiertage grün, Betriebsferien blau.
- Anzeige des vollen Markernamens statt Kürzel `FT`, mit Tooltip für den vollständigen Namen.

## Rollen und Durchsetzung

- Lesen im Kalender bleibt für `ADMIN`, `DISPONENT` und `LESER` erlaubt.
- Pflege von Kalendermarkern bleibt ausschließlich `ADMIN`.
- Globale Visualisierungs-Einstellung ist serverseitig ausschließlich für `ADMIN` schreibbar.
- Direkte API-Aufrufe für unzulässige Rollen werden mit `403` geprüft.
- Marker haben weiterhin keine Planungswirkung: keine Konflikte, Locks, Abwesenheiten, Terminmutationen oder Reporteffekte.

## Technische Entscheidungen

- Es wurde keine neue DB-Tabelle und keine Migration eingeführt.
- Persistenz nutzt weiterhin den bestehenden Server-File-Store der Kalendermarker.
- Seed, Create, Update und Delete laufen im Service sequenziell, damit der asynchrone Login-Seed keine kurz danach geschriebenen Admin-Marker überschreibt.
- Der Browser-Test nutzt die bestehende Test-Isolation und wurde in der Registry eingetragen.
- Die Storage-Fingerprint-Prüfung ignoriert `ServerFS` unter dem Backup-Pfad, weil dies der technische Server-File-Store ist und kein Backup-Artefakt.

## Betroffene Dateien

- `shared/routes.ts`
- `server/controllers/authController.ts`
- `server/repositories/calendarMarkersRepository.ts`
- `server/services/calendarMarkersService.ts`
- `server/services/systemSeedService.ts`
- `server/services/userSettingsService.ts`
- `server/settings/registry.ts`
- `client/src/hooks/useSettings.ts`
- `client/src/lib/calendar-marker-visualization.ts`
- `client/src/components/CalendarMarkersAdminPage.tsx`
- `client/src/components/SettingsPage.tsx`
- `client/src/components/calendar/CalendarMarkerBadges.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/calendar/CalendarMonthSheetView.tsx`
- `tests/unit/calendarMarkersService.test.ts`
- `tests/unit/settings/calendarMarkerVisualization.registry.test.ts`
- `tests/unit/ui/calendarMarkerBadges.render.test.tsx`
- `tests/integration/server/calendarMarkers.integration.test.ts`
- `tests/e2e-browser/calendar-markers-visualization.browser.e2e.spec.ts`
- `tests/helpers/testIsolationFingerprint.ts`
- `tests/helpers/testIsolationRegistry.ts`

## Tests und Verifikation

- `npm run typecheck`
- `npm run test:unit -- tests/unit/calendarMarkersService.test.ts tests/unit/settings/calendarMarkerVisualization.registry.test.ts tests/unit/ui/calendarMarkerBadges.render.test.tsx`
- `npm run test:integration -- tests/integration/server/calendarMarkers.integration.test.ts --reporter=verbose`
- `npm run test:e2e:browser -- tests/e2e-browser/calendar-markers-visualization.browser.e2e.spec.ts`

## Bekannte Einschränkungen

- Keine Schemaänderung, daher keine Migration.
- Keine Änderung an Kalender-Planungsregeln.
- Kein vollständiger Gesamttestlauf, sondern gezielte Unit-, Integration- und Browser-Verifikation für die betroffenen Pfade.
