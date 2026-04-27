# Tour-Journal und KW-Journal

## Zweck

Einführung einer nachvollziehbaren Journalisierung für Touren und tourbezogene Wochenplanung. Änderungen an Touren, Kalenderwochen und Wochenplan-Mitarbeiterkaskaden sollen im Tour-Journal sichtbar werden. Zusätzlich soll das Tour-KW-Formular einen eigenen Journalbereich als gefilterte Sicht auf denselben Datenbestand erhalten.

## Scope

- Tour-Create, Tour-Rename und Tour-Delete journalisiert
- KW-Anlegen, Blockieren und Freigeben mit zusätzlichem Tour-Kontext versehen
- Wochenplan-Mitarbeiteraktionen und ihre Termin-Kaskaden um Tour-Kontext ergänzt
- Tour-Journalbereich im Tourformular ergänzt
- KW-Journalbereich im TourWeekForm für Tour-Scope ergänzt
- Vorbelegung von `KW einfügen` auf die nächste freie editierbare Woche geändert
- Dichte Unit-, Integration- und Browser-Tests für die neuen Pfade ergänzt

## Technische Entscheidungen

- Keine doppelte Datenhaltung und keine doppelten Facheinträge: Mehrfachsichtbarkeit wird ausschließlich über zusätzliche Journal-Kontexte hergestellt.
- Tour erhielt einen eigenen Journal-Kontext-Helfer in `journalService`.
- Das KW-Journal verwendet weiterhin den bestehenden `calendar_week`-Kontext mit `recordKey` im Format `yyyy-ww-tourId`.
- Tour-KW-Notizen propagieren zusätzlich in den Tour-Kontext, damit wochenbezogene Einträge im Tour-Journal vollständig bleiben.
- Die freie-KW-Vorbelegung bleibt eine UI-Verbesserung; der serverseitige Idempotenz-/Duplikatschutz in `getOrCreateWeekTx(...)` bleibt unverändert die technische Sicherheitsgrenze.

## Betroffene Dateien

- `client/src/components/TourEditForm.tsx`
- `client/src/components/TourWeekForm.tsx`
- `client/src/components/JournalRecordsView.tsx`
- `server/controllers/toursController.ts`
- `server/controllers/tourWeeksController.ts`
- `server/controllers/tourWeekEmployeesController.ts`
- `server/controllers/calendarWeekNotesController.ts`
- `server/lib/journalMessages.ts`
- `server/repositories/journalRepository.ts`
- `server/services/journalService.ts`
- `server/services/toursService.ts`
- `tests/integration/server/tourJournal.integration.test.ts`
- `tests/integration/server/journal.contexts.integration.test.ts`
- `tests/integration/server/tourWeekEmployees.integration.test.ts`
- `tests/integration/server/ft04.tour-management.integration.test.ts`
- `tests/unit/services/journalService.test.ts`
- `tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx`
- `tests/unit/ui/tourWeekForm.render.test.tsx`
- `tests/e2e-browser/ft04.tour-employee-cascade.browser.e2e.spec.ts`

## Hinweise zum Testen

Gezielt verifiziert mit:

- `npm run test:unit -- tests/unit/services/journalService.test.ts tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx tests/unit/ui/tourWeekForm.render.test.tsx`
- `npm run test:integration -- --reporter=verbose tests/integration/server/tourJournal.integration.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/journal.contexts.integration.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/tourWeekEmployees.integration.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/ft04.tour-management.integration.test.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/ft04.tour-employee-cascade.browser.e2e.spec.ts`

Zusätzlich geprüft:

- `npm run typecheck`

## Bekannte Einschränkungen

- `npm run typecheck` meldet weiterhin einen bereits bestehenden, auftragsfremden Fehler in `server/repositories/reportsRepository.ts` wegen `normalizeReportName`.
- Die bereits vorher untracked Datei `docs/db-schema.svg` gehört nicht zu diesem Auftrag und wurde bewusst weder geändert noch committed.
