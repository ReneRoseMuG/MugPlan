# Inventarliste problematischer Tests und Arbeitsgruppen

## Zweck

Praktisch nutzbare Arbeitsgrundlage fuer die schrittweise Nachbearbeitung der bestehenden Testlandschaft.

Dieser Bericht ist ein reiner Analyseauftrag. Es wurden keine Aenderungen an Produktivcode, Tests, Konfiguration, Dokumentation oder Projektstruktur vorgenommen.

## Ausgangsbasis und Vorgehen

Ausgangspunkt war der bestehende Test-Report unter:

- `logs/2026-03-19_testlandschaft-ist-analyse.md`

Zusaetzlich wurden alle vorhandenen Testdateien unter `tests/` einmal vollstaendig gesichtet, jedoch bewusst nur auf einem pragmatischen Erstniveau:

- alle 329 Testdateien wurden einbezogen
- keine vollstaendige Tiefenanalyse jeder Datei gegen den gesamten Codebestand
- stattdessen heuristische Erstbewertung nach Testmuster, Aussagekraft und fachlichem Risiko

Die Erstbewertung stuetzt sich auf:

- deaktivierte Tests (`describe.skip`, `it.skip`, `test.skip`)
- `readFileSync`-basierte Source-Checks
- Assertions auf Quelltext, Strings oder `data-testid` statt Laufzeitverhalten
- Tests, die erkennbar nur aktuellen Ist-Zustand dokumentieren
- formale Wartungsprobleme wie fehlende `Test Scope`-Kommentare
- die bereits im Test-Report identifizierten fachlich kritischen Luecken

## Sichtungsumfang

- Gesamtzahl gesichteter Testdateien: 329
- Davon mit mindestens einem klaren Warnsignal: 151
- Davon ohne unmittelbares Warnsignal in dieser Erstsichtung: 178

Heuristische Zaehler:

- `readFileSync` / Source-Assertion: 124 Dateien
- deaktivierte Tests oder Testdateien: 19 Dateien
- fehlender `Test Scope`-Kommentar: 13 Dateien
- dokumentierter aktueller Ist-Zustand statt klares Soll: 2 Dateien
- `data-testid`-Source-Pruefung innerhalb von Source-Tests: 45 Dateien

Wichtige Einschraenkung:

Diese Inventur ist absichtlich keine Vollbewertung jedes einzelnen gruener Tests. Sie ist eine belastbare Erstsortierung nach Aussagekraft und fachlichem Risiko. Einzelne Dateibewertungen muessen spaeter pro Arbeitsgruppe noch verfeinert werden.

---

## 1. Kurzfazit

Das Problemfeld ist gross, aber gut in nacheinander bearbeitbare Pakete schneidbar.

Dominierende Schwaechen:

- Source- und String-Tests auf Implementierungsdetails dominieren klar die problematischen Dateien.
- Die fachlich riskantesten Bereiche sind nicht einfach nur schwach getestet, sondern teilweise bewusst deaktiviert.
- Ein Teil der Testlandschaft konserviert aktuellen Ist-Zustand, obwohl fachlich nicht klar ist, ob dieser Zustand ueberhaupt gewollt ist.

Groesste fachliche Risiken:

- Availability / Absences / Kollisionen
- Rollen und Berechtigungen
- kritische Browser-Workflows
- Bereiche mit sichtbarer fachlicher Luecke trotz gruenem Gesamtbild

Gesamteinschaetzung:

Die Testlandschaft ist nicht primär zu klein, sondern in grossen Teilen methodisch zu schwach. Der Haupthebel fuer die Nacharbeit liegt deshalb weniger im "mehr testen", sondern im Ersetzen schwacher Source-Wiring-Tests durch echte Verhaltens- und Workflow-Pruefungen.

---

## 2. Inventarliste

Die Inventarliste ist absichtlich nicht rein nach Ordnern sortiert, sondern nach spaeter praktisch bearbeitbaren Testbereichen.

### 2.1 Availability / Absences / Kollisionen

Warum problematisch:

- fachlich hochkritische Domäne
- zentrale Tests sind deaktiviert
- gleichzeitig existieren schwache UI-Wiring-Tests auf Source-Ebene

Eintraege:

- `tests/unit/services/employeeAbsencesService.bulk.unit.test.ts`
  - Problem: deaktiviert
  - Schwächetyp: `skip`
  - Warum schwach: Kernregeln fuer Bulk-Ersatz sind derzeit nicht aktiv abgesichert
  - Behandlung: gesondert pruefen, spaeter bevorzugt reaktivieren
  - Prioritaet: hoch

- `tests/unit/services/employeeAbsencesService.ft30.test.ts`
  - Problem: deaktiviert
  - Schwächetyp: `skip`
  - Warum schwach: Servicevertrag fuer Rollen, Datumsregeln und Konfliktmapping ist blind
  - Behandlung: gesondert pruefen, spaeter bevorzugt reaktivieren
  - Prioritaet: hoch

