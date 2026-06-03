# Log: Monatskalender – Navigation, Tageszellen-Format, KW-Eingabefeld

**Datum:** 02.06.26  
**Branch:** work  
**Klasse:** 4 – Kleine lokale Fixes

---

## Zweck

Drei isolierte Korrekturen am Monatskalender:
1. Navigationsbug: Vorwärts-/Rückwärts-Blättern übersprang einen Monat (z. B. April → Juni).
2. Tageszellen-Format: Tage zeigten nur eine Tageszahl ohne Wochentag und Monat.
3. KW-Eingabefeld im Footer war im Monatskalender aktiv, obwohl es dort keinen Nutzen hat.

---

## Ursachen und Fixes

### Fix 1 – Navigationsbug (`CalendarMonthSheetView.tsx`)

**Ursache:** `currentDate` wird als ISO-Wochenstart (Montag) gespeichert. Wenn dieser Montag noch im Vormonat liegt (z. B. 27. Apr als Wochenstart für die Woche mit dem 01. Mai), las `buildMonthSheetMatrix(currentDate.getMonth() + 1)` den falschen Monat (April statt Mai). Die Navigationsfunktionen `getNextMonthWindowStart`/`getPreviousMonthWindowStart` ermitteln den angezeigten Monat intern via `addDays(windowStart, 6)` – `buildMonthSheetMatrix` tat das nicht, was zu einem Monat Versatz und damit zum Überspringen führte.

**Fix:** Vor der Monatsextraktion `addDays(currentDate, 6)` anwenden. Der Sonntag derselben ISO-Woche liegt immer im korrekt angezeigten Monat, konsistent mit der Navigationslogik.

### Fix 2 – Tageszellen-Format (`CalendarMonthSheetView.tsx`)

**Ursache:** Der Tageskopf-Span zeigte nur `format(day.date, "d")` (einzelne Zahl) in einem starr dimensionierten 24×24-Kreis.

**Fix:** Span auf flexibles Inline-Label umgestellt. Inhalt: `weekDays[dayIdx]` (bereits vorhandenes Array mit "Mo"–"So") plus `format(day.date, "dd. MMM", { locale: de })`. Ergibt z. B. „Mo 01. Mai". Heute-Highlighting (Farbe via `dayNumberClassName`) bleibt erhalten.

### Fix 3 – KW-Eingabefeld (`CalendarWorkspace.tsx`)

**Ursache:** `isKwJumpEnabled` war `activeView === "week" || activeView === "month" || activeView === "monthSheet"`.

**Fix:** Auf `activeView === "week"` beschränkt. Das Eingabefeld verschwindet im Monatskalender; alle abhängigen Zustände werden durch vorhandene Logik korrekt zurückgesetzt.

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `client/src/components/calendar/CalendarMonthSheetView.tsx` | Fix 1 + Fix 2 |
| `client/src/components/CalendarWorkspace.tsx` | Fix 3 |

---

## Hinweise zum Testen

- Monatskalender öffnen, vorwärts und rückwärts blättern: jeder Klick muss genau einen Monat weiterschalten.
- Jede Tageszelle muss Wochentag, Tageszahl und Monatsabkürzung zeigen (z. B. „Di 02. Jun").
- Heutiger Tag muss farblich hervorgehoben bleiben.
- Im Footer des Monatskalenders: kein KW-Eingabefeld sichtbar.
- Im Wochenkalender: KW-Eingabefeld unverändert vorhanden und funktionsfähig.

---

## Bekannte Einschränkungen

Keine. Alle drei Fixes sind vollständig lokal und haben keine Auswirkung auf andere Kalenderansichten, die API oder die Datenbank.
