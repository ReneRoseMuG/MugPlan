# Log: A6 - Monatsübersicht mit KW-Navigation

**Datum:** 2026-05-06
**Branch:** `feature/a6-kw-navigation`
**Auftragsklasse:** 5 - Mehrschichtige Änderung oder neues Feature

---

## Zweck

A6 wurde umgesetzt, damit die Monatsübersicht nicht mehr über einen festen Monatsanker, sondern über ein gleitendes `windowStart`-Fenster navigiert. Der Fensterstart wird immer auf Montag normalisiert. Die globale Monatsübersicht zeigt konstant sechs Wochen, die Mitarbeiter-Auslastung nutzt dieselbe Fensterlogik mit ihrem bestehenden Vier-Wochen-Fenster.

---

## Umsetzung

- `windowStart` ist der zentrale Anker der Monatsübersicht.
- Die seitlichen Rand-Schaltflächen springen einen Monat zurück oder vor.
- Die angehefteten Blatt-Schaltflächen über und unter dem Kalenderblatt verschieben das Fenster exakt um sieben Tage.
- Der Terminplanung-/Abwesenheiten-Toggle sitzt im Blattkopf in derselben Zeile wie die Beschriftung.
- Der innere vertikale Scrollbereich des Monatsblatts ist abgeschaltet; Wochensprünge bleiben die aktive Blattnavigation.
- Monatsnavigation springt auf den Wochenbeginn des ersten Tages des Zielmonats.
- `windowStart` wird als URL-Parameter geteilt und lokal als Fallback gespeichert.
- Termine, blockierte Tourwochen und FT-34-Kalendermarker laden den vollständigen sichtbaren Zeitraum.
- Der Monatsheader zeigt monatsübergreifende Fenster adaptiv an.
- Die Mitarbeiter-Auslastung übernimmt dieselben Wochen- und Monats-Snap-Regeln, bleibt aber read-only.

---

## Rollen und Sicherheit

Die Änderung führt keine neue serverseitige Berechtigung, keine neue Mutation und keinen neuen Endpunkt ein.

`ADMIN`, `DISPATCHER`/`DISPONENT` und `READER` behalten ihre bestehenden Kalender-Sichtbarkeiten. `READER` bleibt read-only. Bestehende serverseitige Filter, Lock-Regeln, Drag-and-Drop-Regeln und Termin-Mutationsguards bleiben maßgeblich.

---

## Verifikation

Erfolgreich ausgeführt:

- `npm run test:unit -- tests/unit/ui/monthSheetModel.rules.test.ts tests/unit/ui/calendarMonthSheetView.wiring.test.tsx tests/unit/ui/calendarWorkspace.viewSwitch.wiring.test.tsx tests/unit/ui/employeeUtilizationView.wiring.test.tsx`
- `npm run test:unit -- tests/unit/ui/calendarWorkspace.kwSync.wiring.test.tsx`
- `npm run test:e2e:browser -- tests/e2e-browser/calendar-month-sheet.navigation.browser.e2e.spec.ts tests/e2e-browser/calendar-consistency.week-month-presence.browser.e2e.spec.ts tests/e2e-browser/calendar-consistency.week-month-dates.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/employee-appointments-utilization.browser.e2e.spec.ts`
- `npm run typecheck`
- `npm run check`
- `npm run check:encoding`
- `npm run lint:encoding`
- `npm run check:encoding:staged`

Zusätzlich geprüft:

- `git diff --check` ohne Befund
- Datumsformat-Suchlauf nach verbotenen sichtbaren Formaten; neue Treffer sind technische Keys, Testdaten oder maschinenlesbare Werte.
- Mojibake-Rohsuche; Treffer sind bekannte Doku-/Test-/Normalizer-Kontexte, keine A6-Blocker.

---

## Dokumentation

- Wiki-Task A6 wurde auf `Abgeschlossen` gesetzt.
- `docs/TEST_MATRIX.md` wurde um die neuen und erweiterten Tests ergänzt.
- Wiki-Journal wurde ergänzt: `docs/wiki/journal/06-05-26-a6-monatsuebersicht-kw-navigation.md`.

---

## Offene Punkte

- Keine fachlichen A6-Blocker.
- Änderungen sind noch uncommitted.
- Eine Grundsatzentscheidung, ob künftig ausschließlich das Wiki-Journal als Session-Log verwendet wird, ist noch nicht dokumentiert.