- `tests/unit/services/employeeAvailabilityService.test.ts`
  - Problem: deaktiviert
  - Schwächetyp: `skip`
  - Warum schwach: Availability-Logik fuer Absenz- und Exit-Date-Konflikte ist ohne aktive Unit-Absicherung
  - Behandlung: gesondert pruefen, spaeter bevorzugt reaktivieren
  - Prioritaet: hoch

- `tests/unit/validation/employeeAbsences.dto.validation.ft30.test.ts`
  - Problem: deaktiviert
  - Schwächetyp: `skip`
  - Warum schwach: FT30-Contract-Validierung ist nicht aktiv
  - Behandlung: gesondert pruefen
  - Prioritaet: hoch

- `tests/integration/server/appointments.availability.ft30-ft01.integration.test.ts`
  - Problem: deaktiviert
  - Schwächetyp: `skip`
  - Warum schwach: zentrale Confirm-, Preview- und Bulk-Flow-Regeln sind nicht im realen API-Lauf abgesichert
  - Behandlung: gesondert pruefen, spaeter bevorzugt reaktivieren
  - Prioritaet: hoch

- `tests/integration/server/appointments.dragdrop.availability.integration.test.ts`
  - Problem: deaktiviert
  - Schwächetyp: `skip`
  - Warum schwach: Availability bei Drag-and-drop ist im realen PATCH-Vertrag nicht aktiv abgesichert
  - Behandlung: gesondert pruefen
  - Prioritaet: hoch

- `tests/integration/server/employeeAbsences.ft30.integration.test.ts`
  - Problem: deaktiviert
  - Schwächetyp: `skip`
  - Warum schwach: FT30-CRUD, Rollenmatrix und Historienverhalten sind nicht aktiv abgesichert
  - Behandlung: gesondert pruefen, spaeter bevorzugt reaktivieren
  - Prioritaet: hoch

- `tests/e2e-browser/availability-check-appointment-form.browser.e2e.spec.ts`
  - Problem: deaktiviert
  - Schwächetyp: `skip`
  - Warum schwach: sichtbares Availability-Feedback im Formular ist im Browser nicht abgesichert
  - Behandlung: gesondert pruefen
  - Prioritaet: hoch

- `tests/e2e-browser/calendar-drag-drop.validation-message.browser.e2e.spec.ts`
  - Problem: deaktiviert
  - Schwächetyp: `skip`
  - Warum schwach: kritischer Browser-Flow fuer Drag-and-drop-Konflikte fehlt
  - Behandlung: gesondert pruefen
  - Prioritaet: hoch

- `tests/e2e-browser/employee-absences.ft30.browser.e2e.spec.ts`
  - Problem: deaktiviert
  - Schwächetyp: `skip`
  - Warum schwach: sichtbarer FT30-CRUD-Flow im Browser fehlt
  - Behandlung: gesondert pruefen
  - Prioritaet: hoch

- `tests/e2e-browser/employee-absences.navigation.browser.e2e.spec.ts`
  - Problem: deaktiviert
  - Schwächetyp: `skip`
  - Warum schwach: globaler FT30-Einstieg ueber Navigation ist nicht abgesichert
  - Behandlung: gesondert pruefen
  - Prioritaet: hoch

- `tests/unit/ui/appointmentForm.availability-feedback.wiring.test.ts`
  - Problem: deaktiviert und source-coupled
  - Schwächetyp: `skip`, `readFileSync`, `source-assert`
  - Warum schwach: selbst die Rueckfallabsicherung prueft nur Quelltext statt Verhalten
  - Behandlung: spaeter eher ersetzen als einfach nur entskippen
  - Prioritaet: hoch

- `tests/unit/ui/calendarDragDrop.validationMessage.wiring.test.tsx`
  - Problem: deaktiviert und source-coupled
  - Schwächetyp: `skip`, `readFileSync`, `source-assert`
  - Warum schwach: kritischer Confirm-Flow nur auf Source-Ebene beschrieben
  - Behandlung: ersetzen
  - Prioritaet: hoch

- `tests/unit/ui/employeeAbsencesNavigation.wiring.test.ts`
  - Problem: deaktiviert und source-coupled
  - Schwächetyp: `skip`, `readFileSync`, `source-assert`
  - Warum schwach: Navigations- und CRUD-Bereich prueft nur Verdrahtungsannahmen
  - Behandlung: ersetzen
  - Prioritaet: hoch

- `tests/unit/ui/employeeAbsencesPanel.preview.wiring.test.ts`
  - Problem: deaktiviert und source-coupled
  - Schwächetyp: `skip`, `readFileSync`, `source-assert`
  - Warum schwach: Preview/Bulk-Flow wird nicht als Verhalten pruefbar gemacht
  - Behandlung: ersetzen
  - Prioritaet: hoch

