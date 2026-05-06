# 06.05.26 | Kalender | A6: Monatsübersicht mit KW-Navigation

## Zusammenfassung

Die Monatsübersicht nutzt nun ein gleitendes `windowStart`-Fenster. Der Fensterstart wird immer auf Montag normalisiert, die globale Monatsübersicht zeigt konstant sechs Wochen und die Mitarbeiter-Auslastung übernimmt dasselbe Modell mit ihrem bestehenden Vier-Wochen-Fenster.

## Art der Änderung

Mehrschichtige Frontend- und Teständerung ohne neue API-Route, ohne Datenmodelländerung und ohne Migration.

## Betroffene Features

- FT-03 Kalenderansichten: Monatsübersicht, KW-Navigation und Zeitraumwechsel
- FT-03 / Mitarbeiter-Auslastung: read-only Fensterlogik im Mitarbeiterformular
- FT-34 Kalendermarker: unveränderter API-Pfad, aber Ladezeitraum folgt jetzt dem sichtbaren Fenster

## Konkrete Änderungen

- `windowStart` wird als einziger Monatsfenster-Anker verwendet und per URL-Parameter sowie lokalem Fallback reloadfest gespeichert.
- Die seitlichen Rand-Schaltflächen springen einen Monat zurück oder vor.
- Die angehefteten Blatt-Schaltflächen über und unter dem Kalenderblatt verschieben das Monatsfenster exakt um sieben Tage.
- Der Terminplanung-/Abwesenheiten-Toggle sitzt im Blattkopf in derselben Zeile wie die Beschriftung.
- Der innere vertikale Scrollbereich des Monatsblatts ist abgeschaltet; Wochensprünge bleiben die aktive Blattnavigation.
- Monatsnavigation springt auf den Wochenbeginn des ersten Tages des Zielmonats.
- Termine, blockierte Tourwochen und Kalendermarker laden den vollständigen sichtbaren Zeitraum.
- Der Header zeigt monatsübergreifende Fenster adaptiv an; KW-Zeilen bleiben ISO-basiert.
- Die Mitarbeiter-Auslastung nutzt dieselben Snap- und Wochenregeln, bleibt aber read-only.

## Rollen

`ADMIN`, `DISPATCHER`/`DISPONENT` und `READER` behalten ihre bestehenden Kalender-Sichtbarkeiten. `READER` bleibt read-only. Die Änderung fügt keine neue serverseitige Berechtigung, keine neue Mutation und keinen neuen Endpunkt hinzu; bestehende serverseitige Filter und Sperrregeln bleiben maßgeblich.

## Tests / Verifikation

Erfolgreich ausgeführt:

- `npm run test:unit -- tests/unit/ui/monthSheetModel.rules.test.ts tests/unit/ui/calendarMonthSheetView.wiring.test.tsx tests/unit/ui/calendarWorkspace.viewSwitch.wiring.test.tsx tests/unit/ui/employeeUtilizationView.wiring.test.tsx`
- `npm run test:unit -- tests/unit/ui/calendarWorkspace.kwSync.wiring.test.tsx`
- `npm run test:e2e:browser -- tests/e2e-browser/calendar-month-sheet.navigation.browser.e2e.spec.ts tests/e2e-browser/calendar-consistency.week-month-presence.browser.e2e.spec.ts tests/e2e-browser/calendar-consistency.week-month-dates.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/employee-appointments-utilization.browser.e2e.spec.ts`
- `npm run typecheck`

## Offene Punkte

- Keine offenen Punkte aus A6.
