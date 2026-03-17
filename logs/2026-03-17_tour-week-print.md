# Log: Tour-Wochenplanung Druckvorschau

**Datum:** 2026-03-17
**Branch:** feature/tour-week-print (von work abgezweigt, upstream gesetzt)

---

## Ergebnis

Erfolgreich abgeschlossen. Alle Akzeptanzkriterien erfüllt.

## Geänderte Dateien

- `client/src/lib/tour-print-preview.ts` – 3 neue Hilfsfunktionen, summary-page orientation landscape, tourName/fromDate/toDate
- `client/src/components/ui/filter-panels/calendar-filter-panel.tsx` – "Druckvorschau" → "Drucken"
- `client/src/components/calendar/CalendarTourPrintSummaryPage.tsx` – Querformat, neue Struktur
- `client/src/components/calendar/CalendarTourPrintWeekPage.tsx` – "Wochenplan/KW n", Tageslabels, ContinuationCard-Routing
- `client/src/components/calendar/CalendarTourPrintAppointmentCard.tsx` – Icon-Header (3 Typen), Kundenname/Ort statt Saunamodell

## Neue Dateien

- `client/src/components/calendar/CalendarTourPrintContinuationCard.tsx`

## Test-Updates (nötige Kompatibilitätsanpassungen)

- `tests/unit/ui/calendarTourPrintPreview.components.test.tsx` – Assertions auf neues Layout aktualisiert
- `tests/unit/ui/calendarTourPrintPreviewDialog.navigation.test.tsx` – lucide-react-Mock um Calendar + Clock erweitert
- `tests/unit/lib/tour-print-preview.model.test.ts` – "portrait" → "landscape" für summary-page
- `tests/unit/ui/calendarWorkspace.tourPrintPreview.wiring.test.tsx` – "Druckvorschau" → "Drucken"

## Testergebnis

- 186 passed, 4 pre-existente Fehler (FT03/FT16/FT18/FT27, unberührt)
- lint ✓
- Alle Print-Tests grün

## Besonderheit

`printNotes` wird server-seitig bereits auf `print === true` gefiltert – kein Client-Filter nötig.