- `tests/unit/ui/employeeAbsencesPanel.wiring.test.ts`
  - Problem: deaktiviert und source-coupled
  - Schwächetyp: `skip`, `readFileSync`, `source-assert`
  - Warum schwach: CRUD-Panel bleibt auf String- und Strukturpruefungen stehen
  - Behandlung: ersetzen
  - Prioritaet: hoch

- `tests/unit/ui/employeeForm.absencesTab.wiring.test.ts`
  - Problem: deaktiviert
  - Schwächetyp: `skip`
  - Warum schwach: Einbindung des FT30-Bereichs im Mitarbeiterformular ist nicht aktiv und nicht verhaltensorientiert abgesichert
  - Behandlung: gesondert pruefen
  - Prioritaet: hoch

- `tests/unit/ui/employeePickerDialogList.availability.wiring.test.tsx`
  - Problem: deaktiviert und source-coupled
  - Schwächetyp: `skip`, `readFileSync`, `source-assert`
  - Warum schwach: Unavailable-Liste und Startdatumspflicht werden nur an Quelltextmustern festgemacht
  - Behandlung: ersetzen
  - Prioritaet: hoch

### 2.2 Terminformulare und Dialogverhalten

Warum problematisch:

- grosse Menge source-coupled Unit-Tests
- viele gruen laufende Dateien mit geringer fachlicher Aussagekraft
- stark UI-nah, aber meist ohne echte Interaktion

Betroffener Bereich:

- `tests/unit/ui/appointmentAttachmentsPanel.grouping.wiring.test.tsx`
- `tests/unit/ui/appointmentEmployeeSlot.wiring.test.tsx`
- `tests/unit/ui/appointmentForm.appointmentCacheInvalidation.wiring.test.tsx`
- `tests/unit/ui/appointmentForm.createSidebarDrafts.wiring.test.tsx`
- `tests/unit/ui/appointmentForm.documentExtractionFlow.test.tsx`
- `tests/unit/ui/appointmentForm.extractionAttachmentLinking.wiring.test.tsx`
- `tests/unit/ui/appointmentForm.historical-validation.test.tsx`
- `tests/unit/ui/appointmentForm.layoutTourIntegration.test.tsx`
- `tests/unit/ui/appointmentForm.multiDayEditDates.wiring.test.tsx`
- `tests/unit/ui/appointmentForm.notes.wiring.test.tsx`
- `tests/unit/ui/appointmentForm.overlapConflictToast.wiring.test.tsx`
- `tests/unit/ui/appointmentForm.overlayBack.wiring.test.ts`
- `tests/unit/ui/appointmentForm.saveAndEmployeesPanelWiring.test.tsx`
- `tests/unit/ui/appointmentPreviews.attachmentCounters.wiring.test.ts`
- `tests/unit/ui/appointmentPreviews.notesCounters.wiring.test.ts`
- `tests/unit/ui/appointmentPreviews.orderNumberWiring.test.tsx`
- `tests/unit/ui/appointmentsListPage.tourLocking.wiring.test.tsx`
- `tests/unit/ui/attachmentsPanels.helpIcon.wiring.test.tsx`
- `tests/unit/ui/bulkImportDialogs.wiring.test.ts`

Problem:

- vorwiegend `readFileSync` plus String-/Source-Assertions

Schwächetyp:

- Source-Test
- struktureller UI-Test ohne echte Verhaltensaussage

Warum fachlich oder methodisch schwach:

- prueft meist, ob bestimmte Strings, Imports, Props, `data-testid` oder JSX-Fragmente im Quelltext vorkommen
- zeigt nicht belastbar, ob Dialoge, Fehlermeldungen, Cache-Invalidierung oder Formlogik aus Sicht des Nutzers wirklich funktionieren

Empfohlene Behandlung:

- ueberwiegend ersetzen

Prioritaet:

- hoch

### 2.3 Kalender, Drag-and-drop und visuelles Terminverhalten

Warum problematisch:

- komplexer und fachlich sensibler UI-Bereich
- viele Tests pruefen nur Struktur oder CSS-nahe Verdrahtung

Betroffener Bereich:

