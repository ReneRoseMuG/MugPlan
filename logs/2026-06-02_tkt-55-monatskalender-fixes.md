# Log: TKT-55/66/69/71 — Monatskalender-Fixes

**Datum:** 02.06.26
**Branch:** `tkt-55-monatskalender-fixes`
**Tickets:** TKT-55 (Parent), TKT-66, TKT-69, TKT-71

---

## Zweck

Behebung von vier zusammenhängenden Bugs im Monatskalender-View (`CalendarMonthSheetView.tsx`):

1. **TKT-55** — Kalender auf kleinen Bildschirmen unvollständig (Wochen werden abgeschnitten)
2. **TKT-66** — Sa/So-Spalten zu schmal, auch wenn Termine vorhanden
3. **TKT-69** — „Ausschneiden"-Aktion fehlt im Termin-Kontextmenü
4. **TKT-71** — Langer Mausklick löst Ausschneiden-Funktion aus (unerwünscht)

---

## Scope der Änderungen

### `client/src/lib/calendar-layout.ts`
- Neue exportierte Funktion `applyWeekendExpansion(dayWeights, hasSat, hasSun)`: setzt Sa/So-Spaltengewicht auf `1fr` (voller Wochentag), wenn an diesen Tagen Termine vorliegen. Analog zur bestehenden Logik im Wochenkalender (`CalendarWeekView.tsx`, Zeile 2438).

### `client/src/hooks/useSettings.ts`
- Neuer Setting-Key `"calendar.monthFitPage"` (boolean, Default `true`): steuert ob der Monatskalender bildschirmfüllend skaliert wird. Persistenz per User-Scope.

### `client/src/components/calendar/CalendarMonthSheetView.tsx`

**TKT-66 — Weekend-Expansion:**
- `effectiveDayWeights`: nach Laden der `visibleAppointments` wird geprüft, ob Sa oder So im sichtbaren Fenster Termine tragen. Falls ja, wächst die jeweilige Spalte auf volles `1fr`.
- `dayGridTemplate` und `monthRowTemplate` nutzen nun `effectiveDayWeights` statt `dayWeights`.
- `getSlotBarPosition` rechnet mit `effectiveTotalDayWeight` (wird als `useCallback` + `useMemo` gecacht).

**TKT-55 — Seite füllen:**
- `ResizeObserver` auf dem äußeren Container-Div misst die verfügbare Höhe (debounced, 100 ms).
- `scaleFactor = min(1.0, max(0.65, availableHeight / totalContentHeight))`.
- In `MonthSheetSection`: `scaleStyle` mit `transform: scale(scaleFactor)` und kompensierten `width/height` (100%/scale), sodass der skalierte Inhalt den Container exakt füllt.
- Toggle-Button „Seite füllen" im Kalender-Header mit eingebautem Mini-Switch; schreibt `calendar.monthFitPage` per `setSetting` zurück.

**TKT-69 — Ausschneiden im Menü:**
- `MonthCompactBarWithMenu`: neuer Prop `onSelectForMove?: () => void`.
- Dropdown-Item „Ausschneiden" (Scissors-Icon) erscheint, wenn `onSelectForMove` übergeben wird.
- Item wird von der Aufrufstelle mit `toCalendarMoveSelection(appointment)` verdrahtet, analog zur bisherigen Long-Press-Logik.

**TKT-71 — Long-Press entfernt:**
- `moveSelectionLongPressRef`, `handleMoveSelectionPointerDown`, `handleMoveSelectionPointerMove`, `clearMoveSelectionLongPress`, `buildMoveSelectionPointerHandlers` und die Konstante `MOVE_SELECTION_LONG_PRESS_MS` vollständig entfernt.
- `MonthCompactBarWithMenu` hat keine Pointer-Handler-Props mehr.

---

## Technische Entscheidungen

- **CSS transform statt Panzoom-Library:** Der Use-Case ist ein einmaliger, automatisch berechneter Scale-Faktor — keine interaktive Zoom-Geste. Die native CSS-Lösung benötigt keine zusätzliche Abhängigkeit und ist zuverlässiger.
- **Globale Weekend-Expansion im Monatskalender:** Anders als im Wochenkalender (eigenes Grid pro Woche) hat der Monatskalender ein einziges `gridTemplateColumns` für alle Wochen. Die Expansion wird deshalb global angewendet, wenn irgendeiner der Sa/So-Tage im sichtbaren Fenster Termine trägt.
- **Scale-Untergrenze 0.65:** Verhindert unleserlich kleine Schrift; bei extremem Platzmangel greift `overflow-y: auto` als Fallback (via `overflow-hidden` auf dem Container).
- **Debounce 100 ms:** Verhindert Flackern beim Resize von Side-Panels.

---

## Betroffene Dateien

| Datei | Art der Änderung |
|---|---|
| `client/src/lib/calendar-layout.ts` | Neue Funktion `applyWeekendExpansion` |
| `client/src/hooks/useSettings.ts` | Neuer Key `calendar.monthFitPage` |
| `client/src/components/calendar/CalendarMonthSheetView.tsx` | Alle vier Bug-Fixes |

---

## Testen

- Monatskalender auf kleinem Fenster öffnen → alle 6 Wochen sichtbar, Toggle schaltet Skalierung
- Termin auf Samstag legen → Sa-Spalte wächst auf volle Breite
- Drei-Punkte-Menü auf Termin → „Ausschneiden" erscheint, startet die Verschieben-Funktion
- Langen Klick auf Termin halten → keine Reaktion mehr

---

## Bekannte Einschränkungen

- Die Weekend-Expansion reagiert auf Termine im gesamten sichtbaren Fenster (6 Wochen), nicht pro einzelner Zeile — da der CSS-Grid nur eine globale `gridTemplateColumns` unterstützt.
- Der `scaleFactor` berücksichtigt nur die Wochenzeilen-Höhe. Feste Overhead-Elemente (Header, Spaltenheader, Woche-vor/zurück-Buttons) werden implizit mitabgezogen, weil der `ResizeObserver` auf dem Container der Wochenzeilen selbst läuft.
