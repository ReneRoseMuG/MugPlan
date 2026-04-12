# Log: Kalender D&D Testsuite-Ausbau

## Zweck

Dokumentation der heutigen Arbeit zum Ausbau der Kalender-Drag-and-drop-Testsuite sowie der verbleibenden Restprobleme nach den gezielten Testläufen.

## Scope

- Ausbau der D&D-Testabdeckung für Monats- und Wochenkalender
- Einbau positiver Referenztests für normale D&D-Mutationen
- Schärfung des bestehenden Monats-Validierungsfalls durch diagnostische Nachweise
- Keine Produktivcode-Änderung
- Keine fachliche Umdeutung des bestehenden Kalenderverhaltens

## Betroffene Dateien

- `tests/integration/server/appointments.dragdrop.success.integration.test.ts`
- `tests/e2e-browser/calendar-drag-drop.success.browser.e2e.spec.ts`
- `tests/e2e-browser/calendar-week-drag-drop.success.browser.e2e.spec.ts`
- `tests/e2e-browser/calendar-week-drag-drop.dragstart.browser.e2e.spec.ts`
- `tests/e2e-browser/calendar-week-drag-drop.drop-dispatch.browser.e2e.spec.ts`
- `tests/unit/ui/calendarDragDrop.regular-draggable.wiring.test.tsx`
- `tests/e2e-browser/calendar-drag-drop.validation-message.browser.e2e.spec.ts`
- `docs/TEST_MATRIX.md`

## Zielbild der neuen Suite

Die D&D-Abdeckung sollte nicht nur Grenzfälle oder serverseitige Patch-Verträge prüfen, sondern die Kette aus

- Drag-Start im Browser,
- Drop auf ein Kalenderziel,
- echtem `PATCH /api/appointments/:id`,
- und sichtbarem Endzustand

für Monat und Woche belastbar absichern.

## Neu eingefügte Tests

### Positive Grundpfade

- `tests/integration/server/appointments.dragdrop.success.integration.test.ts`
  - positiver Appointment-PATCH-Move auf ein anderes Zukunftsdatum
  - positiver Move mit gleichzeitigem Tour-Wechsel

- `tests/e2e-browser/calendar-drag-drop.success.browser.e2e.spec.ts`
  - positiver Referenztest für echten Monatskalender-D&D
  - Nachweis von `PATCH` und sichtbarer Neupositionierung

- `tests/unit/ui/calendarDragDrop.regular-draggable.wiring.test.tsx`
  - positive Drag-Start-Verdrahtung für normale Termine in Monat und Woche
  - Nachweis, dass `appointmentId` in `dataTransfer` geschrieben wird

### Zusätzliche Wochen-Diagnostik

- `tests/e2e-browser/calendar-week-drag-drop.success.browser.e2e.spec.ts`
  - voller positiver Referenztest für nativen Browser-D&D in der Wochenansicht

- `tests/e2e-browser/calendar-week-drag-drop.dragstart.browser.e2e.spec.ts`
  - isolierter Browser-Nachweis, dass der Wochenkalender auf `dragstart` reagiert

- `tests/e2e-browser/calendar-week-drag-drop.drop-dispatch.browser.e2e.spec.ts`
  - isolierter Browser-Nachweis, dass ein Drop mit `appointmentId` den echten `PATCH` auslöst und das Datum übernimmt

## Geschärfter Bestandsfall

- `tests/e2e-browser/calendar-drag-drop.validation-message.browser.e2e.spec.ts`
  - ergänzt um DnD-Event-Mitschnitt
  - ergänzt um Browser-Console-Mitschnitt
  - ergänzt um Request-/Response-Nachweis
  - ergänzt um Positionsprüfung des Termins

Ziel davon war, den bisherigen Fehler nicht nur als fehlenden Toast zu beobachten, sondern als technisch klaren D&D-Befund einzuordnen.

## Ausgeführte Tests

Seriell ausgeführt wurden:

1. `npm run test:unit -- tests/unit/ui/calendarDragDrop.regular-draggable.wiring.test.tsx`
2. `npm run test:integration -- tests/integration/server/appointments.dragdrop.success.integration.test.ts`
3. `npm run test:e2e:browser -- tests/e2e-browser/calendar-drag-drop.success.browser.e2e.spec.ts`
4. `npm run test:e2e:browser -- tests/e2e-browser/calendar-week-drag-drop.success.browser.e2e.spec.ts`
5. `npm run test:e2e:browser -- tests/e2e-browser/calendar-drag-drop.validation-message.browser.e2e.spec.ts`
6. `npm run test:e2e:browser -- tests/e2e-browser/calendar-week-drag-drop.dragstart.browser.e2e.spec.ts`
7. `npm run test:e2e:browser -- tests/e2e-browser/calendar-week-drag-drop.drop-dispatch.browser.e2e.spec.ts`