- `tests/unit/ui/calendar.historical-create-controls.test.tsx`
- `tests/unit/ui/calendarAppointmentCompactBar.headerStyle.wiring.test.tsx`
- `tests/unit/ui/calendarAppointments.notesCountNormalization.wiring.test.ts`
- `tests/unit/ui/calendarFilterPanel.weekDisplayMode.wiring.test.tsx`
- `tests/unit/ui/calendarMonthView.sortByTourIndex.wiring.test.ts`
- `tests/unit/ui/calendarTourPrintPreviewDialog.navigation.test.tsx`
- `tests/unit/ui/calendarWeekAppointmentNotesHover.preview.wiring.test.tsx`
- `tests/unit/ui/calendarWeekAppointmentPanel.continuationHeight.wiring.test.tsx`
- `tests/unit/ui/calendarWeekAppointmentPanel.headerTourColor.wiring.test.tsx`
- `tests/unit/ui/calendarWeekAppointmentPanel.tags.wiring.test.tsx`
- `tests/unit/ui/calendarWeekAppointmentPanel.weekCalendarAttachmentsPreview.wiring.test.tsx`
- `tests/unit/ui/calendarWeekAppointmentPanel.weekCalendarEmployeesPreview.wiring.test.tsx`
- `tests/unit/ui/calendarWeekAppointmentPanel.weekCalendarNotesPreview.wiring.test.tsx`
- `tests/unit/ui/calendarWeekAppointmentPanel.weeklyProjectDescriptionPreview.wiring.test.tsx`
- `tests/unit/ui/calendarWeekAttachmentHover.previewSizing.wiring.test.ts`
- `tests/unit/ui/calendarWeekSpanningTile.wiring.test.tsx`
- `tests/unit/ui/calendarWeekView.continuationHeight.wiring.test.tsx`
- `tests/unit/ui/calendarWeekView.laneCollapse.wiring.test.tsx`
- `tests/unit/ui/calendarWeekView.scrollRestore.wiring.test.tsx`
- `tests/unit/ui/calendarWeekView.spanningTiles.wiring.test.tsx`
- `tests/unit/ui/calendarWeekView.tourHeaderCounters.wiring.test.tsx`
- `tests/unit/ui/calendarWorkspace.tourPrintPreview.wiring.test.tsx`
- `tests/unit/ui/calendarWorkspace.viewSwitch.wiring.test.tsx`
- `tests/unit/ui/hoverPreview.weeklyNoScrollOptions.test.tsx`
- `tests/unit/ui/weekLaneState.rules.test.ts`

Problem:

- grosser Anteil Source-Assertions; nur ein kleiner Teil ist eher legitime Hilfslogik

Schwächetyp:

- Source-Test
- struktureller UI-Test

Warum fachlich oder methodisch schwach:

- kalenderrelevante Zustandswechsel, Scroll-/Collapse-/Preview-Verhalten und Interaktionen werden haeufig nicht wirklich ausgefuehrt
- dadurch droht falsche grüne Lage in einem sehr sichtbaren Nutzerbereich

Empfohlene Behandlung:

- source-coupled Files ueberwiegend ersetzen
- kleine reine Regeltests wie `weekLaneState.rules.test.ts` eher behalten und gesondert pruefen

Prioritaet:

- hoch

### 2.4 Kunden-, Mitarbeiter-, Projekt- und Entity-Formulare

Warum problematisch:

- grosser Block source-coupled Formular- und Seitenverdrahtung
- fachlich wichtig, aber methodisch meist zu nah am Quelltext

Betroffener Bereich:

- `tests/unit/ui/customerData.appointmentCacheInvalidation.wiring.test.tsx`
- `tests/unit/ui/customerData.documentExtractionFlow.test.tsx`
- `tests/unit/ui/customerData.notesSidebarLayout.wiring.test.ts`
- `tests/unit/ui/customerData.notesVersioning.test.tsx`
- `tests/unit/ui/customerData.versioning.test.tsx`
- `tests/unit/ui/customerDetailCard.relationCompact.test.tsx`
- `tests/unit/ui/employeeForm.removeFromAppointment.wiring.test.tsx`
- `tests/unit/ui/employeeSelectEntityEditDialog.memberHeaderAction.wiring.test.tsx`
- `tests/unit/ui/employeesPage.currentAppointmentsCounter.wiring.test.tsx`
- `tests/unit/ui/employeesPage.importDialog.wiring.test.tsx`
- `tests/unit/ui/employeesPage.scopeUx.test.tsx`
- `tests/unit/ui/employeesPage.versioning.test.tsx`
- `tests/unit/ui/entityAppointmentsSidebar.readonly.wiring.test.ts`
- `tests/unit/ui/entityAppointmentsSidebarWithDialog.wiring.test.tsx`
- `tests/unit/ui/entityCard.layout.test.tsx`
- `tests/unit/ui/entityCards.doubleClickEdit.wiring.test.ts`
- `tests/unit/ui/entityFormShell.layout.test.tsx`
- `tests/unit/ui/linkedProjectCard.customerAndOrderNumber.wiring.test.tsx`
- `tests/unit/ui/projectAppointmentsPanel.deleteWiring.test.tsx`
- `tests/unit/ui/projectAttachmentsPanel.grouping.wiring.test.tsx`
- `tests/unit/ui/projectForm.amountWiring.test.tsx`
- `tests/unit/ui/projectForm.appointmentCacheInvalidation.wiring.test.tsx`
- `tests/unit/ui/projectForm.calendarWorkspaceButton.wiring.test.tsx`
- `tests/unit/ui/projectForm.createSidebarDrafts.wiring.test.tsx`
- `tests/unit/ui/projectForm.deleteWiring.test.tsx`
- `tests/unit/ui/projectForm.documentExtractionFlow.test.tsx`
- `tests/unit/ui/projectForm.notesSidebarLayout.wiring.test.ts`
- `tests/unit/ui/projectForm.notesVersioning.test.tsx`
- `tests/unit/ui/projectStatusPage.actions.test.tsx`

