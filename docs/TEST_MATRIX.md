# TEST_MATRIX

Zentrale Übersicht aller Testdateien mit fachlicher Kurzbeschreibung.

| Test-Datei | Feature | Bereich | Zweck | Status |
|------------|---------|---------|-------|--------|
| [tests/integration/batch/batchRollback.test.ts](../tests/integration/batch/batchRollback.test.ts) | TBD | Integration | Rollback-Verhalten in Batch-Prozessen absichern | Bestand |
| [tests/integration/bootstrap/ensureSystemRoles.test.ts](../tests/integration/bootstrap/ensureSystemRoles.test.ts) | TBD | Integration | Systemrollen beim Bootstrap korrekt sicherstellen | Bestand |
| [tests/integration/extraction/documentTextExtractor.fixture.test.ts](../tests/integration/extraction/documentTextExtractor.fixture.test.ts) | TBD | Integration | Fixture-basierte Prüfung der Textextraktion | Bestand |
| [tests/integration/extraction/documentExtraction.livePipeline.fixture.test.ts](../tests/integration/extraction/documentExtraction.livePipeline.fixture.test.ts) | FT20 | Integration | Live-KI-Servicepipeline fuer project_form und appointment_form mit Fixture-PDF absichern | Neu |
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
| [tests/unit/invariants/optimisticLocking.test.ts](../tests/unit/invariants/optimisticLocking.test.ts) | TBD | Unit | Optimistic-Locking-Verhalten und Konflikte absichern | Bestand |
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
| [tests/unit/ui/appointmentForm.relationSlots.test.tsx](../tests/unit/ui/appointmentForm.relationSlots.test.tsx) | FT01 | Unit | Slot-Verdrahtung fuer Termin-Projekt/Kunde inkl. Lock-Readonly-Regel absichern | Neu |
| [tests/unit/ui/projectForm.statusRelationsLocking.test.tsx](../tests/unit/ui/projectForm.statusRelationsLocking.test.tsx) | FT15 | Unit | Relations-Verdrahtung fuer expectedVersion und relationVersion im Projektformular absichern | Neu |
| [tests/unit/ui/projectForm.documentExtractionFlow.test.tsx](../tests/unit/ui/projectForm.documentExtractionFlow.test.tsx) | FT20 | Unit | Verdrahtung des Projektformular-Extraktionsflusses inkl. Upload/Dialog/Apply absichern | Neu |
| [tests/unit/ui/appointmentForm.documentExtractionFlow.test.tsx](../tests/unit/ui/appointmentForm.documentExtractionFlow.test.tsx) | FT20 | Unit | Verdrahtung des Terminformular-Extraktionsflusses inkl. Disable-Regeln absichern | Neu |
| [tests/unit/ui/projectsTable.preview.test.tsx](../tests/unit/ui/projectsTable.preview.test.tsx) | TBD | Unit | Standardisierte Weekly-Preview-Verdrahtung in der Projekte-Tabelle absichern | Neu |
| [tests/unit/ui/tableView.stickyHeader.test.tsx](../tests/unit/ui/tableView.stickyHeader.test.tsx) | TBD | Unit | Sticky-Header-Verhalten der TableView absichern | Bestand |
| [tests/unit/validation/dtoValidators.test.ts](../tests/unit/validation/dtoValidators.test.ts) | TBD | Unit | DTO-Validierungsregeln und Fehlerfälle prüfen | Bestand |
| [tests/unit/validation/extractionValidator.structure.test.ts](../tests/unit/validation/extractionValidator.structure.test.ts) | FT20 | Unit | Strukturvalidierung, Normalisierung, Kategorisierung und HTML-Escaping der KI-Ausgabe absichern | Neu |
| [tests/unit/services/documentProcessing.customerResolution.test.ts](../tests/unit/services/documentProcessing.customerResolution.test.ts) | FT20 | Unit | Kundennummer-Aufloesung none/single/multiple und Duplicate-Logik absichern | Neu |
| [tests/integration/server/documentExtraction.routes.test.ts](../tests/integration/server/documentExtraction.routes.test.ts) | FT20 | Integration | API-Fehlermatrix sowie Duplicate/Resolve-Routen fuer Dokumentextraktion deterministisch absichern | Neu |
| [tests/integration/server/documentExtraction.routes.liveAi.test.ts](../tests/integration/server/documentExtraction.routes.liveAi.test.ts) | FT20 | Integration | Pflicht-Live-KI-Routentest der Extract-API im Standardlauf absichern | Neu |
| [tests/integration/server/projectStatus.lifecycle.test.ts](../tests/integration/server/projectStatus.lifecycle.test.ts) | FT15 | Integration | Lifecycle-Regeln fuer Update/Toggle/Delete und Loeschschutz verifizieren | Neu |
| [tests/integration/server/projectStatus.relations.test.ts](../tests/integration/server/projectStatus.relations.test.ts) | FT15 | Integration | Zuordnungsregeln inkl. expectedVersion/relationVersion und VERSION_CONFLICT fuer Add/Delete absichern | Neu |
