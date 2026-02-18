# Employee Appointment Overlap Tests

## Purpose
This document describes the test coverage for employee assignment overlap and historical appointment guards.

`architecture.md und rules.md gelesen und verstanden`

## Conflict Logic Under Test
The business trigger is the attempt to create or replace rows in `appointment_employee`.
Covered assignment paths:
- tour prefill (appointment uses tour members)
- team assignment (team members merged into appointment employees)
- manual employee assignment
- tour switch / tour removal / post-assignment tour changes

Expected conflict behavior in the tests:
- conflicting employee is explicitly listed in conflict payload
- conflicting employee is not part of final appointment employee list
- non-conflicting employees remain assigned
- no duplicate `(appointment_id, employee_id)` pairs exist

## All-Day vs Intraday Differentiation
The suite contains assertions for expected handling of:
- all-day appointment without `startTime`
- intraday appointments with explicit `startTime`
- mixed all-day + intraday combinations on the same date

## Multiday Validation
The suite checks date-span semantics:
- overlap must be evaluated across all days from `startDate` to `endDate`
- one conflicting day blocks the employee for the full assignment request
- no partial employee assignment for multiday conflicts

## Implemented Test Files
- `tests/integration/server/appointments.employee-overlap.integration.test.ts`
- `tests/integration/server/appointments.employee-overlap.multiday.integration.test.ts`
- `tests/integration/server/appointments.employee-overlap.flow.integration.test.ts`
- `tests/integration/server/appointments.historical-guards.integration.test.ts`
- `tests/unit/ui/calendar.historical-create-controls.test.tsx`
- `tests/unit/ui/appointmentForm.historical-validation.test.tsx`

## Soll/Ist Deviations
The tests intentionally encode target behavior from the specification.
If current implementation differs, failing tests are expected and documented as output of this test package. No business-logic fixes are part of this scope.