Problem:

- vorwiegend `readFileSync`-basierte Strukturtests

Schwächetyp:

- Source-Test
- rein struktureller UI-Test

Warum fachlich oder methodisch schwach:

- prueft selten, ob Formulare aus Nutzersicht speichern, validieren, sperren oder sichtbar reagieren
- gruener Teststatus sagt daher oft wenig ueber echte Formularqualitaet aus

Empfohlene Behandlung:

- ueberwiegend ersetzen

Prioritaet:

- hoch

### 2.5 Notes, Help, Settings, Stammdaten und sonstige schwache UI-Strukturtests

Warum problematisch:

- fachlich oft weniger kritisch als Availability
- methodisch aber ein grosser Sammelblock schwacher Verdrahtungstests

Betroffener Bereich:

- `tests/unit/ui/helpIcon.emptyBodyFallback.wiring.test.tsx`
- `tests/unit/ui/helpIcon.fallbackKey.wiring.test.tsx`
- `tests/unit/ui/helpTextsPage.formNavigation.wiring.test.tsx`
- `tests/unit/ui/helpTextsPage.seed.wiring.test.tsx`
- `tests/unit/ui/helpTextsPage.versioning.test.tsx`
- `tests/unit/ui/listEmptyState.helpFallback.wiring.test.tsx`
- `tests/unit/ui/listLayouts.emptyStateHelpKeys.wiring.test.ts`
- `tests/unit/ui/login.quickLoginVisibility.wiring.test.ts`
- `tests/unit/ui/masterDataSeed.wiring.test.tsx`
- `tests/unit/ui/monitoringNavigation.wiring.test.ts`
- `tests/unit/ui/monitoringPage.configDraft.wiring.test.ts`
- `tests/unit/ui/noteTemplates.cardColorPrint.wiring.test.tsx`
- `tests/unit/ui/noteTemplatesPage.versioning.test.tsx`
- `tests/unit/ui/notesSection.cardColorPrint.wiring.test.tsx`
- `tests/unit/ui/plusActionButton.ui.test.tsx`
- `tests/unit/ui/plusActionButton.wiring.usages.test.ts`
- `tests/unit/ui/productManagementPage.categoryImport.wiring.test.tsx`
- `tests/unit/ui/productManagementPage.filters.wiring.test.tsx`
- `tests/unit/ui/reportsPage.wiring.test.tsx`
- `tests/unit/ui/settingsPage.backup.wiring.test.ts`
- `tests/unit/ui/settingsPage.helpTextPreviewSize.wiring.test.ts`
- `tests/unit/ui/settingsPage.twoFactor.wiring.test.ts`
- `tests/unit/ui/sidebar.backupDisabled.wiring.test.ts`
- `tests/unit/ui/tagBadge.ui.test.tsx`
- `tests/unit/ui/tagManagementPage.systemTagProtection.wiring.test.ts`
- `tests/unit/ui/tagPickerPanel.wiring.test.tsx`
- `tests/unit/ui/toaster.toastDesktopPosition.wiring.test.ts`

Problem:

- Source-Assertions statt Verhalten

Schwächetyp:

- Source-Test

Warum fachlich oder methodisch schwach:

- in vielen Faellen wird nur nach Texten, Props oder Strukturmerkmalen im Quelltext gesucht
- diese Tests koennen regressionsanfällig sein und sagen fachlich nur begrenzt etwas aus

Empfohlene Behandlung:

- gesondert pruefen, dann ueberwiegend ersetzen

Prioritaet:

- mittel

### 2.6 Tour-, Team- und Dialog-nahe UI-Strukturtests

Betroffener Bereich:

- `tests/unit/ui/teamManagement.versioning.test.tsx`
- `tests/unit/ui/tourEditDialog.appointmentsPanel.wiring.test.tsx`
- `tests/unit/ui/tourEmployeeCascadeDialog.dateRangeFilter.wiring.test.tsx`
- `tests/unit/ui/tourEmployeeCascadeDialog.wiring.test.tsx`
- `tests/unit/ui/tourManagement.role-readonly.wiring.test.tsx`
- `tests/unit/ui/tourManagement.versioning.test.tsx`

Problem:

- Source- und Strukturpruefungen in fachlich sichtbaren Tour-/Team-Flows

Schwächetyp:

- Source-Test

Warum fachlich oder methodisch schwach:

- gruenes Ergebnis bedeutet oft nur, dass bestimmte Strings, Props oder Test-IDs im Code stehen
- echte Nutzerinteraktion oder API-Folgen werden nicht nachgewiesen

