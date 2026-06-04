# Testlauf-Befund 04.06.26

## Zweck

Vollständiger Testlauf (Unit, Integration, Browser-E2E) zur Standortbestimmung auf Branch `work`.
Anlass: Abschluss MILE-53 (Terminmutations-Dialoge, Monatskalender-Bereinigung).

## Scope

- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e:browser`

---

## Ergebnisse

### Unit-Tests

| Status | Anzahl |
|--------|--------|
| Testdateien | 314 (1 fehlgeschlagen, danach behoben) |
| Tests bestanden | 1332 |
| Tests fehlgeschlagen | 0 (nach Fix) |
| Übersprungen | 1 |

**Behobener Fehler:** `tests/unit/ui/calendarWorkspace.kwSync.wiring.test.tsx` — Test „passes kw jump controls in month mode with the visible iso week" prüfte, dass `showKwJump: true` im Monatskalender übergeben wird. Da KW-Jump im Monatskalender bewusst entfernt wurde (MILE-53), war der Test veraltet. Test-Case und Scope-Kommentar wurden bereinigt.

---

### Integrationstests

| Status | Anzahl |
|--------|--------|
| Testdateien | 128 |
| Tests bestanden | 733 |
| Tests fehlgeschlagen | 0 |

Alle Integrationstests grün.

---

### Browser-E2E-Tests

| Status | Anzahl |
|--------|--------|
| Tests bestanden | 319 |
| Tests fehlgeschlagen | 12 |
| Nicht ausgeführt (Folgeabbrüche) | 39 |
| Gesamt | 370 |

#### Gruppe A — `dialog-appointment-move` nicht sichtbar (3 Tests)

Alle drei Tests führen einen Drag-Drop durch und erwarten anschließend das Bestätigungs-Modal `dialog-appointment-move`. Das Modal erscheint nicht mehr. Betroffen:

- `tests/e2e-browser/calendar-drag-drop.success.browser.e2e.spec.ts:72`
- `tests/e2e-browser/calendar-drag-drop.validation-message.browser.e2e.spec.ts:118`
- `tests/e2e-browser/calendar-week-drag-drop.drop-dispatch.browser.e2e.spec.ts:114`

Mögliche Ursache: Dialog-Testid oder Modal-Trigger nach MILE-53-Umbau geändert.

#### Gruppe B — `dialog-tour-employee-cascade` fehlt oder falscher Titel (2 Tests)

- `tests/e2e-browser/appointment-form.layout-tour-integration.browser.e2e.spec.ts:332`
  Dialog `dialog-tour-employee-cascade` wird nach Tour-Auswahl ohne Wochenplanung nicht geöffnet. Erwartet: „Mitarbeiter werden ersetzt".
- `tests/e2e-browser/employee-appointment-mutation-tracking.browser.e2e.spec.ts:128`
  Dialog ist sichtbar, aber Titel lautet „Mitarbeiter für KW 24 / 2026 in Wochenplanung aufnehmen" statt erwartet „Mitarbeiter aus Wochenplanung entfernen". Dialog-Modus stimmt nicht mit der ausgelösten Aktion überein.

#### Gruppe C — KW-Jump im Monatskalender veraltet (1 Test)

- `tests/e2e-browser/calendar.kw-jump.browser.e2e.spec.ts:93`
  Test sucht `input-calendar-kw-jump` im Monatskalender. Feld existiert dort nicht mehr (KW-Jump im Monatskalender bewusst entfernt). Test läuft bis zum Timeout (2 min). Bereinigung analog zum Unit-Test noch ausstehend.

#### Gruppe D — Einzelne unzusammenhängende Fehler (5 Tests)

- `tests/e2e-browser/appointments-list.tour-employee.browser.e2e.spec.ts:257`
  Zeile „Tour Focus Future" auf Seite 2 der Terminliste nicht sichtbar. Möglicherweise Datumsdrift oder Seed-Problem.
- `tests/e2e-browser/calendar-consistency.week-month-dates.browser.e2e.spec.ts:124`
  `week-day-2026-08-10-lane-tour-38805` nicht gefunden. Tour-ID vermutlich nicht aus Fixture-Daten, sondern aus früherer Seed-Periode.
- `tests/e2e-browser/calendar-markers-visualization.browser.e2e.spec.ts:139`
  „Maifeiertag Browser" nach Bearbeiten und Reaktivierung im Monats-Hover nicht sichtbar. Möglicher Cache- oder Reaktivierungs-Bug.
- `tests/e2e-browser/calendar-month-sheet.navigation.browser.e2e.spec.ts:68`
  `weekScrollerOverflowY` ist `"visible"` statt erwartet `"hidden"`. CSS-Eigenschaft des Wochenscrollers nach Monatskalender-Umbau geändert.
- `tests/e2e-browser/employee-appointments-utilization.browser.e2e.spec.ts:66`
  `week-appointment-panel-74433` nicht gefunden. Hardkodierte Termin-ID — wahrscheinlich ID aus früherer DB-Periode, die in der aktuellen Testdatenbank nicht mehr existiert.
- `tests/e2e-browser/project-form.create-sidebar-persistence.browser.e2e.spec.ts:305`
  Artikel „Fenster" fehlt in der Missing-Articles-Liste. Vorhanden: Sauna/Ofen/Steuerung/Dach/Tür/Vorderwand/Rückwand/Einrichtung. Artikelkatalog-Änderung oder Extraktions-Mapping geändert.

---

## Technische Entscheidungen

- Unit-Test für KW-Jump Monatskalender entfernt, da Feature bewusst entfernt wurde.
- Browser-Test für KW-Jump Monatskalender (`calendar.kw-jump.browser.e2e.spec.ts:72`) noch nicht bereinigt — als offener Befund dokumentiert.

## Betroffene Dateien

- `tests/unit/ui/calendarWorkspace.kwSync.wiring.test.tsx` — veraltetem Test-Case und Scope-Kommentar bereinigt

## Bekannte Einschränkungen

12 Browser-Tests schlagen fehl. Davon:
- 1 Test veraltet (KW-Jump Monat) — Bereinigung empfohlen
- 3 Tests betreffen `dialog-appointment-move` (vermutlich MILE-53-Regression)
- 2 Tests betreffen `dialog-tour-employee-cascade` (Dialog fehlt oder falscher Modus)
- 5 Tests betreffen unabhängige Einzelprobleme (Datumsdrift, hardkodierte IDs, CSS-Änderung, Artikelkatalog)
