# Gruppe H/I Follow-Log

## 1. Bearbeitete Gruppen

- Name der Gruppen:
  - Gruppe H - Meta-Hygiene und Wartbarkeit
  - Gruppe I - Bereiche mit fehlender sinnvoller Verhaltenspruefung
- Betroffene Testdateien:
  - Behalten/formal nachgezogen:
    - `tests/integration/bootstrap/ensureSystemRoles.test.ts`
    - `tests/integration/extraction/documentTextExtractor.fixture.test.ts`
    - `tests/integration/joins/joinReplaceAtomicity.test.ts`
    - `tests/unit/auth/loginIdentifier.test.ts`
    - `tests/unit/auth/passwordHash.test.ts`
    - `tests/unit/authorization/roleGuards.test.ts`
    - `tests/unit/authorization/userCreate.test.ts`
    - `tests/unit/extraction/documentTextExtractor.test.ts`
    - `tests/unit/invariants/attachmentRules.test.ts`
    - `tests/unit/invariants/conflictPriority.test.ts`
    - `tests/unit/invariants/lockingRules.test.ts`
    - `tests/unit/invariants/optimisticLocking.test.ts`
    - `tests/unit/ui/tableView.stickyHeader.test.tsx`
    - `tests/unit/invariants/resetAbsoluteStateSqlGuard.test.ts`
  - Ersetzt:
    - `tests/unit/hooks/useListFilters.paging.test.ts`
    - `tests/unit/ui/documentExtractionDialog.fieldReport.wiring.test.tsx`
    - `tests/unit/ui/documentExtractionDialog.ui.test.tsx`
    - `tests/unit/ui/documentExtractionDropzone.ui.test.tsx`
    - `tests/unit/ui/tableView.infoBadgePreviewOptions.test.tsx`
    - `tests/unit/ui/tableView.stickyFrame.test.tsx`
    - `tests/unit/ui/helpTextsPage.formNavigation.wiring.test.tsx`
    - `tests/unit/ui/helpTextsPage.seed.wiring.test.tsx`
    - `tests/integration/server/projects.order-number-conflict.integration.test.ts`
    - `tests/unit/ui/home.behavior.test.tsx`
  - Geloescht:
    - `tests/unit/ui/home.appointmentOverlay.wiring.test.ts`
    - `tests/unit/ui/home.calendarContextual.returnContext.wiring.test.ts`
    - `tests/unit/ui/home.sidebarHiddenOnFormEdit.wiring.test.ts`
    - `tests/unit/ui/home.weekScrollRestore.wiring.test.ts`
    - `tests/unit/repositories/projectsRepository.orderNumberConflict.wiring.test.ts`
- Fachlicher Fokus:
  - Meta-Hygiene: fehlende `Test Scope`-Kommentare und verbleibende Quelltextkopplung aufraeumen.
  - Gap-Schliessung: kleine, echte Verhaltenstests fuer `Home`, `HelpTexts`, `DocumentExtraction`, `TableView`, `useListFilters` und die FT21-Auftragsnummer-Kollisionspruefung nachziehen.

## 2. Durchgefuehrte Aenderungen

- Beibehalten wurden die bereits fachlich brauchbaren Regel- und Integritaetstests; sie haben jetzt nur den fehlenden `Test Scope`-Kommentar erhalten.
- Ersetzt wurden Quelltexttests durch Verhaltenspruefungen:
  - `useListFilters` prueft jetzt Paging-Reset und Query-Param-Aufbau ueber Hook-Verhalten.
  - `DocumentExtractionDialog` und `DocumentExtractionDropzone` pruefen sichtbare Dialogmodi, Reihenfolge, weitergereichte Section-Props und das sichtbare Dropzone-Markup.
  - `TableView` prueft sichtbaren Footer-/Overflow-Rahmen und echte `HoverPreview`-Optionen statt Source-Strings.
  - `Home` prueft Overlay, Sidebar-Ausblendung, Kontextkalender und Wochen-Scroll-Restore ueber gerenderte Zustandsgrenzen.
  - `HelpTextsPage` prueft Seed-Aufruf, Query-Invalidierung, sichtbare HelpKeys sowie Parent-Navigation fuer Neu/Bearbeiten.
  - Die fruehere Repository-Quelltextpruefung fuer FT21 wurde durch einen Integrationstest ersetzt, der nur aktive Projekte als Duplikatkonflikt zaehlt.
