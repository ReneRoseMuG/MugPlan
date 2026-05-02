# Feiertage im Kalender konsolidiert

Datum: 02.05.26

## Zweck

Zusammenführung des bisherigen Themenstands zu Feiertagen und Kalendermarkern aus den letzten Tagen mit dem aktuellen Session-Stand zur Feiertagsdarstellung in Wochen- und Monatskalender.

Diese Konsolidierung bündelt insbesondere:

- den Grundaufbau der Kalendermarker- und Feiertagslogik aus dem Log vom 01.05.26
- die persistierte Marker-Visualisierung und Seed-Logik aus dem Log vom 02.05.26
- die aktuelle Session zur stabilisierten Feiertagsdarstellung im Wochen- und Monatskalender

## Scope

- Gesetzliche Feiertage und manuelle Kalendermarker bleiben Teil derselben Kalendermarkerlogik.
- Admin-Pflege unter `Stammdaten > Feiertage` bleibt bestehen.
- Kalender lesen weiterhin aktive Marker im Zeitraum aus dem bestehenden Marker-Bestand.
- Wochenkalender färbt Feiertage nun als durchgehende Tagesspalte über alle Tour-Lanes.
- Monatskalender zeigt Feiertage weiterhin auf der vollen Tageskachel, aber ohne zusätzliche Markerzeile unter dem Kopf.
- Feiertagsbeschriftungen in Woche und Monat nutzen nun dieselbe adaptive Header-Logik.

## Rollen und Durchsetzung

- Lesen im Kalender bleibt für `ADMIN`, `DISPONENT` und `LESER` erlaubt.
- Pflege von Kalendermarkern bleibt ausschließlich `ADMIN`.
- Die aktuelle Session verändert keine Rollen, keine Sichtbarkeiten und keine serverseitigen Berechtigungen.
- Feiertagsmarker bleiben rein informativ und haben weiterhin keine Planungswirkung.

## Technische Entscheidungen

- Die bestehende Marker-Priorität bleibt maßgeblich; sichtbar im Header ist jeweils nur der primäre Marker des Tages.
- Woche und Monat teilen sich jetzt eine gemeinsame adaptive Marker-Komponente statt getrennte Logikpfade.
- Die adaptive Darstellung arbeitet kontextbezogen mit der Reihenfolge `Volltext -> FT -> Icon`.
- Wenn die verfügbare Breite zunächst noch nicht sicher gemessen ist, startet die Darstellung konservativ mit `FT`, damit keine Grid-Struktur überläuft.
- Hover bleibt der primäre Weg für den vollständigen Feiertagsnamen bei kompakten Varianten; zusätzlich bleibt ein `title`-Fallback erhalten.
- Im Monatskalender wurde die separate Badge-Zeile entfernt; die Feiertagsanzeige sitzt vollständig im vorhandenen Tageskopf.
- Im Wochenkalender wurde die bisher lane-lokale Markerfärbung durch einen gemeinsamen Spalten-Hintergrund über den gesamten Lane-Bereich ersetzt.

## Betroffene Dateien

Historische Kernbasis aus den vorigen Logs:

- `shared/routes.ts`
- `server/routes.ts`
- `server/routes/calendarMarkersRoutes.ts`
- `server/controllers/calendarMarkersController.ts`
- `server/controllers/authController.ts`
- `server/services/calendarMarkersService.ts`
- `server/services/systemSeedService.ts`
- `server/services/userSettingsService.ts`
- `server/repositories/calendarMarkersRepository.ts`
- `server/settings/registry.ts`
- `client/src/lib/calendar-markers.ts`
- `client/src/lib/calendar-marker-visualization.ts`
- `client/src/hooks/useSettings.ts`
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

Aktuelle Session zusätzlich bzw. direkt geändert:

- `client/src/components/calendar/CalendarMarkerHeaderLabel.tsx`
- `client/src/lib/calendar-marker-header-display.ts`
- `client/src/lib/calendar-marker-text.ts`
- `client/src/components/calendar/CalendarMarkerBadges.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/calendar/CalendarMonthSheetView.tsx`
- `tests/unit/ui/calendarMarkerHeaderDisplay.test.ts`
- `tests/unit/ui/calendarMonthSheetView.wiring.test.tsx`
- `tests/unit/ui/calendarWeekView.layoutGrid.test.tsx`
- `tests/e2e-browser/calendar-markers-visualization.browser.e2e.spec.ts`

## Tests und Verifikation

Historisch bereits dokumentiert:

- `npm run typecheck`
- `npm run check`
- `npm run lint`
- `npm run test:unit -- tests/unit/calendarMarkersService.test.ts tests/unit/ui/calendarMarkerBadges.render.test.tsx`
- `npm run test:unit -- tests/unit/calendarMarkersService.test.ts tests/unit/settings/calendarMarkerVisualization.registry.test.ts tests/unit/ui/calendarMarkerBadges.render.test.tsx`
- `npm run test:integration -- tests/integration/server/calendarMarkers.integration.test.ts --reporter=verbose`
- `npm run test:e2e:browser -- tests/e2e-browser/calendar-markers-visualization.browser.e2e.spec.ts`

Aktuelle Session:

- `npm run typecheck`
- `npm run test:run -- tests/unit/ui/calendarMarkerHeaderDisplay.test.ts tests/unit/ui/calendarMonthSheetView.wiring.test.tsx tests/unit/ui/calendarWeekView.layoutGrid.test.tsx`
- `npm run test:e2e:browser -- tests/e2e-browser/calendar-markers-visualization.browser.e2e.spec.ts`

## Inhaltlicher Stand nach Zusammenführung

- Kalendermarker und Feiertage sind fachlich als informative Kalender-Overlays etabliert.
- Automatische Feiertage werden aus der persistierten Markerlogik gespeist und können im Admin-Bestand sichtbar, editierbar, deaktivierbar und reaktivierbar sein.
- Die globale Marker-Visualisierung mit typabhängiger Farbgebung bleibt erhalten.
- Die aktuelle Session schließt die noch offene UI-Nacharbeit an der Feiertagsdarstellung:
  Woche zeigt die Farbmarkierung jetzt als echte Spalte über alle Lanes hinweg.
  Monat zeigt die Feiertagsinfo jetzt im Kopf der Tageskachel ohne zusätzliche Grid-Zeile.
  Die Beschriftung ist nun platzabhängig stabilisiert und zerstört die Grid-Logik nicht mehr.

## Bekannte Einschränkungen

- Keine Schemaänderung und keine Migration.
- Keine Änderung an Termin-, Konflikt-, Lock-, Rollen- oder Reportlogik.
- Im Monatskalender ist auf normaler Breite nicht garantiert, dass immer der volle Feiertagsname sichtbar ist; bei knapper Breite ist `FT` oder das Icon fachlich der gewünschte Fallback.
- Diese Konsolidierung fasst den belegten Stand aus vorhandenen Logs und der aktuellen Session zusammen; sie ersetzt nicht automatisch bestehende Journaleinträge.
