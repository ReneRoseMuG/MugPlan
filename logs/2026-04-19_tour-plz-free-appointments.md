# Auftragslog: Tour-PLZ-Plan freie Termine

## Auftrag

Erweiterung der Trefferauswahl im Tour-PLZ-Plan um die Konfiguration `Hat freie Termine` mit diesen Schwerpunkten:

- Checkbox im Headerbereich der View ergänzen,
- Treffer serverseitig auf Wochen mit mindestens einem freien Werktag von Montag bis einschließlich Freitag begrenzen,
- Regel mit echten Daten in positiven und negativen Szenarien absichern.

## Analyse

- Die bestehende Tour-PLZ-View in `client/src/components/TourPostalPlanView.tsx` steuerte bereits die Suchparameter `postalCode`, `fromDate`, `toDate` und `max. KW`.
- Der API-Pfad `/api/calendar/tour-postal-plan` wurde über `shared/routes.ts`, `client/src/lib/calendar-appointments.ts`, `server/controllers/appointmentsController.ts` und `server/services/appointmentsService.ts` bereits contract-first geführt.
- Die fachliche Trefferbildung entstand in `server/lib/tourPostalPlan.ts`; die eigentliche Wochenprojektion und Sortierung lagen in `server/services/appointmentsService.ts`.
- Für belastbare Absicherung existierten bereits echte Integrationstests für die API sowie ein Browsertest für den zentralen Nutzerfluss des Tour-PLZ-Plans.

## Umsetzung

- `shared/routes.ts` um den optionalen Query-Parameter `hasFreeAppointments` erweitert.
- `client/src/lib/calendar-appointments.ts` so ergänzt, dass der neue Filter in Query-Key und Fetch-Request sauber mitgeführt wird.
- `client/src/components/TourPostalPlanView.tsx` um die Checkbox `Hat freie Termine` im Header ergänzt und an die Tour-PLZ-Abfrage angebunden.
- `server/controllers/appointmentsController.ts` so erweitert, dass `hasFreeAppointments=true` aus der Query gelesen und an den Service durchgereicht wird.
- `server/services/appointmentsService.ts` um eine serverseitige Frei-Regel ergänzt:
  Eine Trefferwoche bleibt bei aktivem Filter nur erhalten, wenn die Tour zwischen Montag und Freitag mindestens einen unbelegten Tag hat.
- `tests/integration/server/calendar.tour-postal-plan.integration.test.ts` um einen echten Positiv-/Negativfall für den Frei-Filter erweitert.
- `tests/e2e-browser/tour-postal-plan.browser.e2e.spec.ts` um einen Browserfluss ergänzt, der die Checkbox aktiviert und die gefilterte Trefferliste prüft.
- `docs/TEST_MATRIX.md` für die erweiterten Tour-PLZ-Tests aktualisiert.

## Bewusst nicht verändert

- Keine Änderungen an der allgemeinen Wochenkarten-Darstellung außerhalb des Tour-PLZ-Pfads.
- Keine neue Persistenz, kein zusätzlicher Setting-Eintrag und keine Rollenlogik.
- Keine Änderungen an der grundlegenden Präfix- und Score-Berechnung des Tour-PLZ-Plans.

## Tests

- `npm run test:integration -- --reporter=verbose tests/integration/server/calendar.tour-postal-plan.integration.test.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/tour-postal-plan.browser.e2e.spec.ts`

## Ergebnis

- Der Tour-PLZ-Plan bietet jetzt die neue Header-Option `Hat freie Termine`.
- Bei aktivem Filter erscheinen nur Trefferwochen, in denen die betroffene Tour zwischen Montag und Freitag mindestens einen freien Tag hat.
- Die neue Fachregel ist sowohl auf API-Ebene als auch im Browser mit echten Daten positiv und negativ abgesichert.
