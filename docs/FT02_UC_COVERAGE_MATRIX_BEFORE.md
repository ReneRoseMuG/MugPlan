# FT02 UC Coverage Matrix (Before)

Source basis:
- `.ai/architecture.md`
- `.ai/rules.md`
- `docs/test-strategy.md`
- `FT (02) Projekte.pdf` (UC 02/01 - UC 02/20)
- Current code and tests in `server/`, `shared/`, `client/`, `tests/`

Legend:
- Coverage: `vollstaendig` | `teilweise` | `nicht abgedeckt`
- DB access: `direkt` = explicit DB assertion in test, `indirekt` = behavior through API/service assertions

## System mapping (FT02 relevant)

- Endpoints:
  - `GET /api/projects`
  - `GET /api/projects/:id`
  - `POST /api/projects`
  - `PATCH /api/projects/:id`
  - `DELETE /api/projects/:id`
  - `GET /api/projects/:projectId/notes`
  - `POST /api/projects/:projectId/notes`
  - `DELETE /api/projects/:projectId/notes/:noteId`
  - `GET /api/projects/:projectId/attachments`
  - `POST /api/projects/:projectId/attachments`
  - `DELETE /api/project-attachments/:id` (returns 405)
  - `GET /api/project-attachments/:id/download`
  - `GET /api/projects/:projectId/statuses`
  - `POST /api/projects/:projectId/statuses`
  - `DELETE /api/projects/:projectId/statuses/:statusId`
  - `GET /api/projects/:projectId/appointments`
  - `GET /api/calendar/appointments`
- Services:
  - `projectsService`
  - `projectNotesService`
  - `projectAttachmentsService`
  - `projectStatusService`
  - `appointmentsService` (projection dependencies)
- Repositories:
  - `projectsRepository`
  - `notesRepository`
  - `projectStatusRepository`
  - `appointmentsRepository`
- DB tables:
  - `project`
  - `customer`
  - `appointments`
  - `project_note`
  - `notes`
  - `project_attachment`
  - `project_project_status`
  - `project_status`

## UC matrix

