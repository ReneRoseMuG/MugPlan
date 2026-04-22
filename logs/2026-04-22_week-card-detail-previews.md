# Wochen-Terminkarten Detailmodus und Terminlisten-Previews

## Zweck
Korrektur der Wochen-Terminkarten im Detailmodus sowie der Terminlisten-Previews. Ziel war, dass Projektinformationen in Detailkarten dichter und vollständiger sichtbar sind, ohne dass Anmerkungen die Kartenhöhe unkontrolliert bestimmen, und dass Hover-Previews im sichtbaren Viewport positioniert werden.

## Scope
- Detailmodus der Wochen-Terminkarte zeigt die vollständige Artikelliste im Projekt-Subpanel.
- Projekt-Anmerkungen werden im sichtbaren Detailbereich auf Headline plus maximal vier Zeilen begrenzt.
- Die vollständige Projekt-Preview im Detailmodus ist wieder über Hover aktiv.
- Wochenkartenhöhen werden pro Woche, Tour-Lane und vertikaler Kartenreihe vereinheitlicht.
- Terminlisten-Previews verwenden die Detaildarstellung der Wochenkarte.
- Cursorbasierte Hover-Previews weichen an Viewport-Rändern horizontal und vertikal aus.

## Technische Entscheidungen
- Keine Backend-, API-, Schema- oder Persistenzänderung.
- Die bestehende Wochenkartenstruktur bleibt erhalten; geändert wurden nur Projekt-Panel-Darstellung, Preview-Modus und Höhen-Gruppierung.
- Für die Höhenlogik ist eine Lane die gesamte Tour-Zeile. Mehrere vertikal gestapelte Termine an einem Tag sind mehrere Reihen innerhalb derselben Lane.
- Die Gleichhöhe gilt deshalb nicht pauschal für eine ganze Tour, sondern für `Woche + Tour-Lane + vertikale Reihe`.
- Die frühere DOM-Sondermessung innerhalb des Projektpanels wurde verworfen; die Karte wird wieder als Ganzes gemessen.

## Betroffene Dateien
- Frontend:
  - `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`
  - `client/src/components/calendar/CalendarWeekAppointmentPanelProject.tsx`
  - `client/src/components/calendar/CalendarWeekSpanningTile.tsx`
  - `client/src/components/calendar/CalendarWeekView.tsx`
  - `client/src/components/ui/badge-previews/appointment-weekly-panel-preview.tsx`
  - `client/src/components/ui/hover-preview.tsx`
  - `client/src/components/ui/info-badge.tsx`
  - `client/src/components/ui/table-view.tsx`
- Tests:
  - `tests/unit/ui/appointmentPreviews.orderNumberWiring.test.tsx`
  - `tests/unit/ui/appointmentWeeklyPanelPreview.width.test.tsx`
  - `tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx`
  - `tests/unit/ui/hoverPreview.delaySetting.test.tsx`
  - `tests/unit/ui/tableView.infoBadgePreviewOptions.test.tsx`
  - `tests/e2e-browser/appointment-with-article-list.browser.e2e.spec.ts`
  - `tests/e2e-browser/appointments-list.tour-employee.browser.e2e.spec.ts`

## Testhinweise
- Zielgerichtete Unit-Suite für Kalenderkarten, Previews und Hover-Positionierung: grün.
- `npm run typecheck`: grün.
- Der direkte Unit-Test für die wieder aktivierte Detail-Projekt-Preview: grün.
- Browser-Tests wurden erweitert, aber noch nicht final vollständig erfolgreich validiert; die Terminlisten-Preview-Suite benötigt vor der finalen Freigabe noch einen stabilen Browserlauf.

## Bekannte Einschränkungen
- Der vollständige Testlauf wurde in diesem Auftrag nicht ausgeführt.
- Für die Browser-E2E-Abdeckung ist nach der letzten UI-Korrektur noch ein serieller Re-Run der betroffenen Suites offen.
