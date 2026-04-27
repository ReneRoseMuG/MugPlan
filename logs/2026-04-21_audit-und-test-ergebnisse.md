# Auftragslog: Audit und Test Ergebnisse

## Zweck

Dieses Log dokumentiert den vollständigen Audit- und Testlauf auf dem Branch `fix-week-grid-standard-alignment`.

Der Auftrag war ein reiner Report- und Sicherungsauftrag:

- Audit vollständig ausführen
- vollen Testlauf vollständig ausführen
- Ergebnisse dokumentieren
- anschließend den Stand speichern

Während Audit und Test wurden keine Code-, Test-, Konfigurations- oder Produktänderungen vorgenommen.

## Ausgangszustand

- Branch: `fix-week-grid-standard-alignment`
- Arbeitsbaum vor dem Log: sauber
- Audit-Runner vorhanden: `npm run audit:local`
- Der lokale Audit-Runner deckt die acht verpflichtenden Audit-Schritte ab.

## Audit-Ergebnis

Ausgeführt wurde:

- `npm run audit:local`

Der Sammellauf hat alle acht Audit-Schritte seriell ausgeführt.

Ergebnis:

- `npm run check`: fehlgeschlagen
- `npm run lint`: erfolgreich
- `npm run audit`: erfolgreich, `0 vulnerabilities`
- `npm run secrets`: erfolgreich
- `npm run analyze:arch`: erfolgreich mit 21 Dependency-Warnungen, keine Errors
- `npm run analyze:boundaries`: erfolgreich
- `npm run analyze:coverage`: fehlgeschlagen
- `npm run analyze:knip`: erfolgreich mit Hinweisen

Zusammenfassung:

- 6 Audit-Schritte erfolgreich
- 2 Audit-Schritte fehlgeschlagen
- 8 Audit-Schritte ausgeführt

### Ursache für `check`

Zur Klärung wurde zusätzlich gezielt ausgeführt:

- `npm run check`

Der Fehler liegt nicht im TypeScript-Compile, sondern im Encoding-Lint.

Gemeldet wurden zahlreiche verdächtige ASCII-Umlautsequenzen wie:

- `verfuegbar`
- `Ungueltige`
- `geloescht`
- `geaendert`
- `koennen`

Betroffen sind vor allem Dateien unter:

- `server/controllers/`
- `server/services/`
- `server/lib/`
- `server/settings/`
- `shared/`

Beispielhafte Dateien aus der Meldung:

- `server/controllers/appointmentsController.ts`
- `server/services/appointmentsService.ts`
- `server/services/tourWeekEmployeesService.ts`
- `server/settings/registry.ts`
- `shared/schema.ts`

### Ursache für `analyze:coverage`

`analyze:coverage` lief über die Coverage-Testausführung und schlug mit einem fehlgeschlagenen Test fehl.

Zusammenfassung aus dem Lauf:

- 1 Testdatei fehlgeschlagen
- 380 Testdateien bestanden
- 1 Testdatei übersprungen
- 1 Test fehlgeschlagen
- 1686 Tests bestanden
- 5 Tests übersprungen

Der konkrete Fehlschlag entspricht dem später separat sichtbaren Unit-Test-Fehler in `calendarWeekView.blockedWeekBehavior.test.tsx`.

### Hinweise aus `analyze:knip`

`analyze:knip` war erfolgreich, meldete aber Hinweise:

- Duplicate export: `tests/helpers/testIsolationRegistry.ts`
- ungenutzte Exports in `CalendarWeekAppointmentPanel.tsx`
- ungenutzte Exports in `shared/appointmentCancellation.ts`

Diese Hinweise wurden im Reportauftrag nicht behoben.

## Test-Safety-Gate

Vor dem Testlauf wurde geprüft:

- `.env.test` ist vorhanden
- `MYSQL_DATABASE_URL` ist in `.env.test` vorhanden
- `DB_ALLOWED_DATABASES_TEST` ist in `.env.test` vorhanden
- `DB_ALLOWED_HOSTS_TEST` ist in `.env.test` vorhanden
- zentrale Guard-APIs sind im Code referenziert

`NODE_ENV` und `MUGPLAN_MODE` stehen nicht direkt in `.env.test`, werden aber durch alle ausgeführten npm-Testskripte explizit auf `test` gesetzt.

Referenzierte Guard-APIs:

- `assertTestMode`
- `assertSafeWriteTargetForTestMode`
- `assertSafeDestructiveOperationTarget`
- `assertSqlDatabaseIdentity`

