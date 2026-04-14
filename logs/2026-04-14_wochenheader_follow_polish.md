# Auftragslog: Wochenheader und Direkt-Follow nachpoliert

## Zweck

Korrektur der Wochen-Tour-Header nach mehreren Folgeanpassungen: linkes Menü und passive Notizanzeige beibehalten, Tagesfunktionen wiederherstellen, Tourname wieder sichtbar machen, blockierte Wochen visuell schärfen und den vorgeschalteten Dialog für `Termin folgen` entfernen, sodass das System direkt zur neuen Position springt.

## Scope

- Wochenheader-Layering und Grid-Breiten im Wochenkalender korrigiert
- Linkes Wochenaktions-Menü beibehalten, Notizanzeige weiterhin read-only
- Redundanten `Blockiert`-Badge entfernt und Sperrfläche deutlicher gemacht
- Tageszähler und `+`-Aktionen im Header wieder stabil sichtbar gehalten
- Senkrechte Tagesunterteilungen auf der Header-Bar ergänzt
- Fachlich falschen Blockierhinweis in der Tour-Wochenplanung korrigiert
- `Termin folgen` als Standard umgesetzt und Follow-Dialog entfernt
- Betroffene Unit- und Browser-Tests gezielt nachgezogen

## Technische Entscheidungen

- Nicht der gesamte Header, sondern nur der Menübereich erhält eine lokale Vordergrund-Ebene.
- Der Tourname bleibt durch eine korrigierte Grid-Aufteilung und eigene Vordergrundkapsel sichtbar.
- Die Tageszähler bleiben rechtsbündig vor dem `+`-Button in der Tagesebene.
- Tages-Trennlinien werden als pointer-freie Overlay-Ebene im selben Header-Grid gerendert.
- Der Follow-Flow bleibt in `Home.tsx` zentral; statt eines Bestätigungsdialogs wird nach Save direkt Datum und Fokusziel gesetzt.

## Betroffene Dateien

- `client/src/components/calendar/CalendarWeekTourLaneHeaderBar.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/TourEditForm.tsx`
- `client/src/pages/Home.tsx`
- `tests/unit/ui/calendarWeekTourLaneHeaderBar.counters.test.tsx`
- `tests/unit/ui/calendarWeekTourLaneHeaderBar.notesForeground.test.tsx`
- `tests/unit/ui/calendarWeekView.blockedWeekBehavior.test.tsx`
- `tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx`
- `tests/e2e-browser/appointment-form.layout-tour-integration.browser.e2e.spec.ts`
- `docs/TEST_MATRIX.md`

## Tests und Prüfungen

Ausgeführt:

- `npm run check`
- `npm run test:unit -- tests/unit/ui/calendarWeekTourLaneHeaderBar.notesForeground.test.tsx`
- `npm run test:unit -- tests/unit/ui/calendarWeekTourLaneHeaderBar.counters.test.tsx`
- `npm run test:unit -- tests/unit/ui/calendarWeekView.blockedWeekBehavior.test.tsx`
- `npm run test:unit -- tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx`
- `npm run test:e2e:browser -- tests/e2e-browser/appointment-form.layout-tour-integration.browser.e2e.spec.ts`

## Bekannte Hinweise

- Es wurde kein voller Audit und kein voller Testlauf über alle Pflichtkommandos ausgeführt.
- Die Wochenheader-Korrekturen wurden bewusst minimal-invasiv im bestehenden Aufbau umgesetzt und nicht als größeres Header-Refactoring.
