# Auftragslog: Hover-Preview und Appointment-Save-Fix

## Zweck

Zwei Folgekorrekturen auf dem Branch `feature/tour-kw-employee-planning` absichern:

1. Der Tages-Hover auf der Tour-Header-Bar im Wochenkalender soll auch dann sichtbar bleiben, wenn für den Tag weder Termine noch eine KW-Wochenzuordnung vorhanden sind.
2. Beim Editieren eines einzelnen Termins soll eine bereits beim Tour-/KW-Wechsel bestätigte Wochenplan-Entscheidung beim späteren Speichern nicht erneut abgefragt werden.

## Scope

- Frontend-Fix in der Wochenansicht
- Frontend-Fix im Appointment-Formular
- gezielte Testanpassung und -erweiterung
- Aktualisierung der Test-Matrix

Keine Änderungen an Datenmodell, Migrationen, Backend-Contracts oder Konfliktregeln.

## Technische Entscheidungen

### 1. Immer sichtbarer Hover im Wochenkalender

In `client/src/components/calendar/CalendarWeekView.tsx` wird für jede echte Tour-Tageszelle nun ein Fallback-Preview erzeugt, wenn aus dem Query keine Daten für `tourId + Datum` vorliegen. Dadurch kann der bestehende Leerzustand des Hover-Previews gezeigt werden, statt gar kein Preview zu öffnen.

Bewusst nicht geändert:

- kein zusätzlicher Backend-Seeding-Endpunkt
- keine neue Kalender-Aggregation nur für leere Tage

Der Fix bleibt lokal in der View, weil das Problem rein in der fehlenden Frontend-Fallback-Vorschau lag.

### 2. Kein redundanter Wochenplan-Dialog beim Speichern

In `client/src/components/AppointmentForm.tsx` merkt sich das Formular jetzt, für welche Ziel-Tour und Ziel-KW die Wochenplan-Entscheidung im laufenden Edit-Vorgang bereits bestätigt wurde.

Folge:

- Der Dialog beim eigentlichen Tour-/KW-Wechsel bleibt erhalten.
- Der spätere Save-Pfad fragt dieselbe Entscheidung für denselben einzelnen Termin nicht noch einmal ab.

Bewusst unverändert:

- die fachliche Wochenplan-Vorschau selbst
- die vorhandene Mitarbeiter-/Termin-Konfliktprüfung
- das Verhalten für echte neue Änderungen nach der ersten Entscheidung

## Betroffene Dateien

- `client/src/components/AppointmentForm.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `tests/e2e-browser/appointment-form.layout-tour-integration.browser.e2e.spec.ts`
- `tests/unit/ui/calendarWeekView.laneHoverFallback.test.tsx`
- `docs/TEST_MATRIX.md`

## Tests

Gezielt ausgeführt:

- `npm run check`
- `npm run test:unit -- tests/unit/ui/calendarWeekView.laneHoverFallback.test.tsx`
- `npm run test:e2e:browser -- tests/e2e-browser/appointment-form.layout-tour-integration.browser.e2e.spec.ts`

## Bekannte Einschränkungen

- Kein voller Audit in diesem Schritt
- Kein voller Testlauf in diesem Schritt
- Das Log beschreibt nur die hier umgesetzten Folgekorrekturen, nicht den gesamten Feature-Branch