## Voller Testlauf

Ausgeführt wurden seriell:

- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e`
- `npm run test:e2e:browser`

### `npm run test:unit`

Ergebnis: fehlgeschlagen.

Zusammenfassung:

- 1 Testdatei fehlgeschlagen
- 265 Testdateien bestanden
- 1 Testdatei übersprungen
- 1 Test fehlgeschlagen
- 1072 Tests bestanden
- 1 Test übersprungen

Fehlgeschlagener Test:

- `tests/unit/ui/calendarWeekView.blockedWeekBehavior.test.tsx`
- Test: `shows the blocked overlay and freigeben menu while keeping day controls and suppressing conflict markers`

Kern der Assertion:

- Erwartet wurde ein Plus-Button-Test-ID-Fragment für `2026-04-20`.
- Im gerenderten Markup sind Plus-Buttons ab `2026-04-21` sichtbar.

Der Testfehler wurde dokumentiert und nicht behoben.

### `npm run test:integration`

Ergebnis: erfolgreich.

Zusammenfassung:

- 112 Testdateien bestanden
- 611 Tests bestanden
- 4 Tests übersprungen

### `npm run test:e2e`

Ergebnis: erfolgreich.

Zusammenfassung:

- 3 Testdateien bestanden
- 3 Tests bestanden

### `npm run test:e2e:browser`

Ergebnis: fehlgeschlagen.

Zusammenfassung:

- 240 Browser-Tests gestartet
- 220 Tests bestanden
- 4 Tests fehlgeschlagen
- 16 Tests nicht ausgeführt

Fehlgeschlagene Browser-Tests:

- `appointment-form.create-sidebar-persistence.browser.e2e.spec.ts`
  Erwartet wurde eine Appointment-Anzahl von `1`, erhalten wurde `2`.
- `appointment-form.layout-tour-integration.browser.e2e.spec.ts`
  Erwarteter Text war `Bleibt nur durch aktuelle Terminzuweisung erhalten`, erhalten wurde `Bleibt nur durch bestehende Terminzuweisung erhalten`.
- `calendar-week-grid-widths.browser.e2e.spec.ts`
  Der Grid-Boundary-Test `aligns the internal Thursday boundary of a two-day tile with a Thursday single-day card in standard mode` schlug fehl: erwartet `<= 3px`, erhalten `8.5px`.
- `standalone-routing.browser.e2e.spec.ts`
  Erwarteter Tooltip war `In neuem Tab öffnen`, erhalten wurde `In separatem Tab öffnen`.

## Relevanz für die aktuelle Kalender-Session

Für die Wochenkalender-Session sind besonders diese Tests relevant:

- `tests/unit/ui/calendarWeekView.layoutGrid.test.tsx`
- `tests/e2e-browser/calendar-week-grid-widths.browser.e2e.spec.ts`

Die Unit-Grid-Tests prüfen strukturell:

- Mindesthöhe im Kompakt-Modus
- width-sichere Wrapper für SpanningTiles
- schmale Wochenenden im Leerzustand
- volle Wochenendbreite bei belegtem Wochenende
- konsistente Grid-Definitionen in Header und Lane

Die Browser-Grid-Tests prüfen sichtbar im echten Browser:

- gleiche Breite von Ein-Tagesterminen
- gleiche Breite von Zwei-Tagesterminen
- gleiche Breite von Drei-Tagesterminen
- Wochenend-Sonderregel bei belegtem Wochenende
- tourübergreifend gleiche Tageskanten
- gleiche Außenkanten im unteren Overflow-Bereich und im normalen Tagesbereich

Der aktuell rote kalenderbezogene Browser-Test zeigt:

- Die sichtbare interne Donnerstag-Grenze einer Zwei-Tages-Kachel weicht im Standard-Modus um `8.5px` von der referenzierten Donnerstag-Karte ab.
- Damit ist weiterhin mindestens eine Grid-/Segmentkante nicht innerhalb der festgelegten Toleranz.

## Ergebnis

Audit und voller Testlauf sind nicht grün.

Der wichtigste kalenderbezogene Befund ist der weiterhin rote Browser-Grid-Test in `calendar-week-grid-widths.browser.e2e.spec.ts`. Zusätzlich blockieren ein Unit-Test zur gesperrten Wochenansicht, zwei weitere Browser-Flows und der Encoding-Lint den grünen Gesamtzustand.

Der Arbeitsbaum blieb nach den Testläufen sauber. Dieses Log dokumentiert die Ergebnisse für die nächste Umsetzungsschleife.
