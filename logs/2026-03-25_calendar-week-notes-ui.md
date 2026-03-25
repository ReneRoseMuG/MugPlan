# Log: Kalenderwochen-Notizen – UI-Anbindung und Druckausgabe

**Datum:** 2026-03-25
**Branch:** implement-week-notes

---

## Zweck

UI-Anbindung der Kalenderwochen-Notizen im Wochenblatt (`CalendarWeekView`) sowie Erweiterung der Druckausgabe (`CalendarTourPrintWeekPage`). Voraussetzung war die abgeschlossene Infrastruktur-Aufgabe (Tabelle und API-Endpunkte).

---

## Neue Komponenten und Verantwortlichkeiten

**`CalendarWeekNotesButton`**
Rendert pro Wochenblatt einen Button mit StickyNote-Icon und Notizen-Zähler. Lädt die Notizen der Woche via TanStack Query (Key: `["calendarWeekNotes", yearNumber, weekNumber]`). Ein Klick öffnet den Dialog.

**`CalendarWeekNotesDialog`**
Dialog mit `NotesSection`-Panel für CRUD-Operationen (Anlegen, Bearbeiten, Pinnen, Löschen) auf Kalenderwochen-Notizen. Alle Mutationen invalidieren den Query-Key der betreffenden Woche.

---

## Andockpunkt in CalendarWeekView

Pro Wochenblatt (`weekStarts.map(...)`) wird ein Header-Streifen direkt oberhalb des Tagesspalten-Grids eingefügt:
- Links: KW-Nummer und Datumsbereich der Woche
- Rechts: `CalendarWeekNotesButton` mit `readOnly={!canWriteNotes}` (LESER bekommen readOnly)

---

## Erweiterung der Druckausgabe

- `shared/routes.ts`: `tourPrintPreviewResponseSchema` — `weeks[].weekNotes` als Array von `tourPrintPreviewNoteSchema` ergänzt
- `server/services/appointmentsService.ts`: In `getTourPrintPreview` werden für jede Woche die Kalenderwochen-Notizen via `notesRepository.getCalendarWeekNotes` geladen und im selben Format wie `printNotes` (id, sourceType, title, body, cardColor, updatedAt) in die Response eingebettet
- `client/src/lib/tour-print-preview.ts`: `TourPrintPreviewPage` week-Typ um `weekNotes: TourPrintPreviewNote[]` erweitert; `buildTourPrintPages` überträgt `weekNotes` aus den API-Daten in die Wochenseiten
- `CalendarTourPrintWeekPage.tsx`: Rendert `weekNotes` im Header-Block unterhalb des Datumsbands via `CalendarTourPrintNoteBlock`

---

## Geänderte und neue Dateien

**Neu:**
- `client/src/components/calendar/CalendarWeekNotesButton.tsx`
- `client/src/components/calendar/CalendarWeekNotesDialog.tsx`
- `tests/unit/ui/calendarWeekNotesButton.wiring.test.tsx`
- `tests/unit/lib/tour-print-preview.weekNotes.test.ts`
- `logs/2026-03-25_calendar-week-notes-ui.md`

**Geändert:**
- `shared/routes.ts` — `tourPrintPreviewResponseSchema`: `weekNotes` in weeks
- `server/services/appointmentsService.ts` — `getTourPrintPreview`: weekNotes laden
- `client/src/lib/tour-print-preview.ts` — Typ und `buildTourPrintPages`
- `client/src/components/calendar/CalendarTourPrintWeekPage.tsx` — Druckausgabe
- `client/src/components/calendar/CalendarWeekView.tsx` — Header-Streifen + CalendarWeekNotesButton
- `tests/unit/lib/tour-print-preview.model.test.ts` — Fixture um `weekNotes: []` ergänzt
- `docs/TEST_MATRIX.md` — neue Einträge

---

## Bewusst nicht umgesetzt

Keine. Alle Aufgabenteile sind implementiert.
