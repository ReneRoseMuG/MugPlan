# TEST_MATRIX

Zentrale Übersicht aller Testdateien mit fachlicher Kurzbeschreibung.

| Test-Datei | Feature | Bereich | Zweck | Status |
|------------|---------|---------|-------|--------|
| [tests/integration/batch/batchRollback.test.ts](../tests/integration/batch/batchRollback.test.ts) | TBD | Integration | Rollback-Verhalten in Batch-Prozessen absichern | Bestand |
| [tests/integration/bootstrap/ensureSystemRoles.test.ts](../tests/integration/bootstrap/ensureSystemRoles.test.ts) | TBD | Integration | Systemrollen beim Bootstrap korrekt sicherstellen | Bestand |
| [tests/integration/extraction/documentTextExtractor.fixture.test.ts](../tests/integration/extraction/documentTextExtractor.fixture.test.ts) | TBD | Integration | Fixture-basierte Prüfung der Textextraktion | Bestand |
| [tests/integration/extraction/documentExtraction.livePipeline.fixture.test.ts](../tests/integration/extraction/documentExtraction.livePipeline.fixture.test.ts) | FT20 | Integration | Live-KI-Servicepipeline fuer project_form und appointment_form mit Fixture-PDF und angepasstem Langlauf-Timeout absichern | Erweitert |
| [tests/integration/joins/joinReplaceAtomicity.test.ts](../tests/integration/joins/joinReplaceAtomicity.test.ts) | TBD | Integration | Atomare Ersetzung von Join-Daten validieren | Bestand |
| [tests/integration/seed/demoSeed.base.core.test.ts](../tests/integration/seed/demoSeed.base.core.test.ts) | TBD | Integration | Kernkonsistenz des Demo-Seeds absichern | Bestand |
| [tests/unit/auth/loginIdentifier.test.ts](../tests/unit/auth/loginIdentifier.test.ts) | TBD | Unit | Regeln zur Login-Identifier-Auflösung prüfen | Bestand |
| [tests/unit/auth/passwordHash.test.ts](../tests/unit/auth/passwordHash.test.ts) | TBD | Unit | Passwort-Hashing und Verifikation prüfen | Bestand |
| [tests/unit/authorization/roleGuards.test.ts](../tests/unit/authorization/roleGuards.test.ts) | TBD | Unit | Rollenbasierte Zugriffsschutz-Guards validieren | Bestand |
| [tests/unit/authorization/projectStatusAuthorization.test.ts](../tests/unit/authorization/projectStatusAuthorization.test.ts) | FT15 | Unit | Rollenregeln fuer Projektstatus-Stammdaten und Zuordnungen absichern | Neu |
| [tests/unit/authorization/userCreate.test.ts](../tests/unit/authorization/userCreate.test.ts) | TBD | Unit | Berechtigungsregeln bei User-Erstellung prüfen | Bestand |
| [tests/unit/extraction/documentTextExtractor.test.ts](../tests/unit/extraction/documentTextExtractor.test.ts) | TBD | Unit | Kernlogik der Dokument-Textextraktion testen | Bestand |
| [tests/unit/invariants/attachmentRules.test.ts](../tests/unit/invariants/attachmentRules.test.ts) | TBD | Unit | Invarianten für Attachment-Regeln absichern | Bestand |
| [tests/unit/invariants/conflictPriority.test.ts](../tests/unit/invariants/conflictPriority.test.ts) | TBD | Unit | Priorisierungslogik bei Konflikten prüfen | Bestand |
| [tests/unit/invariants/lockingRules.test.ts](../tests/unit/invariants/lockingRules.test.ts) | TBD | Unit | Locking-Regeln und Sperrlogik validieren | Bestand |
| [tests/unit/invariants/optimisticLocking.test.ts](../tests/unit/invariants/optimisticLocking.test.ts) | FT02 | Unit | Optimistic-Locking und Konfliktcodes inkl. VERSION_CONFLICT/BUSINESS_CONFLICT bei Projekt-Loeschen absichern | Erweitert |
| [tests/unit/invariants/projectStatusAssignmentRules.test.ts](../tests/unit/invariants/projectStatusAssignmentRules.test.ts) | FT15 | Unit | Invarianten fuer aktive/inaktive Status-Zuordnung und Remove-Regeln pruefen | Neu |
| [tests/unit/invariants/resetDatabaseGuard.test.ts](../tests/unit/invariants/resetDatabaseGuard.test.ts) | TBD | Unit | Schutzregeln für Datenbank-Reset prüfen | Bestand |
| [tests/unit/lib/projectNameFormat.test.ts](../tests/unit/lib/projectNameFormat.test.ts) | FT02 | Unit | Format-/Parse-Regeln fuer Projektnamen mit Kundennummer-Praefix absichern | Neu |
| [tests/unit/seed/demoDataFiller.format.test.ts](../tests/unit/seed/demoDataFiller.format.test.ts) | TBD | Unit | Formatregeln des Demo-Data-Fillers prüfen | Bestand |
| [tests/unit/seed/demoSeedAssignments.test.ts](../tests/unit/seed/demoSeedAssignments.test.ts) | TBD | Unit | Zuweisungslogik im Demo-Seed absichern | Bestand |
| [tests/unit/settings/settingsProvider.versioning.test.tsx](../tests/unit/settings/settingsProvider.versioning.test.tsx) | TBD | Unit | Versionierungslogik im Settings-Provider prüfen | Bestand |
| [tests/unit/settings/userSettingsResolvedMapping.test.ts](../tests/unit/settings/userSettingsResolvedMapping.test.ts) | TBD | Unit | Aufgelöstes Mapping von User-Settings inkl. Hover-Delay-Setting validieren | Erweitert |
| [tests/unit/ui/appointmentWeeklyPanelPreview.width.test.tsx](../tests/unit/ui/appointmentWeeklyPanelPreview.width.test.tsx) | TBD | Unit | Fallback- und Messwertlogik der Weekly-Preview-Breite prüfen | Neu |
| [tests/unit/ui/hoverPreview.delaySetting.test.tsx](../tests/unit/ui/hoverPreview.delaySetting.test.tsx) | TBD | Unit | Priorität und Fallback der globalen Hover-Delay-Steuerung absichern | Neu |
| [tests/unit/ui/projectStatusPage.actions.test.tsx](../tests/unit/ui/projectStatusPage.actions.test.tsx) | FT15 | Unit | Admin-Aktionen fuer Toggle/Delete und Versionierungsverdrahtung absichern | Neu |
| [tests/unit/ui/relationSlot.actions.test.tsx](../tests/unit/ui/relationSlot.actions.test.tsx) | FT01/FT02 | Unit | Slot-Zustaende und Action-Sichtbarkeit fuer active/empty/readonly absichern | Neu |
| [tests/unit/ui/projectForm.customerRelationSlot.test.tsx](../tests/unit/ui/projectForm.customerRelationSlot.test.tsx) | FT02 | Unit | Verdrahtung der Projekt-Kunde Relation ueber den neuen Slot inkl. Pflichtvalidierung absichern | Neu |
| [tests/unit/ui/appointmentForm.relationSlots.test.tsx](../tests/unit/ui/appointmentForm.relationSlots.test.tsx) | FT01 | Unit | Slot-Verdrahtung fuer Termin-Projekt/Kunde inkl. Lock-Readonly-Regel, scope=all-Projektdatenquelle und Tour-Badge-Sichtbarkeit absichern | Erweitert |
| [tests/unit/ui/appointmentPreviews.orderNumberWiring.test.tsx](../tests/unit/ui/appointmentPreviews.orderNumberWiring.test.tsx) | FT02 | Unit | Verdrahtung der Auftragsnummer in Weekly- und Fallback-Termin-Previews absichern | Neu |
| [tests/unit/ui/appointmentForm.saveAndEmployeesPanelWiring.test.tsx](../tests/unit/ui/appointmentForm.saveAndEmployeesPanelWiring.test.tsx) | FT01/FT04 | Unit | Versionpflicht fuer PATCH sowie robuster Delete-Flow mit frischer Version/Retry und Mitarbeiter-Header-Action (+) absichern | Erweitert |
| [tests/unit/ui/projectAppointmentsPanel.deleteWiring.test.tsx](../tests/unit/ui/projectAppointmentsPanel.deleteWiring.test.tsx) | FT04 | Unit | Loeschverdrahtung im Projekttermine-Panel mit Versionspayload und Konfliktcode-Mapping absichern | Neu |
| [tests/unit/ui/projectForm.statusRelationsLocking.test.tsx](../tests/unit/ui/projectForm.statusRelationsLocking.test.tsx) | FT15 | Unit | Relations-Verdrahtung fuer expectedVersion und relationVersion im Projektformular absichern | Neu |
| [tests/unit/ui/projectForm.documentExtractionFlow.test.tsx](../tests/unit/ui/projectForm.documentExtractionFlow.test.tsx) | FT20 | Unit | Verdrahtung des Projektformular-Extraktionsflusses inkl. Upload/Dialog/Apply absichern | Neu |
| [tests/unit/ui/projectForm.deleteWiring.test.tsx](../tests/unit/ui/projectForm.deleteWiring.test.tsx) | FT02 | Unit | Verdrahtung des Projekt-Loeschflows im Formular inkl. Konfliktcode-Mapping absichern | Neu |
| [tests/unit/ui/appointmentForm.documentExtractionFlow.test.tsx](../tests/unit/ui/appointmentForm.documentExtractionFlow.test.tsx) | FT20 | Unit | Verdrahtung des Terminformular-Extraktionsflusses inkl. Disable-Regeln absichern | Neu |
| [tests/unit/ui/customerData.versioning.test.tsx](../tests/unit/ui/customerData.versioning.test.tsx) | FT05+ | Unit | CustomerData-Update mit Version, Admin-Statussteuerung und Konflikt-/Forbidden-Mapping absichern | Neu |
| [tests/unit/ui/employeesPage.versioning.test.tsx](../tests/unit/ui/employeesPage.versioning.test.tsx) | FT05+ | Unit | EmployeesPage-Update/Toggle mit Version und codebasiertem Konflikt-/Forbidden-Mapping absichern | Neu |
| [tests/unit/ui/employeesPage.scopeUx.test.tsx](../tests/unit/ui/employeesPage.scopeUx.test.tsx) | FT05+ | Unit | Admin-only Inaktive-Switch und Entfernung des alten Mitarbeiter-Scopes absichern | Neu |
| [tests/unit/ui/customersPage.scopeUx.test.tsx](../tests/unit/ui/customersPage.scopeUx.test.tsx) | FT05+ | Unit | Admin-only Inaktive-Switch und Scope-Abfrage active/inactive in der Kundenliste absichern | Neu |
| [tests/unit/ui/projectsTable.preview.test.tsx](../tests/unit/ui/projectsTable.preview.test.tsx) | TBD | Unit | Standardisierte Weekly-Preview-Verdrahtung in der Projekte-Tabelle absichern | Neu |
| [tests/unit/ui/projectDetailCard.orderNumber.test.tsx](../tests/unit/ui/projectDetailCard.orderNumber.test.tsx) | FT02 | Unit | Anzeige der Auftragsnummer im Projekt-Detailslot des Terminformulars absichern | Neu |
| [tests/unit/ui/projectsPage.orderNumberWiring.test.tsx](../tests/unit/ui/projectsPage.orderNumberWiring.test.tsx) | FT02 | Unit | Verdrahtung und Sichtbarkeit der Auftragsnummer in Projekt-Filter sowie Board/Tabelle absichern | Neu |
| [tests/unit/ui/tableView.stickyHeader.test.tsx](../tests/unit/ui/tableView.stickyHeader.test.tsx) | TBD | Unit | Sticky-Header-Verhalten der TableView absichern | Bestand |
| [tests/unit/lib/projectFilters.orderNumber.test.ts](../tests/unit/lib/projectFilters.orderNumber.test.ts) | FT02 | Unit | Filterlogik der optionalen Projekt-Auftragsnummer (Teiltreffer/Leerwert) absichern | Neu |
| [tests/unit/validation/dtoValidators.test.ts](../tests/unit/validation/dtoValidators.test.ts) | FT20 | Unit | DTO-Validierung sowie Fallback-Verhalten bei KI-Fehlern ohne implizite Persistenz absichern | Erweitert |
| [tests/unit/validation/extractionValidator.structure.test.ts](../tests/unit/validation/extractionValidator.structure.test.ts) | FT20 | Unit | Strukturvalidierung, Normalisierung, Kategorisierung und HTML-Escaping der KI-Ausgabe absichern | Neu |
| [tests/unit/services/documentProcessing.customerResolution.test.ts](../tests/unit/services/documentProcessing.customerResolution.test.ts) | FT20 | Unit | Kundennummer-Aufloesung none/single/multiple und Duplicate-Logik absichern | Neu |
| [tests/unit/services/extractionFallback.test.ts](../tests/unit/services/extractionFallback.test.ts) | FT20 | Unit | Preisbereinigung und robusten Produkttext-Fallback bei unvollstaendiger KI-Ausgabe absichern | Neu |
| [tests/integration/server/documentExtraction.routes.test.ts](../tests/integration/server/documentExtraction.routes.test.ts) | FT20 | Integration | API-Fehlermatrix sowie Duplicate/Resolve-Routen fuer Dokumentextraktion deterministisch absichern | Neu |
| [tests/integration/server/documentExtraction.routes.liveAi.test.ts](../tests/integration/server/documentExtraction.routes.liveAi.test.ts) | FT20 | Integration | Pflicht-Live-KI-Routentest der Extract-API mit angepasstem Langlauf-Timeout absichern | Erweitert |
| [tests/integration/server/projectStatus.lifecycle.test.ts](../tests/integration/server/projectStatus.lifecycle.test.ts) | FT15 | Integration | Lifecycle-Regeln fuer Update/Toggle/Delete und Loeschschutz verifizieren | Neu |
| [tests/integration/server/projectStatus.relations.test.ts](../tests/integration/server/projectStatus.relations.test.ts) | FT15 | Integration | Zuordnungsregeln inkl. expectedVersion/relationVersion und VERSION_CONFLICT fuer Add/Delete absichern | Neu |
| [tests/integration/server/projectAppointments.version.test.ts](../tests/integration/server/projectAppointments.version.test.ts) | FT04 | Integration | Versionsfeld im Projekttermine-Endpoint fuer Optimistic-Locking-Deletevertrag absichern | Neu |
| [tests/integration/server/projects.delete.rules.test.ts](../tests/integration/server/projects.delete.rules.test.ts) | FT02 | Integration | Projekt-Loeschen nur ohne Termine sowie BUSINESS_CONFLICT/VERSION_CONFLICT/NOT_FOUND absichern | Neu |
| [tests/integration/server/customers.visibility.by-role.test.ts](../tests/integration/server/customers.visibility.by-role.test.ts) | FT05+ | Integration | Rollenbasierte Kunden-Sichtbarkeit (active/inactive), Detailschutz und Admin-only isActive-Update absichern | Neu |
| [tests/integration/server/employees.visibility.by-role.test.ts](../tests/integration/server/employees.visibility.by-role.test.ts) | FT05+ | Integration | Rollenbasierte Mitarbeiter-Sichtbarkeit (active/inactive), Detailschutz und Admin-only toggleActive absichern | Neu |
