/**
 * Test Scope:
 *
 * Feature: FT30/FT01 - Verfuegbarkeitscheck und Terminbereinigung
 *
 * Abgedeckte Regeln:
 * - Termin-Mutationen blockieren ohne Confirm bei Verfuegbarkeitskonflikten.
 * - Tourwechsel ersetzt die bestehende Mitarbeiterliste vollstaendig statt zu mergen.
 * - Die manuelle Mitarbeiterliste liefert verfuegbare und nicht verfuegbare Mitarbeiter getrennt.
 * - FT30 bietet Preview und transaktionalen Bulk-Ersatz fuer betroffene zukuenftige Termine.
 *
 * Fehlerfaelle:
 * - Nicht verfuegbare Mitarbeiter werden still vom Termin entfernt.
 * - Alte Termin-Mitarbeiter bleiben bei Tourwechsel unbeabsichtigt erhalten.
 * - Preview/Bulk fehlen oder mutieren ohne expliziten Aufruf.
 *
 * Ziel:
 * Den FT01/FT30-Confirm-Flow fuer Verfuegbarkeitskonflikte und den FT30-Abwesenheitsworkflow end-to-end absichern.
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type express from "express";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import { assignEmployeesToTourFixture, createTourFixture, getAppointmentEmployeeIds } from "../../helpers/appointmentOverlapFixtures";
import {
  createAppointmentFixture,
  createEmployeeAbsenceFixture,
  createEmployeeFixture,
  createProjectFixture,
  getRelativeBerlinDate,
  resetTestDataFactoryState,
} from "../../helpers/testDataFactory";
import * as employeesService from "../../../server/services/employeesService";

let app: express.Express;

beforeAll(async () => {
  app = await createApiTestApp();
});

beforeEach(() => {
  resetTestDataFactoryState();
});

describe("FT30/FT01 integration: employee availability and absence cleanup", () => {
  it("requires explicit confirmation before unavailable employees are removed during appointment create", async () => {
    const admin = await loginAdminAgent(app);
    const project = await createProjectFixture({ prefix: "FT30FT01-CREATE" });
    const availableEmployee = await createEmployeeFixture("AVAILABLE");
    const absentEmployee = await createEmployeeFixture("ABSENT");
    const exitedEmployee = await createEmployeeFixture("EXITED");

    await createEmployeeAbsenceFixture({
      employeeId: absentEmployee.id,
      from: "2099-07-01",
      until: "2099-07-02",
    });
    await employeesService.updateEmployee(
      exitedEmployee.id,
      { exitDate: "2099-07-01", version: exitedEmployee.version },
      "ADMIN",
    );

    const blocked = await admin.post("/api/appointments").send({
      projectId: project.id,
      tourId: null,
      startDate: "2099-07-01",
      employeeIds: [availableEmployee.id, absentEmployee.id, exitedEmployee.id],
    }).expect(409);

    expect(blocked.body.code).toBe("AVAILABILITY_CONFIRMATION_REQUIRED");
    expect(blocked.body.availabilityConflicts).toEqual([
      { id: absentEmployee.id, fullName: absentEmployee.fullName, reason: "absence" },
      { id: exitedEmployee.id, fullName: exitedEmployee.fullName, reason: "exit_date" },
    ]);

    const confirmed = await admin.post("/api/appointments").send({
      projectId: project.id,
      tourId: null,
      startDate: "2099-07-01",
      employeeIds: [availableEmployee.id, absentEmployee.id, exitedEmployee.id],
      confirmAvailabilityAdjustments: true,
    }).expect(201);

    expect(confirmed.body.employees.map((employee: { id: number }) => employee.id)).toEqual([availableEmployee.id]);
    expect(confirmed.body.excludedEmployees).toEqual([
      { id: absentEmployee.id, fullName: absentEmployee.fullName, reason: "absence" },
      { id: exitedEmployee.id, fullName: exitedEmployee.fullName, reason: "exit_date" },
    ]);
  });

  it("blocks tour changes without confirm and then replaces existing assignments with the filtered new list", async () => {
    const admin = await loginAdminAgent(app);
    const project = await createProjectFixture({ prefix: "FT30FT01-TOUR" });
    const oldEmployee = await createEmployeeFixture("OLD");
    const newAvailable = await createEmployeeFixture("NEW-A");
    const newAbsent = await createEmployeeFixture("NEW-B");
    const tour = await createTourFixture();
    await assignEmployeesToTourFixture(tour.id, [newAvailable, newAbsent]);
    await createEmployeeAbsenceFixture({
      employeeId: newAbsent.id,
      from: "2099-07-05",
      until: "2099-07-05",
    });

    const existing = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-07-05",
      employeeIds: [oldEmployee.id],
    });

    const blocked = await admin.patch(`/api/appointments/${existing.id}`).send({
      version: existing.version,
      projectId: project.id,
      tourId: tour.id,
      startDate: "2099-07-05",
      employeeIds: [newAvailable.id, newAbsent.id],
    }).expect(409);

    expect(blocked.body.code).toBe("AVAILABILITY_CONFIRMATION_REQUIRED");
    expect(blocked.body.availabilityConflicts).toEqual([
      { id: newAbsent.id, fullName: newAbsent.fullName, reason: "absence" },
    ]);
    await expect(getAppointmentEmployeeIds(existing.id)).resolves.toEqual([oldEmployee.id]);

    const confirmed = await admin.patch(`/api/appointments/${existing.id}`).send({
      version: existing.version,
      projectId: project.id,
      tourId: tour.id,
      startDate: "2099-07-05",
      employeeIds: [newAvailable.id, newAbsent.id],
      confirmAvailabilityAdjustments: true,
    }).expect(200);

    expect(confirmed.body.employees.map((employee: { id: number }) => employee.id)).toEqual([newAvailable.id]);
    expect(confirmed.body.excludedEmployees).toEqual([
      { id: newAbsent.id, fullName: newAbsent.fullName, reason: "absence" },
    ]);
    await expect(getAppointmentEmployeeIds(existing.id)).resolves.toEqual([newAvailable.id]);
  });

  it("returns available and unavailable employees for appointmentDate without changing the default list behavior", async () => {
    const admin = await loginAdminAgent(app);
    const availableEmployee = await createEmployeeFixture("LIST-AVAILABLE");
    const absentEmployee = await createEmployeeFixture("LIST-ABSENT");
    const exitedEmployee = await createEmployeeFixture("LIST-EXITED");

    await createEmployeeAbsenceFixture({
      employeeId: absentEmployee.id,
      from: "2099-08-01",
      until: "2099-08-01",
    });
    await employeesService.updateEmployee(
      exitedEmployee.id,
      { exitDate: "2099-08-01", version: exitedEmployee.version },
      "ADMIN",
    );

    const filtered = await admin.get("/api/employees?scope=active&appointmentDate=2099-08-01&includeUnavailable=true").expect(200);
    expect(filtered.body.availableEmployees.map((employee: { id: number }) => employee.id)).toContain(availableEmployee.id);
    expect(filtered.body.availableEmployees.map((employee: { id: number }) => employee.id)).not.toContain(absentEmployee.id);
    expect(filtered.body.availableEmployees.map((employee: { id: number }) => employee.id)).not.toContain(exitedEmployee.id);
    expect(filtered.body.unavailableEmployees).toEqual([
      { id: absentEmployee.id, fullName: absentEmployee.fullName, reason: "absence" },
      { id: exitedEmployee.id, fullName: exitedEmployee.fullName, reason: "exit_date" },
    ]);

    const unfiltered = await admin.get("/api/employees?scope=active").expect(200);
    expect(unfiltered.body.map((employee: { id: number }) => employee.id)).toContain(absentEmployee.id);
    expect(unfiltered.body.map((employee: { id: number }) => employee.id)).toContain(exitedEmployee.id);
  });

  it("returns affected appointments preview and applies explicit bulk replacement", async () => {
    const admin = await loginAdminAgent(app);
    const project = await createProjectFixture({ prefix: "FT30FT01-BULK" });
    const absentEmployee = await createEmployeeFixture("PREVIEW-ABSENT");
    const replacementEmployee = await createEmployeeFixture("PREVIEW-REPLACEMENT");
    const companionEmployee = await createEmployeeFixture("PREVIEW-COMPANION");

    const firstAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-09-01",
      employeeIds: [absentEmployee.id, companionEmployee.id],
    });
    const secondAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-09-02",
      employeeIds: [absentEmployee.id],
    });
    const absence = await createEmployeeAbsenceFixture({
      employeeId: absentEmployee.id,
      from: "2099-09-01",
      until: "2099-09-03",
    });

    const preview = await admin
      .get(`/api/employees/${absentEmployee.id}/absences/${absence.id}/appointments-preview`)
      .expect(200);

    expect(preview.body.appointments.map((appointment: { appointmentId: number }) => appointment.appointmentId)).toEqual([
      firstAppointment.id,
      secondAppointment.id,
    ]);

    const bulk = await admin
      .post(`/api/employees/${absentEmployee.id}/absences/${absence.id}/bulk-replace-appointments`)
      .send({ replacementEmployeeId: replacementEmployee.id })
      .expect(200);

    expect(bulk.body.updatedAppointmentCount).toBe(2);
    await expect(getAppointmentEmployeeIds(firstAppointment.id)).resolves.toEqual([companionEmployee.id, replacementEmployee.id]);
    await expect(getAppointmentEmployeeIds(secondAppointment.id)).resolves.toEqual([replacementEmployee.id]);
  });
});