Empfohlene Behandlung:

- ersetzen

Prioritaet:

- mittel

### 2.7 Nicht-UI-Source-Tests und methodisch schwache Sonderfaelle

Betroffener Bereich:

- `tests/integration/extraction/documentTextExtractor.fixture.test.ts`
- `tests/unit/hooks/useListFilters.paging.test.ts`
- `tests/unit/invariants/resetAbsoluteStateSqlGuard.test.ts`
- `tests/unit/repositories/projectsRepository.orderNumberConflict.wiring.test.ts`

Problem:

- auch ausserhalb von UI existieren Source-Assertions

Schwächetyp:

- Source-Test

Warum fachlich oder methodisch schwach:

- Methode ist selbst dann fragil, wenn der fachliche Bereich relevant ist
- Ausnahme: bei fixturebasierten Extraktionstests kann ein Dateibezug sinnvoll sein, dort ist die Einstufung unsicherer

Empfohlene Behandlung:

- gesondert pruefen

Prioritaet:

- mittel

### 2.8 Sonstige source-coupled UI-Tests

Betroffener Bereich:

- `tests/unit/ui/documentExtractionDialog.fieldReport.wiring.test.tsx`
- `tests/unit/ui/documentExtractionDialog.ui.test.tsx`
- `tests/unit/ui/documentExtractionDropzone.ui.test.tsx`
- `tests/unit/ui/home.appointmentOverlay.wiring.test.ts`
- `tests/unit/ui/home.calendarContextual.returnContext.wiring.test.ts`
- `tests/unit/ui/home.sidebarHiddenOnFormEdit.wiring.test.ts`
- `tests/unit/ui/home.weekScrollRestore.wiring.test.ts`
- `tests/unit/ui/tableView.infoBadgePreviewOptions.test.tsx`
- `tests/unit/ui/tableView.stickyFrame.test.tsx`

Problem:

- ebenfalls Source-Assertions, aber fachlich als Sammelrest heterogener

Schwächetyp:

- Source-Test

Warum fachlich oder methodisch schwach:

- Aussagekraft ueber echtes Verhalten ist begrenzt

Empfohlene Behandlung:

- gesondert pruefen

Prioritaet:

- mittel

### 2.9 Gruen laufende Tests mit fachlich heikler Ist-Festschreibung

- `tests/unit/ft04/TourTests.test.ts`
  - Problem: dokumentiert aktuellen Contract-Ist-Zustand
  - Schwächetyp: dokumentierter Ist-Zustand statt klares Soll
  - Warum schwach: gruen kann fachlich falsches Verhalten konservieren
  - Behandlung: gesondert pruefen
  - Prioritaet: mittel

- `tests/integration/server/ft11.team-management.integration.test.ts`
  - Problem: dokumentiert permissives Rollenverhalten ohne serverseitige 403-Grenzen
  - Schwächetyp: dokumentierter Ist-Zustand statt klares Soll
  - Warum schwach: potenziell fachlich falscher Zustand wird regressionssicher gemacht
  - Behandlung: gesondert pruefen
  - Prioritaet: hoch

- `tests/integration/server/projects.detail.aggregate-contract.integration.test.ts`
  - Problem: Kommentar-Drift und unklare Soll-Aussage
  - Schwächetyp: fragile Aussagekraft
  - Warum schwach: Testbeschreibung und tatsächlicher Status laufen auseinander
  - Behandlung: gesondert pruefen
  - Prioritaet: mittel

### 2.10 Formale Wartungsprobleme

Betroffener Bereich:

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

Problem:

- fehlender `Test Scope`-Kommentar

Schwächetyp:

- formale Governance-Schwaeche

Warum fachlich oder methodisch schwach:

- nicht automatisch inhaltlich schlecht, aber schlechter wartbar, weniger rueckverfolgbar und repo-seitig inkonsistent

Empfohlene Behandlung:

- behalten, spaeter formal nachziehen

Prioritaet:

- niedrig

### 2.11 Bereiche mit sichtbarer fachlicher Luecke statt schwachem Einzeltest

Betroffene Bereiche:

- FT12 Dispositionsuebersicht
- FT14 Benutzer- und Rollenverwaltung als direkt rueckverfolgbare Feature-Abdeckung
- FT22 Kartenansicht / Maps
- `employeeAvailability*`
- `employeeAbsences*`
- `bulkImportService`
- `helpTexts*`

Problem:

- keine oder zu duenne sinnvolle Verhaltenspruefung

Schwächetyp:

- Luecke statt schlechter Einzeltest

Warum fachlich oder methodisch schwach:

- hier fehlt nicht nur Testqualitaet, sondern teils sinnvolle fachliche Absicherung insgesamt

Empfohlene Behandlung:

- gesondert pruefen, spaeter gezielt neue Verhaltenspruefungen aufbauen

