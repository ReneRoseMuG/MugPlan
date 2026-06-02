# Log: Monatskalender — echte Monatsansicht

**Datum:** 02.06.26
**Branch:** `tkt-55-monatskalender-fixes`

---

## Zweck

Der Monatskalender zeigte bisher immer genau 6 Wochen (starres Fenster), unabhängig von Monatsgrenzen. Für Juni 2026 bedeutete das: Anzeige bis 12. Juli — falsch für eine Monatsansicht.

---

## Ursache

`CalendarWorkspace` übergab `visibleWeekCount={MONTH_SHEET_WINDOW_WEEK_COUNT}` (= 6) an `MonthSheetGrid`. Das erzwingt `buildMonthWindowMatrix` statt `buildMonthSheetMatrix`. Das Modell `buildMonthSheetMatrix` existierte bereits und berechnet korrekt alle Wochen, die Tage des jeweiligen Monats enthalten — inkl. unvollständiger Randwochen.

---

## Änderung

**`client/src/components/CalendarWorkspace.tsx`**

- `visibleWeekCount={MONTH_SHEET_WINDOW_WEEK_COUNT}` entfernt
- `onPreviousWeek={prevWeekWindow}` und `onNextWeek={nextWeekWindow}` entfernt
- `nextWeekWindow`- und `prevWeekWindow`-Funktionen entfernt (unused)
- Import von `MONTH_SHEET_WINDOW_WEEK_COUNT` entfernt (unused)

---

## Resultat

- Monatsansicht Juni 2026: zeigt KW23 (01.06) bis KW27 (05.07) — 5 Wochen
- Monatsfremde Tage (01.–05. Juli in KW27) werden gedimmt gerendert — bereits vorhandene Logik via `isCurrentMonth`-Flag
- Monatstitel: „Juni 2026" statt „Juni – Juli 2026"
- Navigation: Pfeile links/rechts blättern monatsweise (`getNextMonthWindowStart` / `getPreviousMonthWindowStart`) — unverändert korrekt
- „Seite füllen"-Skalierung passt sich automatisch an die tatsächliche Wochenanzahl an (4–6 je Monat)

---

## Nicht verändert

- `buildMonthWindowMatrix` und `MONTH_SHEET_WINDOW_WEEK_COUNT` bleiben erhalten — genutzt von `EmployeeUtilizationView` und `TourPostalPlanView`
- URL-State (`windowStart`) und `monthWindowRestoreApplied`-Logik unverändert — funktionieren mit Monatsanfang-Datumswerten korrekt