- Geloescht wurden nur die fachlich irrefuehrenden `readFileSync`-/Source-Tests, die durch bessere Verhaltenspruefungen ersetzt sind.

## 3. Fachliche Verbesserung

- Jetzt geprueftes echtes Verhalten:
  - `Home` transportiert Overlay- und Rueckwegkontext sichtbar weiter.
  - `HelpTextsPage` seeded fehlende Keys beim Oeffnen und delegiert Bearbeitung sauber an den Parent.
  - `DocumentExtractionDialog` zeigt die richtigen sichtbaren Aktionspfade je Modus.
  - `TableView` rendert Footer-/Overflow-Verhalten und Preview-Optionen real.
  - `projectsService.isOrderNumberAlreadyImported` blockiert nur bei aktiven Projekten.
- Entfernte Scheinsicherheit:
  - Assertions auf Quelltext, JSX-Fragmente, Dateiinhalte und Literal-Suche in `Home`, `DocumentExtraction`, `TableView`, `useListFilters` und dem FT21-Repository-Fall.
- Weiterhin offene Luecken:
  - `reset_absolute_state.sql` ist weiter nur als statischer Guard-Sentinel abgesichert; ein sauberer Laufzeittest wuerde die Script-Ausfuehrung gegen echte DB-Identitaetschecks benoetigen und wuerde diesen kleinen Testauftrag ueberdehnen.
  - Die grossen Inventar-Luecken aus Gruppe I fuer FT12, FT14, FT22, `bulkImportService` sowie die bereits entfernten FT30-Abwesenheitspfade bleiben ausserhalb dieses kompakten Abschlussauftrags offen.

## 4. Testergebnis

- Ausgefuehrte betroffene Tests:
  - `npm run test:unit -- tests/unit/hooks/useListFilters.paging.test.ts`
  - `npm run test:unit -- tests/unit/ui/documentExtractionDialog.fieldReport.wiring.test.tsx tests/unit/ui/documentExtractionDialog.ui.test.tsx tests/unit/ui/documentExtractionDropzone.ui.test.tsx tests/unit/ui/tableView.infoBadgePreviewOptions.test.tsx tests/unit/ui/tableView.stickyFrame.test.tsx tests/unit/ui/home.behavior.test.tsx tests/unit/ui/helpTextsPage.seed.wiring.test.tsx tests/unit/ui/helpTextsPage.formNavigation.wiring.test.tsx`
  - `npm run test:unit -- tests/unit/ui/tableView.infoBadgePreviewOptions.test.tsx tests/unit/ui/tableView.stickyFrame.test.tsx`
  - `npm run test:integration -- --reporter=verbose tests/integration/server/projects.order-number-conflict.integration.test.ts`
- Gruen:
  - `tests/unit/hooks/useListFilters.paging.test.ts` (2 Tests)
  - `tests/unit/ui/documentExtractionDialog.fieldReport.wiring.test.tsx` (1 Test)
  - `tests/unit/ui/documentExtractionDialog.ui.test.tsx` (2 Tests)
  - `tests/unit/ui/documentExtractionDropzone.ui.test.tsx` (2 Tests)
  - `tests/unit/ui/tableView.infoBadgePreviewOptions.test.tsx` (1 Test, danach zusaetzlich mock-bereinigt erneut gruen)
  - `tests/unit/ui/tableView.stickyFrame.test.tsx` (2 Tests, danach zusaetzlich mock-bereinigt erneut gruen)
  - `tests/unit/ui/home.behavior.test.tsx` (7 Tests)
  - `tests/unit/ui/helpTextsPage.seed.wiring.test.tsx` (1 Test)
  - `tests/unit/ui/helpTextsPage.formNavigation.wiring.test.tsx` (2 Tests)
  - `tests/integration/server/projects.order-number-conflict.integration.test.ts` (2 Tests)
- Fehlgeschlagen:
  - keine

## 5. Offene Blocker

- Fachlich sinnvoll, aber ohne Produktionsaenderung in diesem kleinen Auftrag nicht sauber umsetzbar:
  - echter Laufzeittest fuer `script/sql/reset_absolute_state.sql` inklusive Guard-Verhalten gegen falsches Zielschema
  - groessere neue Verhaltenstest-Pakete fuer FT12, FT14, FT22 und `bulkImportService`, weil dort nicht nur ein schwacher Einzeltest ersetzt werden muss, sondern erst Testoberflaeche und fachlicher Sollschnitt sauber abgegrenzt werden muessen
