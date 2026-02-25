# FT02 Test Strategy

## Scope

Feature: FT (02) Projekte
Coverage target: UC 02/01 - UC 02/20
Constraint: no production code changes (API/service/repository/middleware/schema unchanged)

## Test architecture

- Priority: Integration tests first.
- Unit tests only for isolated deterministic logic contracts.
- E2E only for minimal cross-layer workflow confirmation.
- Failing gap tests run in normal suites (no skip/todo hiding).
- UC duplicates remain separately traceable:
  - UC 02/12 and UC 02/19
  - UC 02/13 and UC 02/20

## Existing technical constraints

- Safety gate and test DB rules from `docs/test-strategy.md` remain mandatory.
- Integration setup relies on:
  - `tests/setup.env.ts`
  - `tests/setup.integration.ts`
  - `tests/helpers/resetDatabase.ts`
- Session auth in integration tests uses `test-admin` login flow.

## Per-UC implementation plan

| UC | Test type | Goal | Data prerequisites | Expected behavior | DB operations covered | Expected status |
|---|---|---|---|---|---|---|
| 02/01 | Integration | Create project positive + negative contract | customer, optional status | POST creates project with version; invalid relation/paths explicit | insert/select `project`, FK to `customer` | mixed (green + possible red for role/validation gaps) |
| 02/02 | Integration | Update project happy + stale + not-found + role assumptions | customer+project | PATCH updates and increments version; stale => 409 | update/select `project` | mixed |
| 02/03 | Integration | Aggregate detail contract validation | project with notes/status/attachments/appointments | GET detail should expose required FT02 aggregate surface | read `project`,`customer`,`project_note`,`project_project_status`,`project_attachment`,`appointments` | intentionally failing where contract missing |
| 02/04 | Integration | Status relation lifecycle and error matrix | active+inactive statuses, project | add/remove with expected/relation version and conflicts | insert/delete/select `project_project_status` | mostly green |
| 02/05 | Integration | Notes lifecycle including parent mismatch/versioning | project, note template optional | create/list/delete and mismatch protection | insert/delete/select `notes`,`project_note` | mostly green |
| 02/06 | Integration | Attachments list/upload/download/no-delete and negative paths | project, upload payload | upload persists and list/download work; delete blocked | insert/select `project_attachment` | mixed (intentional red for unsupported role/validation rules) |
| 02/07 | Integration | Scope `upcoming` vs `noAppointments` list behavior | projects with future/past/no appointments | only configured ground set returned | read `project`,`appointments` | mixed |
| 02/08 | Integration | Deletion rules + cleanup checks | project with and without appointments/status/notes/attachments | 204/409/404 and cleanup verification | delete/select `project`,`project_project_status`,`project_note`,`project_attachment` | mixed |
| 02/09 | Integration | Project changes reflected in appointment views | project with appointments | projection refresh after PATCH | read `project`,`appointments` | green |
| 02/10 | Integration | Status changes reflected system-wide | project status relations + projection reads | status projection remains consistent | read `project_project_status`,`project_status` | mixed |
| 02/11 | Integration | System-wide consistency after project deletion | project referenced in list/projection | no stale references after deletion | read/delete across dependent projections | mixed |
| 02/12 | Integration | Cross-view source-of-truth contract | project in multiple projections | dependent views derive from canonical project source | read projections | intentionally red where not enforceable by current contracts |
| 02/13 | Integration | Denormalized representation refresh | project update + dependent views | stale denormalized values invalidated/reloaded | read/update projections | mixed |
| 02/14 | Integration + Unit | Optimistic locking with real stale write race | same project version in 2 writers | first update succeeds, second stale update => 409 | update/select `project.version` | green |
| 02/15 | Integration | n:m join integrity + duplicate prevention + delete cleanup | project + statuses + project delete | unique relation, stale conflict, cleanup on delete | `project_project_status` lifecycle | mixed |
| 02/16 | Integration | customer reference consistency incl FK and active constraints | valid/invalid customers, optional inactive customer | invalid customer blocked; FK and service constraints visible | `project.customer_id` | mixed (intentional red for unsupported inactive-customer rule) |
| 02/17 | Integration | Ground-set disjointness and filter behavior | projects in future/past/no-appointments sets | `upcoming` and `noAppointments` disjoint; filters stay in-scope | reads over `appointments.start_date` relation | mixed |
| 02/18 | Integration | Deletion race with concurrent appointment creation | project without appointments at start | one side must fail safely (409/constraint) without inconsistent final state | transactional behavior on `project` + `appointments` | mixed / intentional red if race guarantee not provable |
| 02/19 | Integration | Separate trace for cross-view display contract | same as UC02/12 | explicit dedicated reference | same as UC02/12 | mixed |
| 02/20 | Integration | Separate trace for denormalized refresh contract | same as UC02/13 | explicit dedicated reference | same as UC02/13 | mixed |

## New/extended artifacts

- New tests:
  - `tests/integration/server/ft02.full-uc-coverage.integration.test.ts`
  - `tests/integration/server/projects.scope.mengenlogik.integration.test.ts`
  - `tests/integration/server/projects.attachments.integration.test.ts`
  - `tests/integration/server/projects.delete.race-condition.integration.test.ts`
  - `tests/integration/server/projects.detail.aggregate-contract.integration.test.ts`
- Documentation:
  - `docs/FT02_UC_COVERAGE_MATRIX_BEFORE.md`
  - `docs/FT02_TEST_STRATEGY.md`
  - `docs/FT02_UC_COVERAGE_MATRIX_AFTER.md`
  - `docs/TEST_MATRIX.md` update (required)

## Rules for conscious failing tests

- Explicit UC id in test name.
- Header comment includes business reason and gap context.
- Failure message states exact missing capability / required production change.
- No skip/todo for these cases.

## Execution plan

1. Run FT02 integration set:
   - `npm run test:integration -- tests/integration/server/ft02*`
2. Run project-focused unit set:
   - `npm run test:unit -- tests/unit/*project*`
3. Run FT02 minimal e2e:
   - `npm run test:e2e -- tests/e2e/project-with-appointment.workflow.e2e.test.ts`
4. Run targeted new files for diagnostics:
   - `projects.scope.mengenlogik.integration.test.ts`
   - `projects.attachments.integration.test.ts`
   - `projects.delete.race-condition.integration.test.ts`
   - `projects.detail.aggregate-contract.integration.test.ts`

## Acceptance criteria

- Every UC 02/01 - 02/20 has at least one explicit test reference.
- Final matrix marks each UC with `Ja/Teilweise/Nein`.
- Final report includes:
  - number of new tests
  - number of adjusted tests
  - number of intentionally failing tests
  - directly tested DB tables
  - directly tested endpoints
  - visible functional gaps surfaced by failing tests
