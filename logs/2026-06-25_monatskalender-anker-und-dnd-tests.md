# Monatsanker-Fix und Drag-Test-Stabilisierung

**Datum:** 25.06.26
**Branch:** merge/ms68-ms52
**Auftragsklasse:** 4 (kleine lokale Fixes) — iterativ aus einem Audit/Test-Report heraus

## Zweck

Aus dem vollen Audit/Testlauf vom 25.06.26 gingen mehrere rote Befunde hervor. In dieser Session behoben:
1. Encoding-Gate (`npm run check`) — verbotene ASCII-Umlaut-Sequenz.
2. Monatskalender-Regression — Termine des aktuellen Monats fehlten im Raster.
3. Zwei fragile Monats-Drag-&-Drop-Browsertests.

## Scope und technische Entscheidungen

### 1. Encoding-Fix
- `client/src/components/AppointmentForm.tsx:1731` — `ueber` → `über` in einem MS-68-Kommentar.
- `npm run check` (lint:encoding) danach grün.

### 2. Monatsanker-Regression (Kernbefund)
- Datei: `client/src/components/calendar/CalendarMonthSheetView.tsx`
- Ursache: Der Hauptpfad leitete den angezeigten Monat aus `addDays(currentDate, 6)` ab und setzte voraus, dass `currentDate` ein ISO-Wochenstart (Montag) ist. Der Initialwert ist aber `new Date()` (heute). An Wochentagen nahe Monatsende sprang die Ansicht in den Folgemonat (am 25.06.26 fälschlich Juli statt Juni), sodass Termine des aktuellen Monats nicht mehr im Raster erschienen. Die Wochenansicht normalisiert intern auf den Montag und war daher unauffällig.
- Herkunft: Regression aus der Monatskalender-Überarbeitung vom 03.06.26 (Commit `e0859870`), die `addDays(currentDate, 6)` zur Behebung eines Navigations-Bugs einführte — korrekt für navigierte Montags-Anker, falsch für den initialen Tageswert.
- Fix: `addDays(startOfISOWeek(currentDate), 6)`. Idempotent für bereits normalisierte Navigationswerte (Montag), daher bleibt die Monatsnavigation unverändert; konsistent mit dem `visibleWeekCount`-Pfad und der Wochenansicht.
- Commit: `67a30da1`

### 3. Drag-Test-Stabilisierung
- Dateien: `tests/e2e-browser/calendar-drag-drop.success.browser.e2e.spec.ts`, `tests/e2e-browser/calendar-drag-drop.validation-message.browser.e2e.spec.ts`, `docs/TEST_MATRIX.md`
- Befund: Beide Tests lösten den Drag per Playwright `dragTo` aus. Für HTML5-natives Drag&Drop triggert `dragTo` das drop-Event nicht zuverlässig (dragstart feuert, drop kommt nicht an) — kein Move-Dialog, kein PATCH. Die App-DnD-Logik selbst ist intakt (BWK-03 grün, Drop-Handler `month-sheet-day` vorhanden).
- Entscheidung: Umstellung auf den bewährten Helper `dispatchMonthViewDrop` (wie die übrigen Monats-D&D-Tests), der die DragEvents direkt auf `month-sheet-day` feuert. Der Server-Flow (Dialog → PATCH → Persistenz/Toast) bleibt unverändert echt geprüft. Das nur noch diagnostische DnD-Event-Capture-Gerüst in `validation-message` entfiel.
- Commit: `bdbf47f7`

## Betroffene Dateien
- `client/src/components/AppointmentForm.tsx`
- `client/src/components/calendar/CalendarMonthSheetView.tsx`
- `tests/e2e-browser/calendar-drag-drop.success.browser.e2e.spec.ts`
- `tests/e2e-browser/calendar-drag-drop.validation-message.browser.e2e.spec.ts`
- `docs/TEST_MATRIX.md`

## Testhinweise
- `npm run check` grün (Encoding + tsc).
- Gezielte serielle Browser-Re-Runs: alle 7 betroffenen Tests grün (5 durch Monatsanker-Fix, 2 durch Test-Stabilisierung).
- Regressions-Wächter grün geblieben: `calendar-month-sheet.navigation` und alle `calendar-consistency`-Tests (Monatsgrenzen/Navigation).

## Bekannte Einschränkungen / Nicht-Ziele
- Bewusst zurückgestellt (auf Wunsch des Nutzers):
  - FT04 Concurrent Cascade-Add (`ft04.multi-user.integration`) — deterministisch rot; eine von zwei gleichzeitigen `cascade-add`-Anfragen liefert 500 statt idempotentem 200.
  - Zwei Browser-Ausreißer: `appointment-cancellation` (Projektbetrag 14999.90 statt 0.00) und `calendar-week-customer-preview-phone` (Wochen-Hover-Preview ohne Telefonzeile).
- `BWK-01` (`calendar-move.blocked-week-plan`) schlug im seriellen Sammellauf eigenständig fehl (Formular-Speichern, kein Monatskalender); im ursprünglichen Parallellauf war die Datei grün. Nicht Teil dieses Auftrags.
- `secrets`-Gate (gitleaks) meldet einen Treffer in `backups/.env.prod` (gitignored, nicht versioniert) — lokales Artefakt, kein Repo-Leak.