Prioritaet:

- hoch

---

## 3. Arbeitsgruppen fuer die Nachbearbeitung

### Gruppe A: Availability / Absences / Kollisionen

- Warum diese Tests zusammengehoeren:
  - gemeinsame fachliche Domäne
  - gleichzeitig deaktivierte Unit-, Integration- und Browser-Tests
  - hoechstes fachliches Risiko
- Testebene:
  - Unit, Integration, E2E Browser
- Fachliches Risiko:
  - hoch
- Schadenspotential bei falscher gruerner Lage:
  - sehr hoch
- Bearbeitungsempfehlung:
  - zuerst reaktivierbar vs. veraltet trennen
  - dann echte Verhaltenspruefungen statt Source-Wiring priorisieren
- Empfohlene Reihenfolge:
  - 1

### Gruppe B: Terminformulare und Dialogverhalten

- Warum diese Tests zusammengehoeren:
  - gemeinsamer Nutzungsfluss rund um Termine, Dialoge und Formularaktionen
  - viele source-coupled Gruenlaeufer mit geringer Aussagekraft
- Testebene:
  - vor allem Unit, spaeter teilweise Browser
- Fachliches Risiko:
  - hoch
- Schadenspotential:
  - hoch
- Bearbeitungsempfehlung:
  - von Quelltextpruefung auf Render-/Interaktionsverhalten umstellen
- Empfohlene Reihenfolge:
  - 2

### Gruppe C: Kalender, Drag-and-drop und sichtbares Terminverhalten

- Warum diese Tests zusammengehoeren:
  - gemeinsamer Interaktions- und Darstellungsbereich im Kalender
  - viele strukturelle Tests ohne echte Nutzeraktion
- Testebene:
  - Unit, Integration, E2E Browser
- Fachliches Risiko:
  - hoch
- Schadenspotential:
  - hoch
- Bearbeitungsempfehlung:
  - erst kritische Flows wie Drag-and-drop, Preview, Collapse, Scroll, Header-Zustand
- Empfohlene Reihenfolge:
  - 3

### Gruppe D: Kunden-, Mitarbeiter-, Projekt- und Entity-Formulare

- Warum diese Tests zusammengehoeren:
  - aehnliche Form- und Seitenlogik
  - gemeinsames Muster schwacher Source-Wiring-Tests
- Testebene:
  - vor allem Unit, spaeter gezielte Integration
- Fachliches Risiko:
  - mittel bis hoch
- Schadenspotential:
  - mittel
- Bearbeitungsempfehlung:
  - je Formularfamilie kleine Verhaltenspruefungen statt grosse Komplettumbauten
- Empfohlene Reihenfolge:
  - 4

### Gruppe E: Rollen, Rechte und fachlich falsche gruen laufende Lage

- Warum diese Tests zusammengehoeren:
  - hier droht nicht nur schwache Methodik, sondern potenziell fachlich falsches Soll
- Testebene:
  - Unit und Integration
- Fachliches Risiko:
  - hoch
- Schadenspotential:
  - sehr hoch
- Bearbeitungsempfehlung:
  - zuerst fachliches Soll klaeren, dann Tests an Soll statt Ist ausrichten
- Empfohlene Reihenfolge:
  - 5

### Gruppe F: Notes, Help, Settings, Stammdaten und sonstige schwache UI-Strukturtests

- Warum diese Tests zusammengehoeren:
  - inhaltlich heterogen, methodisch aber sehr aehnlich
  - meist kein hoechstes Domänenrisiko, gut fuer spaetere gebuendelte Nacharbeit
- Testebene:
  - ueberwiegend Unit
- Fachliches Risiko:
  - mittel
- Schadenspotential:
  - mittel
- Bearbeitungsempfehlung:
  - in kleinen Themenpaketen ersetzen oder konsolidieren
- Empfohlene Reihenfolge:
  - 6

### Gruppe G: Tour- und Team-nahe Strukturtests

- Warum diese Tests zusammengehoeren:
  - kleine, klar abgrenzbare UI-Untergruppe um FT04/FT06/FT07
- Testebene:
  - Unit
- Fachliches Risiko:
  - mittel
- Schadenspotential:
  - mittel
- Bearbeitungsempfehlung:
  - als kompaktes Spaeter-Paket sinnvoll
- Empfohlene Reihenfolge:
  - 7

### Gruppe H: Meta-Hygiene und Wartbarkeit

- Warum diese Tests zusammengehoeren:
  - Querschnittsprobleme ohne direkten grossen Fachschaden
  - gut separat aufraeumbar
- Testebene:
  - quer ueber alle Ebenen
- Fachliches Risiko:
  - niedrig bis mittel
- Schadenspotential:
  - niedrig bis mittel
- Bearbeitungsempfehlung:
  - nachziehen, sobald inhaltliche Kernrisiken angegangen wurden
