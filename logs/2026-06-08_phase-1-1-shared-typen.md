# Phase 1.1 — Shared Typen und Reason-Codes

**Datum:** 08.06.26
**Branch:** `feat/unified-appointment-change-model`
**Commit:** `902ac70d`

## Zweck

Grundlage für das Unified Appointment Change Model legen: alle fachlichen Typen und
Reason-Codes als zentrale shared-Definitionen, damit Server und Client dieselbe Sprache
sprechen — ohne Implementierungslogik.

## Scope

Zwei neue Dateien unter `shared/appointmentChange/`:

- **`reasonCodes.ts`** — 11 typisierte Konstanten:
  `EMPLOYEES_REMOVED_BY_TOUR_CHANGE`, `EMPLOYEES_REMOVED_BY_WEEK_CHANGE`,
  `MANUAL_SELECTION_PRESERVED`, `EMPLOYEE_CONFLICT_OVERLAP`,
  `EMPLOYEE_CONFLICT_ABSENCE_VACATION/SICK/ABSENT`,
  `WEEK_PLAN_AVAILABLE`, `WEEK_PLAN_EMPLOYEE_CONFLICT`,
  `SAVED_WITHOUT_EMPLOYEES`, `TARGET_BLOCKED`.
  Union-Typen `AppointmentChangeReasonCode` und `EmployeeConflictReasonCode`.

- **`types.ts`** — Kerninterfaces:
  `AppointmentChangeRequest` (Eingangstyp für alle 5 Änderungskanäle),
  `AppointmentChangePlan` (Ergebnistyp des Planners und Preview-Endpunkts),
  `EmployeeChangeItem` (pro Mitarbeiter mit Konfliktgrund),
  `EmployeeConflictDetail` (mit `conflictSource` und `absenceType`),
  `EmployeeIntent` (preserve / conscious_selection / week_plan / save_without_employees),
  `BlockReason` (WEEK_LOCKED / HISTORIC_APPOINTMENT / APPOINTMENT_CANCELLED /
  PERMISSION_DENIED / ABSENCE_APPOINTMENT).

## Technische Entscheidungen

- `AbsenceType` wird aus `shared/absenceAppointments.ts` importiert, nicht dupliziert.
- `AppointmentChangeReasonCode` ist ein `as const`-Array-Typ — exhaustive, erweiterbar,
  keine Magic Strings an Aufrufstellen.
- `EmployeeConflictDetail.conflictingAppointmentId` als Number (nicht optional), damit
  Phase 2 den konkreten Konflikttermin zum Planner durchreichen kann.

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `shared/appointmentChange/reasonCodes.ts` | neu |
| `shared/appointmentChange/types.ts` | neu |

## Hinweise zum Testen

Keine eigenen Tests in Phase 1.1 — reine Typdefinitionen.
Tests folgen in Phase 1.3 (Unit-Tests für den Planner).
`npm run check` und `npm run lint` laufen sauber durch.

## Bekannte Einschränkungen

Keine. Die Typen sind bewusst minimal — nur was Phase 1.2 und 2.x tatsächlich brauchen.
