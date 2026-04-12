# Log: Kalender DnD Validierungsnachweis

## Zweck

Dokumentation der Analyse zum offenen Browser-Test
`tests/e2e-browser/calendar-drag-drop.validation-message.browser.e2e.spec.ts`.

Der Test erwartet, dass ein Termin in der Monatsübersicht per Drag-and-drop auf den heutigen Tag gezogen wird, die serverseitige Validierung den Move wegen vergangener Startzeit ablehnt und die UI die konkrete Fehlermeldung sichtbar anzeigt.

## Scope

- Analyse des vorhandenen Browsertests
- Analyse des vorhandenen Fehler-Snapshots unter `test-results/.../error-context.md`
- Analyse des Monats- und Wochenkalender-Fehlerpfads
- Keine Produktivcode-Änderung
- Kein Test-Fix in diesem Schritt

## Betroffene Dateien

- `tests/e2e-browser/calendar-drag-drop.validation-message.browser.e2e.spec.ts`
- `client/src/components/calendar/CalendarMonthSheetView.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `tests/helpers/testDataFactory.ts`

## Was der Test ausführt

1. Testumgebung wird über `resetBrowserSuiteState()` zurückgesetzt.
2. Ein echtes Projekt wird angelegt.
3. Ein echter Termin wird für morgen mit `startTime = 00:00:00` angelegt.
4. Im Browser wird als Admin die Monatsübersicht geöffnet.
5. Der Terminbalken wird auf die Tageszelle für heute gezogen.
6. Danach erwartet der Test zwei sichtbare Texte:
   - `Fehler beim Verschieben`
   - `Startzeit liegt in der Vergangenheit`

## Erwartete Fachlogik

- Der Drag-and-drop-Versuch soll den echten Verschiebepfad auslösen.
- Der Zieltermin läge dann auf heute mit Startzeit `00:00:00`.
- Diese Startzeit liegt aus Sicht der Validierungsregel in der Vergangenheit.
- Der Server soll den Move deshalb ablehnen.
- Die UI soll die konkrete Fehlermeldung sichtbar machen.

## Aktueller Befund

- Der Browser-Test schlägt daran fehl, dass `Fehler beim Verschieben` nicht sichtbar gefunden wird.
- Im vorhandenen Fehler-Snapshot ist die Notification-Region vorhanden, aber ohne sichtbaren Eintrag.
- Der Termin erscheint im Snapshot weiterhin am Ursprungsdatum.
- Im Monatskalender wird der Fehlerpfad weiterhin per Toast behandelt, nicht über ein eigenes Inline-Fehlerfenster.
- Der Wochenkalender verwendet denselben Fehlerkanal.

## Was aktuell nicht bewiesen ist

Nicht bewiesen ist derzeit, ob

- der Drag-and-drop-Versuch den Move-Request tatsächlich auslöst,
- der Server die Änderung wie erwartet mit `VALIDATION_ERROR` ablehnt,
- oder der Fehler korrekt entsteht, aber in der UI nicht mehr sichtbar ankommt.

Der Befund `Termin bleibt am Ursprungsort` reicht allein nicht als Beweis für eine fachliche Ablehnung, weil derselbe Zustand auch dann entstehen kann, wenn der DnD-Flow nicht wirksam ausgelöst wurde.

## Analysefehler während der Untersuchung

Ein zusätzlicher Analyse-Skriptlauf war fehlerhaft und darf nicht als Beleg verwendet werden.

Ursache:

- Im Skript wurde der Rückgabewert von `createAppointmentFixture(...)` falsch interpretiert.
- Verwendet wurde `appointment.customer.id`.
- `createAppointmentFixture(...)` gibt jedoch den Backend-nahen Rückgabewert von `appointmentsService.createAppointment(...)` zurück, also mit flachem Feld `customerId` statt verschachteltem `customer.id`.
- Dadurch entstand ein `TypeError`.

Dieser Skriptfehler sagt nichts über das eigentliche Kalenderproblem aus.

## Wahrscheinlichster aktueller Verdacht

Der bestehende E2E-Nachweis ist derzeit nicht belastbar genug.

Am wahrscheinlichsten ist momentan eines von zwei Szenarien:

1. Der DnD-Versuch erreicht den eigentlichen Move-/Fehlerpfad nicht zuverlässig.
2. Der Fehler entsteht, wird aber im Browser nicht mehr als sichtbarer Toast nachgewiesen.

Eine bestätigte Fachregeländerung ist aktuell nicht belegt.

## Empfohlener nächster Schritt

Eine schlanke, gezielte Beweisanalyse ohne schweren Reset-/Seed-Overhead:

- nachweisen, ob beim Drop ein `PATCH /api/appointments/:id` gesendet wird,
- Statuscode und Response-Body des Requests erfassen,
- und erst danach entscheiden, ob das Problem im DnD-Flow oder im Fehler-Nachweis des Tests liegt.