- Empfohlene Reihenfolge:
  - 8

### Gruppe I: Bereiche mit fehlender sinnvoller Verhaltenspruefung

- Warum diese Tests zusammengehoeren:
  - hier fehlen eher gute Tests, als dass schlechte einzelne Dateien dominant waeren
- Testebene:
  - zunaechst Analyse, spaeter gezielte neue Tests
- Fachliches Risiko:
  - hoch
- Schadenspotential:
  - hoch
- Bearbeitungsempfehlung:
  - nach Stabilisierung der kritischen Schwachgruppen gezielt neu aufbauen
- Empfohlene Reihenfolge:
  - parallel vorbereiten, aber inhaltlich nach Gruppe A und E

---

## 4. Vorschlag fuer die erste Bearbeitungswelle

Als erste Bearbeitungswelle sollte Gruppe A angegangen werden:

- `Availability / Absences / Kollisionen`

Begruendung:

- hoechstes fachliches Risiko
- deaktivierte Tests ueber mehrere Ebenen
- besonders hohes Schadenspotential bei falscher gruerner Lage
- gleichzeitig sichtbare Coverage-Luecke und reale Use-Case-Luecke

Realistisch zuerst erreichbare Verbesserung:

- deaktivierte Tests in reaktivierbar vs. veraltet sortieren
- pro kritischem Flow 1 bis 2 echte Verhaltenspruefungen definieren
- Source-Wiring-Tests nicht einfach nur entskippen, sondern in aussagekraeftigere Tests ueberfuehren

---

## 5. Offene Punkte

- Nicht jeder `readFileSync`-Test ist automatisch wertlos. Einige koennen als billige Verdrahtungs-Sentinels bewusst behalten werden. Diese Inventur stuft sie streng ein, um den Nacharbeitsbedarf sichtbar zu machen.
- `tests/integration/server/projects.detail.aggregate-contract.integration.test.ts` ist eher ein Fall von Kommentar-Drift als klar methodisch kaputtem Test. Die Einordnung bleibt vorlaeufig mittel.
- FT12, FT14 und FT22 sind als Bereichsluecken klar, aber fuer konkrete Reparaturpakete noch nicht fein genug zerschnitten.
- Die 178 nicht markierten Dateien gelten hier nicht automatisch als fachlich stark; sie fielen nur in dieser Erstsichtung nicht durch die verwendeten Heuristiken auf.

---

## Anhang A: Vollstaendig gesichtete Testdateien

Alle 329 Testdateien wurden in die Sichtung einbezogen. Nicht alle werden in der Inventarliste einzeln aufgefuehrt, wenn in der Erstsichtung kein klares Warnsignal sichtbar war.

## Anhang B: Vollstaendige Liste deaktivierter Testdateien

- `tests/e2e-browser/availability-check-appointment-form.browser.e2e.spec.ts`
- `tests/e2e-browser/calendar-drag-drop.validation-message.browser.e2e.spec.ts`
- `tests/e2e-browser/employee-absences.ft30.browser.e2e.spec.ts`
- `tests/e2e-browser/employee-absences.navigation.browser.e2e.spec.ts`
- `tests/integration/server/appointments.availability.ft30-ft01.integration.test.ts`
- `tests/integration/server/appointments.dragdrop.availability.integration.test.ts`
- `tests/integration/server/demoSeed.appointments.constraints.integration.test.ts`
- `tests/integration/server/employeeAbsences.ft30.integration.test.ts`
- `tests/unit/services/employeeAbsencesService.bulk.unit.test.ts`
- `tests/unit/services/employeeAbsencesService.ft30.test.ts`
- `tests/unit/services/employeeAvailabilityService.test.ts`
- `tests/unit/ui/appointmentForm.availability-feedback.wiring.test.ts`
- `tests/unit/ui/calendarDragDrop.validationMessage.wiring.test.tsx`
- `tests/unit/ui/employeeAbsencesNavigation.wiring.test.ts`
- `tests/unit/ui/employeeAbsencesPanel.preview.wiring.test.ts`
- `tests/unit/ui/employeeAbsencesPanel.wiring.test.ts`
- `tests/unit/ui/employeeForm.absencesTab.wiring.test.ts`
- `tests/unit/ui/employeePickerDialogList.availability.wiring.test.tsx`
- `tests/unit/validation/employeeAbsences.dto.validation.ft30.test.ts`

## Anhang C: Vollstaendige Liste fehlender `Test Scope`-Kommentare

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

## Anhang D: Vollstaendige Liste source-coupled Nicht-UI-Tests

- `tests/integration/extraction/documentTextExtractor.fixture.test.ts`
- `tests/unit/hooks/useListFilters.paging.test.ts`
- `tests/unit/invariants/resetAbsoluteStateSqlGuard.test.ts`
- `tests/unit/repositories/projectsRepository.orderNumberConflict.wiring.test.ts`