## Ergebnisbild

### Grün

- Unit-Wiring-Test für positive Drag-Start-Verdrahtung
- Integrationstest für positive D&D-nahe Appointment-Mutationen
- Positiver Monatskalender-Browser-D&D-Test
- Isolierter Wochen-`dragstart`-Browser-Test
- Isolierter Wochen-Drop-/PATCH-Browser-Test

### Rot

- Voller nativer Wochen-Browser-D&D-Test
- Monats-Validierungsfall `Startzeit liegt in der Vergangenheit`

## Was jetzt belastbar belegt ist

### Monatsansicht

- Normaler D&D in der Monatsübersicht funktioniert grundsätzlich.
- Das wird durch den positiven Referenztest mit echtem `PATCH` und sichtbarer Neupositionierung belegt.

### Wochenansicht

- Der Wochenkalender kann auf `dragstart` reagieren.
- Der Wochenkalender kann einen Drop mit gültiger `appointmentId` verarbeiten.
- Der Drop-Pfad löst dabei den echten `PATCH /api/appointments/:id` aus.
- Die serverseitige Mutation übernimmt das neue Datum.

Damit ist der Wochen-D&D-Stack nicht grundsätzlich kaputt.

## Restproblem 1

### Monats-Validierungsfall startet den D&D-Flow nicht zuverlässig

Betroffener Test:

- `tests/e2e-browser/calendar-drag-drop.validation-message.browser.e2e.spec.ts`

Aktueller Befund:

- Kein beobachteter `dragstart`
- Keine aufgezeichneten DnD-Events
- Kein `PATCH /api/appointments/:id`
- Kein Monatskalender-Log `drag start`

Interpretation:

- Der Fehlerfall „Startzeit liegt in der Vergangenheit“ ist derzeit nicht als serverseitige Ablehnung nachgewiesen.
- Der Ablauf bricht bereits davor, weil der D&D-Versuch in diesem Szenario aktuell nicht wirksam ausgelöst wird.

Offene Frage:

- Warum der positive Monats-D&D-Fall funktioniert, der Validierungsfall aber schon beim Drag-Start ausbleibt.

## Restproblem 2

### Natives Browser-Drag-and-drop in der Wochenansicht ist noch nicht stabil nachgewiesen

Betroffener Test:

- `tests/e2e-browser/calendar-week-drag-drop.success.browser.e2e.spec.ts`

Aktueller Befund:

- Der volle native Browser-Drag via `dragTo(...)` läuft in einen Timeout.
- Der Erfolgspfad lässt sich dagegen über die beiden feineren Nachweise teilweise belegen:
  - `dragstart` funktioniert isoliert
  - `drop -> PATCH -> Datum übernommen` funktioniert isoliert

Interpretation:

- Die verbleibende Lücke sitzt sehr wahrscheinlich nicht in der serverseitigen Mutation und nicht im reinen Drop-Handler.
- Wahrscheinlicher ist ein Problem im nativen Browser-Interaktionspfad `dragTo(...)` gegen die Wochenansicht, also bei der konkreten Kopplung von Quelle, Ziel-Container und Playwright-Drag.

Offene Frage:

- Ob der echte Benutzer-Drag in der Woche produktiv funktioniert und nur der Browser-Test das Ziel nicht sauber trifft, oder ob im nativen Wochen-D&D tatsächlich noch ein UI-spezifischer Defekt steckt.

## Fazit

Die Session hat die D&D-Abdeckung deutlich verbessert:

- Es gibt jetzt einen positiven Referenzpfad für den Monatskalender.
- Es gibt jetzt positive Nachweise für die serverseitige Mutation und die zentralen Wochen-D&D-Teilpfade.
- Die zwei verbleibenden Probleme sind nicht mehr diffus, sondern als klar getrennte Restbefunde sichtbar:
  1. Monats-Validierungsfall ohne wirksamen Drag-Start
  2. Wochenansicht ohne stabilen nativen Browser-`dragTo(...)`-Erfolg

## Hinweise für die Fortsetzung

- Als nächster Schritt für den Monats-Validierungsfall sollte der Unterschied zum grünen Monats-Referenztest direkt isoliert werden.
- Für die Wochenansicht sollte der native Browser-Drag weiter in Quelle, Ziel und Overlay-/Hit-Testing zerlegt werden, nicht mehr auf Server- oder Drop-Logik.