| UC | Fachliches Ziel (1 Satz) | Betroffene Endpoints | Services | Repositories | Tabellen | Existierende Unit-Tests | Existierende Integration-Tests | Existierende E2E-Tests | Coverage | Bewertung |
|---|---|---|---|---|---|---|---|---|---|---|
| 02/01 | Projekt fuer bestehenden Kunden mit initialem Status anlegen | `POST /api/projects` | `projectsService` | `projectsRepository`, `customersRepository` | `project`, `customer` | `projectsService.requiredFields`, `projectsService.projectNameNormalization` | indirekt in `project-with-appointment.workflow.e2e` via create; kein voller Negativsatz | `project-with-appointment.workflow.e2e` | teilweise | Positivpfad vorhanden; 404/403/409 fuer create nicht voll als API-Vertrag abgesichert; FK nur indirekt. |
| 02/02 | Projektdaten bearbeiten inkl. Kunde/Status/Beschreibung | `PATCH /api/projects/:id` | `projectsService` | `projectsRepository`, `customersRepository` | `project`, `customer` | `optimisticLocking` (unit mock) | `calendarAppointments.project-name-refresh.integration` (happy), keine vollstaendige Fehlermatrix | - | teilweise | 409 stale indirekt/unit vorhanden; 404/403/422/kundenwechsel als Integration nicht voll. |
| 02/03 | Vollstaendige Projektdetails anzeigen | `GET /api/projects/:id` | `projectsService` + aggregierte Nebenpfade | `projectsRepository`, `notesRepository`, `projectStatusRepository`, `appointmentsRepository` | `project`,`customer`,`project_note`,`project_attachment`,`project_project_status`,`appointments` | UI wiring tests teilweise | kein Integrationstest fuer aggregierten Vollvertrag | - | nicht abgedeckt | Aktueller Endpoint liefert nur `{ project, customer }`; FT02 fordert mehr (Status/Notizen/Anhaenge/Termine). |
| 02/04 | Projektstatuszuordnung aendern (n:m) | `GET/POST/DELETE /api/projects/:projectId/statuses` | `projectStatusService` | `projectStatusRepository` | `project_project_status`, `project_status`, `project` | `projectStatusAssignmentRules`, `projectStatusAuthorization` | `projectStatus.relations`, `projectStatus.visibility.by-role` | - | teilweise | Add/remove/inactive/duplicate/version/role gut; Projekt-not-found-Kombinationen nicht voll explizit. |
| 02/05 | Projektnotizen pflegen | `GET/POST/DELETE /api/projects/:projectId/notes/:noteId?` | `projectNotesService`, `notesService` | `notesRepository` | `notes`, `project_note` | `projectForm.notesVersioning` (wiring), `optimisticLocking` (unit note) | `notes.create.transactional-readback`, `notes.joins-and-template-integrity` | - | teilweise | Join-Integritaet gut; Rollen-403 fuer Projektnotizen nicht explizit abgesichert. |
| 02/06 | Projektanhaenge verwalten (upload/list/open/download; kein delete) | `GET/POST /api/projects/:id/attachments`, `GET /api/project-attachments/:id/download`, `DELETE /api/project-attachments/:id` | `projectAttachmentsService` | `projectsRepository` | `project_attachment`, `project` | `attachmentRules` (unit, 405/disposition) | kein Integrationstest fuer upload/list/download | - | nicht abgedeckt | Zentrale API-Pfade nicht end-to-end getestet; nur unit-invariant fuer delete/disposition. |
| 02/07 | Projektuebersicht mit Grundmengen (upcoming/noAppointments) | `GET /api/projects?scope=...` | `projectsService` | `projectsRepository` | `project`, `appointments`, `project_project_status` | `projectFilters.orderNumber` (client-side filter) | kein Integrationstest fuer scopes `upcoming`/`noAppointments` | - | nicht abgedeckt | Mengenlogik serverseitig ungetestet; nur UI/wiring-Teile. |
| 02/08 | Projekt nur ohne Termine loeschen | `DELETE /api/projects/:id` | `projectsService` | `projectsRepository` | `project`,`appointments`,`project_note`,`project_attachment`,`project_project_status` | `optimisticLocking` (unit mock) | `projects.delete.rules` | - | teilweise | 204/409/404/version vorhanden; 403 rollenbasiert nicht explizit. Join-cleanup/FK direkt nicht geprueft. |
| 02/09 | Projektaenderung konsistent in Terminansichten | `PATCH /api/projects/:id`, `GET /api/calendar/appointments`, `GET /api/projects/:id/appointments` | `projectsService`, `appointmentsService` | `projectsRepository`,`appointmentsRepository` | `project`,`appointments` | `projectForm.appointmentCacheInvalidation` (wiring) | `calendarAppointments.project-name-refresh.integration` | - | teilweise | Kalenderprojektion getestet; weitere abh. Sichten nur punktuell. |
| 02/10 | Statusaenderung systemweit konsistent sichtbar | status relation endpoints + project/appointment projections | `projectStatusService`,`appointmentsService` | `projectStatusRepository`,`appointmentsRepository` | `project_project_status`,`project_status` | `projectForm.statusRelationsLocking` (wiring) | `projectStatus.*` teils, aber keine vollstaendige cross-view Filterkonsistenz | - | teilweise | Kern-joinverhalten vorhanden; systemweite Projektion/Filterwirkung nur teilweise. |
| 02/11 | Projektloeschung systemweit ohne inkonsistente Referenzen | `DELETE /api/projects/:id` + abh. read endpoints | `projectsService`,`appointmentsService` | `projectsRepository`,`appointmentsRepository` | `project` + abh. joins | `projectForm.deleteWiring` (wiring) | `projects.delete.rules` nur Kernregeln | - | teilweise | Queransichts-Neutralzustand/Detail-close nicht als API-contract abgesichert. |
| 02/12 | Quersicht-Vertrag: konsistente Projektdarstellung in abh. Sichten | kalender/list/sidebar endpoints | `appointmentsService` | `appointmentsRepository` | `appointments`,`project`,`customer`,`project_project_status` | mehrere UI wiring tests | punktuell `calendarAppointments.project-name-refresh` | - | teilweise | Nur einzelne Projektionen; keine explizite Nicht-Duplikations-/Source-of-truth-Absicherung. |
| 02/13 | Denormalisierte Projektanzeige nach Aenderung aktualisieren | `PATCH /api/projects/:id` + abh. views | `projectsService`,`appointmentsService` | `projectsRepository`,`appointmentsRepository` | `project`,`appointments` | invalidation wiring tests | `calendarAppointments.project-name-refresh` | - | teilweise | Eine zentrale Sicht geprueft, aber nicht alle relevanten Denormalisierungen. |
| 02/14 | Optimistic locking bei parallelen Projektupdates | `PATCH /api/projects/:id` | `projectsService` | `projectsRepository` | `project.version` | `optimisticLocking` (unit project update/delete) | kein echter Parallel-Integrationstest fuer Projekt | - | teilweise | Konfliktpfad unit-seitig, paralleler Integrationsnachweis fehlt. |
| 02/15 | Join-Konsistenz Projekt<->Status inkl. cleanup | status relation endpoints + `DELETE /api/projects/:id` | `projectStatusService`,`projectsService` | `projectStatusRepository`,`projectsRepository` | `project_project_status`,`project`,`project_status` | `projectStatusAssignmentRules` | `projectStatus.relations` | - | teilweise | Duplicate/version/not-found gut; cleanup bei Projektloeschung nicht direkt assertiert. |
| 02/16 | Referenz-Konsistenz Projekt<->Kunde | `POST/PATCH /api/projects`, FK behavior | `projectsService` | `projectsRepository`,`customersRepository` | `project.customer_id`,`customer` | `projectsService.requiredFields` | `projects.customer-fk.constraint.integration` (direkter DB-FK) | - | teilweise | FK-Existenz abgesichert; Regel "deaktivierter Kunde nicht neu zuweisbar" nicht belegt. |
| 02/17 | Disjunkte Mengenlogik in Projektuebersicht | `GET /api/projects?scope=upcoming/noAppointments` | `projectsService` | `projectsRepository` | `project`,`appointments` | - | kein direkter Integrationstest | - | nicht abgedeckt | Disjunktheit/Filter-auf-Grundmenge fehlt testseitig. |
| 02/18 | Race condition bei Projektloeschung verhindern | `DELETE /api/projects/:id` vs `POST /api/appointments` | `projectsService`,`appointmentsService` | `projectsRepository`,`appointmentsRepository` | `project`,`appointments` | - | kein expliziter Race-Test | - | nicht abgedeckt | Atomare Konsistenzpruefung wird aktuell nicht als konkurrierender Testfall nachgewiesen. |
| 02/19 | Quersicht-Vertrag anzeigen (duplicate intent zu UC12) | wie UC12 | wie UC12 | wie UC12 | wie UC12 | wie UC12 | wie UC12 | - | teilweise | Separat tracebar, aber fachlich gleiche Luecke wie UC12. |
| 02/20 | Denormalisierte Anzeige aktualisieren (duplicate intent zu UC13) | wie UC13 | wie UC13 | wie UC13 | wie UC13 | wie UC13 | wie UC13 | - | teilweise | Separat tracebar, aber fachlich gleiche Luecke wie UC13. |

## Explicit gap inventory (before)

- DB direct assertions missing for FT02 in:
  - `project_attachment` integration behavior
  - `project_project_status` cleanup on project delete
  - `project` list-scope disjointness (`upcoming` vs `noAppointments`)
- Missing explicit negative path assertions in FT02 scope:
  - 403 for project create/update/delete and notes/attachments mutate paths
  - 404 for some relation combinations (project/status cross not found)
- Missing explicit FT02 race and parallel tests:
  - UC 02/18 race delete vs appointment create
  - UC 02/14 true concurrent stale write in integration
