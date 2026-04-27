# Auftragslog: Tour-PLZ-Plan Wochenvorschau

## Auftrag

Umbau des Tour-PLZ-Plans auf eine wiederverwendbare Wochenvorschau im Stil des Wochenkalenders mit diesen Schwerpunkten:

- nur zukünftige Termine ab dem Beginn der kommenden Woche berücksichtigen,
- pro Treffer eine kompakte Tour-Wochenvorschau statt einfacher Tageskacheln rendern,
- reduzierte Wochenkopfzeile und reduzierte Tour-Header-Bar verwenden,
- `+`-Buttons pro Tag für die Terminanlage beibehalten.

## Analyse

- Die bisherige UI in `client/src/components/TourPostalPlanView.tsx` renderte pro Suggestion eine eigene 7-Tage-Kachelstruktur mit Minimaldaten.
- Der bestehende Wochenkalender brachte die relevanten Bausteine bereits mit:
  `CalendarWeekAppointmentPanel`, `CalendarWeekSpanningTile`, `CalendarWeekTourLaneHeaderBar` und die Lane-/Span-Logik aus `CalendarWeekView`.
- Die bestehende Tour-PLZ-Projektion lieferte bislang nur vereinfachte `days[].appointments[]`-Daten und war für eine echte Wiederverwendung der Wochenkarten nicht ausreichend.
- Zusätzlich lagen bereits offene lokale Änderungen aus dem Wochenkarten-Layout vor:
  `client/src/components/calendar/CalendarWeekSpanningTile.tsx` und `tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx`.
  Diese Änderungen wurden im aktuellen Arbeitsstand mitgesichert und nicht zurückgesetzt.

## Umsetzung

- Clientseitige Tour-PLZ-Navigation auf kommende Woche umgestellt und dafür `resolveTourPostalPlanMinimumWeekStartDate` ergänzt.
- Serverseitige Tour-PLZ-Projektion auf den Beginn der kommenden Woche geklemmt und zusätzlich auf Termin-Startdaten ab dieser Grenze gefiltert.
- Tour-PLZ-Response in `shared/routes.ts` und `client/src/lib/calendar-appointments.ts` um eine vollständige Appointment-Payload je Suggestion erweitert.
- Neue wiederverwendbare Komponente `client/src/components/calendar/TourPostalPlanWeekPreview.tsx` eingeführt.
- `TourPostalPlanView` von der alten Tageskachel-Darstellung auf die neue Tour-Wochenvorschau umgebaut.
- `CalendarWeekTourLaneHeaderBar` um einen reduzierten Preview-Modus erweitert, der Menü-, Notiz- und Zählersegmente ausblendet.
- Testabdeckung für Mindestwoche, Header-Preview, Wochenvorschau, API-Clamp und Browserfluss ergänzt bzw. aktualisiert.
- `docs/TEST_MATRIX.md` für die neuen und erweiterten Tour-PLZ-Tests gepflegt.

## Bewusst nicht verändert

- Keine Änderungen an Rollenlogik, Mutationsverhalten oder an der allgemeinen Wochenkalender-Interaktivität außerhalb der Vorschau.
- Keine vollständige Einbettung des gesamten `CalendarWeekView`; die Lösung bleibt eine schlanke Reuse-Komponente.
- Keine Bereinigung der bereits zuvor offenen Wochenkarten-Layoutänderungen außerhalb des aktuellen Arbeitsstands.

## Tests

- `npm run test:unit -- tests/unit/lib/tourPostalPlan.navigation.test.ts tests/unit/ui/calendarWeekTourLaneHeaderBar.counters.test.tsx tests/unit/ui/tourPostalPlanWeekPreview.render.test.tsx`
- `npm run test:integration -- --reporter=verbose tests/integration/server/calendar.tour-postal-plan.integration.test.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/tour-postal-plan.browser.e2e.spec.ts`

## Ergebnis

- Der Tour-PLZ-Plan rendert Tour-Treffer jetzt als kompakte Wochenvorschau mit wiederverwendeten Wochenkarten-Bausteinen.
- Die Vorschläge starten fachlich erst ab dem Beginn der kommenden Woche.
- Die reduzierte Header-Bar blendet Menü, Notizslot und Terminzähler aus, lässt die `+`-Buttons pro Tag aber erhalten.
- Die gezielten Unit-, Integration- und Browser-Tests für den neuen Tour-PLZ-Pfad waren erfolgreich.
