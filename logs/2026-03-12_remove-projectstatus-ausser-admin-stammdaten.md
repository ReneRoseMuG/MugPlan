# Projektstatus nur noch im Admin-Stammdatenbereich

## Zweck

Projektstatus aus allen Nicht-Admin-Kontexten entfernen und den Katalog auf den Admin-Stammdatenbereich begrenzen. Dazu gehoeren oeffentliche Projekt-/Termin-/Kalender-Projektionen, Projektfilter, Projektformulare, Demo-/Seed-Kontexte sowie obsolete Status-UI und zugehoerige Tests.

## Scope

- Projektstatus-Filter und Projektstatus-Anzeige aus Projektlisten, Projektkarten, Projekt-Detaildarstellungen, Terminformularen und Kalender-Wochenkarten entfernt
- Projektstatus-Relation-Endpunkte und deren Registrierung entfernt
- serverseitige Projekt-/Termin-/Kalender-Antworten ohne `projectStatuses` vereinheitlicht
- Projektlisten-Contracts ohne `statusIds`
- Projektstatus-Seed aus MasterData-Seed und Demo-Seed entfernt
- Demo-Seed-Contracts und Demo-UI ohne Projektstatus-Konfiguration bzw. -Analyse
- veraltete Unit-, Integration- und Browser-Tests entfernt oder auf das neue Verhalten umgestellt
- Testdokumentation und UI-/Implementierungsdoku bereinigt

Nicht Ziel in diesem Schritt:

- Datenbank-Migration oder physische Entfernung der Tabellen
- Aenderung des verbleibenden Admin-CRUD fuer den Projektstatus-Katalog

## Technische Entscheidungen

- Kein Architekturwechsel: bestehende Schichten Route -> Controller -> Service -> Repository bleiben erhalten.
- Projektstatus bleibt fachlich nur als Admin-Stammdaten-Katalog erreichbar; Nicht-Admin-Lesezugriffe auf `/api/project-status` werden serverseitig verboten.
- Bereits bestehende interne Bereinigung bei Projektloeschung fuer Relationstabellen bleibt bestehen, obwohl die Relationen ausserhalb des Admin-Kontexts nicht mehr nutzbar sind.
- Demo-Seed und dateibasierte Seed-Services zaehlen nicht als erlaubter Admin-Stammdatenbereich und wurden daher ebenfalls vom Projektstatus befreit.
- Testbereinigung erfolgte minimal-invasiv: nur veraltete Statusannahmen entfernt, verbleibende Assertions auf das neue tagbasierte bzw. statusfreie Verhalten angepasst.

## Betroffene Dateien

Wesentliche entfernte Dateien:

- `server/routes/projectStatusRelationsRoutes.ts`
- `server/controllers/projectStatusRelationsController.ts`
- `server/services/seedProjectStatusService.ts`
- `client/src/components/ProjectStatusPanel.tsx`
- `client/src/components/calendar/CalendarWeekProjectStatusSection.tsx`
- `client/src/components/filters/project-status-filter-input.tsx`
- `client/src/components/ui/project-status-info-badge.tsx`
- `client/src/components/ui/project-status-picker-dialog.tsx`

Wesentliche geaenderte Dateien:

- `shared/routes.ts`
- `server/routes.ts`
- `server/routes/masterDataRoutes.ts`
- `server/controllers/masterDataController.ts`
- `server/controllers/projectsController.ts`
- `server/services/projectStatusService.ts`
- `server/services/projectsService.ts`
- `server/services/appointmentsService.ts`
- `server/services/demoSeedService.ts`
- `server/repositories/projectsRepository.ts`
- `client/src/components/ProjectsPage.tsx`
- `client/src/components/ProjectForm.tsx`
- `client/src/components/AppointmentForm.tsx`
- `client/src/components/LinkedProjectCard.tsx`
- `client/src/components/DemoDataPage.tsx`
- `client/src/components/MasterDataSeedPage.tsx`
- `client/src/components/ui/project-detail-card.tsx`
- `client/src/components/ui/filter-panels/project-filter-panel.tsx`
- `client/src/lib/project-filters.ts`
- `client/src/lib/calendar-appointments.ts`
- `docs/implementation.md`
- `docs/UI-Komponenten-Referenz.md`
- `docs/TEST_MATRIX.md`

Wesentliche Testdateien mit Bereinigung:

- `tests/integration/server/projectStatus.visibility.by-role.test.ts`
- `tests/integration/server/projects.paged-list.integration.test.ts`
- `tests/integration/server/projects.scope.mengenlogik.integration.test.ts`
- `tests/integration/server/projects.detail.aggregate-contract.integration.test.ts`
- `tests/integration/server/ft02.full-uc-coverage.integration.test.ts`
- `tests/integration/server/demoSeed.appointments.constraints.integration.test.ts`
- `tests/integration/server/masterData.seed-files.integration.test.ts`
- `tests/e2e-browser/projects.ft02.browser.e2e.spec.ts`
- `tests/unit/services/masterDataSeedServices.test.ts`
- `tests/unit/ui/projectForm.customerRelationSlot.test.tsx`
- `tests/unit/ui/projectsPage.currentAppointmentsCounter.wiring.test.tsx`
- `tests/unit/ui/projectsPage.orderNumberWiring.test.tsx`
- `tests/unit/ui/projectsTable.preview.test.tsx`

## Hinweise zum Testen

Vor den Testlaeufen geprueft:

- `../../shared/.env.test` vorhanden
- Testmodus ueber `npm run test:unit` mit `NODE_ENV=test` und `MUGPLAN_MODE=test`

Ausgefuehrt:

- `npx tsc --noEmit`
- `npm run test:unit -- tests/unit/authorization/projectStatusAuthorization.test.ts tests/unit/ui/masterDataSeed.wiring.test.tsx tests/unit/ui/projectFilterPanel.layout.wiring.test.tsx tests/unit/ui/projectStatusPage.actions.test.tsx`
- `npm run test:unit -- tests/unit/ui/projectForm.customerRelationSlot.test.tsx tests/unit/ui/projectsPage.currentAppointmentsCounter.wiring.test.tsx tests/unit/ui/projectsPage.orderNumberWiring.test.tsx tests/unit/ui/projectsTable.preview.test.tsx`

Ergebnis:

- TypeScript-Compile erfolgreich
- erster gezielter Lauf: 4/4 Dateien, 13/13 Tests gruen
- zweiter gezielter Lauf nach Testbereinigung: 4/4 Dateien, 11/11 Tests gruen

## Bekannte Einschraenkungen

- Es wurde kein voller Testlauf ueber alle Testebenen ausgefuehrt.
- Im Arbeitsbaum existierte zusaetzlich eine geaenderte `docs/Alle Features.pdf`; sie wurde nicht inhaltlich bewertet, aber bleibt Teil des offenen Stands.
