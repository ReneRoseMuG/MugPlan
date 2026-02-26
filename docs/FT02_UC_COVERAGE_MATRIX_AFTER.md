# FT02 UC Coverage Matrix (After)

Basis:
- FT02 test implementation in this change set
- Existing FT02-related tests retained

Status semantics:
- `Ja` = explicit FT02 test reference exists and intended behavior is directly asserted
- `Teilweise` = explicit reference exists, but only subset of UC contract is directly assertable in current contracts
- `Nein` = no explicit test reference

| UC | Abgedeckt (Ja/Teilweise/Nein) | Primare Testreferenzen | Erwarteter Teststatus |
|---|---|---|---|
| 02/01 | Ja | `ft02.full-uc-coverage.integration` (UC 02/01 test) | gruen |
| 02/02 | Ja | `ft02.full-uc-coverage.integration` (UC 02/02 test) | gruen |
| 02/03 | Teilweise | `projects.detail.aggregate-contract.integration` | bewusst fehlschlagend (Gap) |
| 02/04 | Ja | `ft02.full-uc-coverage.integration`, `projectStatus.relations.integration` | gruen |
| 02/05 | Ja | `ft02.full-uc-coverage.integration`, `notes.*.integration` | gruen |
| 02/06 | Ja | `projects.attachments.integration`, `attachmentRules.unit` | gemischt (inkl. bewusst rot fuer Soll-Luecken) |
| 02/07 | Ja | `projects.scope.mengenlogik.integration` | gruen |
| 02/08 | Ja | `ft02.full-uc-coverage.integration`, `projects.delete.rules.integration` | gruen |
| 02/09 | Ja | `ft02.full-uc-coverage.integration`, `calendarAppointments.project-name-refresh.integration` | gruen |
| 02/10 | Teilweise | `ft02.full-uc-coverage.integration`, `projectStatus.*.integration` | gemischt |
| 02/11 | Teilweise | `ft02.full-uc-coverage.integration`, `projects.delete.rules.integration` | gemischt |
| 02/12 | Teilweise | `ft02.full-uc-coverage.integration` blocker test | bewusst fehlschlagend (Gap) |
| 02/13 | Ja | `ft02.full-uc-coverage.integration`, `calendarAppointments.project-name-refresh.integration` | gruen |
| 02/14 | Ja | `ft02.full-uc-coverage.integration`, `optimisticLocking.unit` | gruen |
| 02/15 | Ja | `ft02.full-uc-coverage.integration`, `projectStatus.relations.integration` | gruen |
| 02/16 | Teilweise | `ft02.full-uc-coverage.integration`, `projects.customer-fk.constraint.integration` | gemischt |
| 02/17 | Ja | `projects.scope.mengenlogik.integration` | gruen |
| 02/18 | Ja | `projects.delete.race-condition.integration` | gemischt |
| 02/19 | Teilweise | `ft02.full-uc-coverage.integration` blocker test | bewusst fehlschlagend (Gap) |
| 02/20 | Teilweise | `ft02.full-uc-coverage.integration` blocker test | bewusst fehlschlagend (Gap) |

## Delta summary (this implementation)

- New test files:
  - `tests/integration/server/ft02.full-uc-coverage.integration.test.ts`
  - `tests/integration/server/projects.scope.mengenlogik.integration.test.ts`
  - `tests/integration/server/projects.attachments.integration.test.ts`
  - `tests/integration/server/projects.delete.race-condition.integration.test.ts`
  - `tests/integration/server/projects.detail.aggregate-contract.integration.test.ts`
- Adjusted existing test files: 0
- Intentionally failing tests introduced:
  - UC 02/03 aggregate contract gap
  - UC 02/12 cross-view source-of-truth blocker
  - UC 02/19 separate cross-view blocker
  - UC 02/20 separate denormalized-refresh blocker
  - UC 02/06 negative-role/404 expectations may fail depending on current Ist behavior

## Directly tested DB tables in FT02 additions

- `project`
- `customer`
- `appointments`
- `project_project_status`
- `project_attachment`
- `notes`
- `project_note`
- `project_status`

## Directly tested FT02 endpoints in additions

- `POST /api/projects`
- `PATCH /api/projects/:id`
- `GET /api/projects/:id`
- `GET /api/projects?scope=upcoming|noAppointments`
- `DELETE /api/projects/:id`
- `GET /api/projects/:projectId/notes`
- `POST /api/projects/:projectId/notes`
- `DELETE /api/projects/:projectId/notes/:noteId`
- `GET /api/projects/:projectId/attachments`
- `POST /api/projects/:projectId/attachments`
- `GET /api/project-attachments/:id/download`
- `DELETE /api/project-attachments/:id`
- `GET /api/projects/:projectId/statuses`
- `POST /api/projects/:projectId/statuses`
- `DELETE /api/projects/:projectId/statuses/:statusId`
- `POST /api/appointments`
- `GET /api/calendar/appointments`
- `GET /api/customers/:id/appointments?scope=all`

## Visible functional gaps surfaced by failing tests

- `GET /api/projects/:id` does not expose full FT02 aggregate payload in one contract response.
- FT02 cross-view/source-of-truth invariants (UC 02/12, 02/19, 02/20) are not directly enforceable via dedicated backend invariant endpoints.
- Attachment mutation authorization/unknown-project error mapping may differ from FT02 requirement (403/404).
