# Auftrag: Tour-Druckvorschau auf echte A4-Seiten

## Zweck

Die Tour-Druckvorschau wurde von einer bisherigen Wochen-/Summary-Darstellung auf eine echte paginierte A4-Listenansicht umgestellt. Ziel war, dass die Dialogvorschau physische Seiten zeigt, die Browser-Druckvorschau dieselbe Seitenteilung erkennt und die Inhalte sauber über mehrere Seiten verteilt werden.

## Scope

- FT31-Druckvorschau für Touren im Wochenkalender
- A4-Landscape-Seitenmodell mit Pagination
- Vereinheitlichte Tabellenbreiten über alle Wochentabellen
- Chronologisch sortierte Zusatzinformationen
- Druckrelevanter Tagfilter für die Info-Spalte
- Getrennter Screen- und Print-Pfad im Vorschau-Dialog
- Kleineres Dialog-Shell rund um die A4-Seite

## Technische Entscheidungen

- Das fachliche Dokumentmodell bleibt in `client/src/lib/tour-print-preview.ts`; darüber wurde eine höhenbasierte Pagination in physische Listen-Seiten gelegt.
- Wochen dürfen über Seiten fortgesetzt werden; Fortsetzungsseiten wiederholen Wochenkopf und Tabellenkopf.
- Zusatzinformationen werden als Karten gesammelt, chronologisch sortiert und seitenweise verteilt.
- Für die Info-Spalte werden nur die systemrelevanten Tags `Sondermaß` und `Reklamation` gedruckt; irrelevante Tags wie `Fix` werden herausgefiltert.
- Der Druckpfad wurde aus dem Dialogbaum gelöst: Für `Ctrl+P` wird ein eigener Print-Root per Portal direkt unter `body` gerendert, damit die Browser-Druckvorschau die tatsächliche Seitenzahl erkennt.
- Der sichtbare Dialog wurde enger um die A4-Seite gelegt, statt fast die gesamte Viewportbreite zu verwenden.

## Betroffene Dateien

- `client/src/components/CalendarWorkspace.tsx`
- `client/src/components/calendar/CalendarTourPrintPreviewDialog.tsx`
- `client/src/components/calendar/CalendarTourPrintAppointmentRow.tsx`
- `client/src/components/calendar/CalendarTourPrintListPage.tsx`
- `client/src/components/calendar/CalendarTourPrintNoteCard.tsx`
- `client/src/components/calendar/CalendarTourPrintTourNoteBlock.tsx`
- `client/src/components/calendar/CalendarTourPrintWeekTable.tsx`
- `client/src/components/calendar/CalendarTourPrintZusatzinformationen.tsx`
- `client/src/components/ui/filter-panels/calendar-filter-panel.tsx`
- `client/src/lib/tag-utils.ts`
- `client/src/lib/tour-print-preview.ts`
- `server/services/appointmentsService.ts`
- `shared/routes.ts`
- `tests/integration/server/tour-print-preview.integration.test.ts`
- `tests/e2e-browser/calendar-tour-print-preview.browser.e2e.spec.ts`
- `tests/unit/lib/tag-utils.test.ts`
- `tests/unit/lib/tour-print-preview.model.test.ts`
- `tests/unit/lib/tour-print-preview.weekNotes.test.ts`
- `tests/unit/ui/calendarFilterPanel.printSwitch.test.tsx`
- `tests/unit/ui/calendarTourPrint.subcomponents.smoke.test.tsx`
- `tests/unit/ui/calendarTourPrintPreview.components.test.tsx`
- `tests/unit/ui/calendarTourPrintPreviewDialog.navigation.test.tsx`
- `tests/unit/ui/calendarWorkspace.tourPrintPreview.wiring.test.tsx`
- `docs/TEST_MATRIX.md`

Zusätzlich wurden die nicht mehr verwendeten alten Print-Komponenten entfernt:

- `client/src/components/calendar/CalendarTourPrintAppointmentCard.tsx`
- `client/src/components/calendar/CalendarTourPrintContinuationCard.tsx`
- `client/src/components/calendar/CalendarTourPrintDayColumn.tsx`
- `client/src/components/calendar/CalendarTourPrintMembersList.tsx`
- `client/src/components/calendar/CalendarTourPrintSummaryPage.tsx`
- `client/src/components/calendar/CalendarTourPrintSummaryTable.tsx`
- `client/src/components/calendar/CalendarTourPrintWeekPage.tsx`

## Hinweise zum Testen

Gezielt erfolgreich ausgeführt:

- `npm run test:unit -- tests/unit/lib/tour-print-preview.model.test.ts tests/unit/lib/tour-print-preview.weekNotes.test.ts tests/unit/ui/calendarTourPrint.subcomponents.smoke.test.tsx tests/unit/ui/calendarTourPrintPreview.components.test.tsx tests/unit/ui/calendarTourPrintPreviewDialog.navigation.test.tsx tests/unit/ui/calendarFilterPanel.printSwitch.test.tsx tests/unit/ui/calendarWorkspace.tourPrintPreview.wiring.test.tsx`
- `npm run test:integration -- tests/integration/server/tour-print-preview.integration.test.ts --reporter=verbose`
- `npm run test:unit -- tests/unit/lib/tag-utils.test.ts tests/unit/lib/tour-print-preview.model.test.ts tests/unit/ui/calendarTourPrint.subcomponents.smoke.test.tsx tests/unit/ui/calendarTourPrintPreview.components.test.tsx tests/unit/ui/calendarTourPrintPreviewDialog.navigation.test.tsx`
- `npm run test:unit -- tests/unit/ui/calendarFilterPanel.printSwitch.test.tsx tests/unit/ui/calendarWorkspace.tourPrintPreview.wiring.test.tsx`
- `npm run test:unit -- tests/unit/ui/calendarTourPrintPreviewDialog.navigation.test.tsx`

Nicht grün:

- `npm run test:e2e:browser -- tests/e2e-browser/calendar-tour-print-preview.browser.e2e.spec.ts`
  Der Lauf endete in einem Timeout vor der Sichtbarkeitsbestätigung des Dialogs und wurde nicht als fachlich verifizierter Erfolg gewertet.
- `npm run typecheck`
  Weiterhin blockiert durch bereits bestehende Typdefinitionsprobleme in `server/services/dumpService.ts` (`archiver`, `unzipper`, implizites `any`).

## Bekannte Einschränkungen

- Die Browser-Druckvorschau wurde über Nutzer-Feedback iterativ korrigiert; ein vollständig grüner Browser-E2E-Lauf liegt für den finalen Stand noch nicht vor.
- Der Dialog ist bewusst nur noch wenig größer als die A4-Seite, bleibt aber wegen Kopfzeile, Paging-Info und Navigation nicht exakt blattgleich.
