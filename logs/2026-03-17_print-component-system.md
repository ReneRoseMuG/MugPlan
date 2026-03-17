# Log: Generisches Print-Komponenten-System

**Datum:** 2026-03-17
**Typ:** Reiner Refactor

---

## Ergebnis

Erfolgreich abgeschlossen. Alle Akzeptanzkriterien erfüllt.

## Neue Dateien

- `client/src/components/print/PrintPageShell.tsx`
- `client/src/components/print/PrintSectionHeader.tsx`
- `client/src/components/print/PrintPageHeader.tsx`
- `client/src/components/print/PrintSummaryPage.tsx`
- `client/src/components/print/PrintWeekPage.tsx`
- `client/src/components/print/PrintDayColumn.tsx`
- `client/src/components/print/PrintAppointmentSlot.tsx`
- `tests/unit/ui/printComponents.primitives.test.tsx`

## Geänderte Dateien

- `client/src/components/calendar/CalendarTourPrintPreviewPageShell.tsx` → Re-Export
- `client/src/components/calendar/CalendarTourPrintSummaryPage.tsx` → PrintSummaryPage + PrintPageHeader
- `client/src/components/calendar/CalendarTourPrintWeekPage.tsx` → PrintWeekPage
- `client/src/components/calendar/CalendarTourPrintDayColumn.tsx` → PrintDayColumn
- `client/src/components/calendar/CalendarTourPrintAppointmentCard.tsx` → PrintAppointmentSlot
- `docs/TEST_MATRIX.md` → Eintrag ergänzt

## Testergebnis

- `calendarTourPrintPreview.components.test.tsx` ✓ (3/3 grün, unverändert)
- `calendarTourPrintPreviewDialog.navigation.test.tsx` ✓ (2/2 grün, unverändert)
- `printComponents.primitives.test.tsx` ✓ (5/5 grün, neu)
- lint ✓
- Gesamt unit: 186 passed (4 pre-existente Fehler in FT03/FT16/FT18/FT27, unberührt)

## Besonderheit: PrintWeekPage gridTestId

`PrintWeekPage` hat zusätzlich `gridTestId?` neben `testId?` erhalten, damit der
bestehende Test-Check auf `tour-print-week-grid-N` weiterhin funktioniert.
Im Task-Dokument nicht explizit erwähnt, aber für Regressionssicherheit notwendig.
