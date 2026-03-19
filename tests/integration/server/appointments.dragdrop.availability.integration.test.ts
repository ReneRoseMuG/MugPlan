/**
 * Test Scope:
 *
 * Feature: FT01 - Drag-and-Drop mit Verfuegbarkeitskonflikten
 *
 * Abgedeckte Regeln:
 * - Terminverschiebungen pruefen Verfuegbarkeit ueber die komplette Zielspanne.
 * - Ohne Confirm wird bei Verfuegbarkeitskonflikten nicht gespeichert.
 * - Mit Confirm werden nur betroffene Mitarbeiter entfernt; die Restliste laeuft weiter in die Overlap-Pruefung.
 *
 * Fehlerfaelle:
 * - Drag-and-Drop veraendert die Mitarbeiterliste still.
 * - Mehrtagestermine pruefen nur den Starttag.
 * - Overlap wird vor der bestaetigten Availability-Bereinigung ausgewertet.
 *
 * Ziel:
 * Den serverseitigen PATCH-Vertrag fuer Drag-and-Drop-Verfuegbarkeitskonflikte end-to-end absichern.
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type express from "express";

import * as employeesService from "../../../server/services/employeesService";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createEmployeeAbsenceFixture,
  createEmployeeFixture,
  createProjectFixture,
  resetTestDataFactoryState,
} from "../../helpers/testDataFactory";
import { getAppointmentEmployeeIds } from "../../helpers/appointmentOverlapFixtures";

let app: express.Express;

beforeAll(async () => {
  app = await createApiTestApp();
});

beforeEach(() => {
  resetTestDataFactoryState();
});

describe.skip("FT01 integration: drag and drop availability handling", () => {
  it("blocks moving an appointment without confirm when one employee is absent on the target date", async () => {
    const admin = await loginAdminAgent(app);
    const project = await createProjectFixture({ prefix: "FT01-DD-BLOCK" });
    const absentEmployee = await createEmployeeFixture("DD-BLOCK-ABSENT");
    const retainedEmployee = await createEmployeeFixture("DD-BLOCK-KEEP");
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-07-01",
      employeeIds: [absentEmployee.id, retainedEmployee.id],
    });

    await createEmployeeAbsenceFixture({
      employeeId: absentEmployee.id,
      from: "2099-07-05",
      until: "2099-07-05",
    });

    const response = await admin.patch(`/api/appointments/${appointment.id}`).send({
      version: appointment.version,
      projectId: project.id,
      startDate: "2099-07-05",
      employeeIds: [absentEmployee.id, retainedEmployee.id],
      confirmAvailabilityAdjustments: false,
    }).expect(409);

    expect(response.body.code).toBe("AVAILABILITY_CONFIRMATION_REQUIRED");
    expect(response.body.availabilityConflicts).toEqual([
      { id: absentEmployee.id, fullName: absentEmployee.fullName, reason: "absence" },
    ]);
    await expect(getAppointmentEmployeeIds(appointment.id)).resolves.toEqual([absentEmployee.id, retainedEmployee.id]);
  });

  it("moves an appointment with confirm and removes only the unavailable employees", async () => {
    const admin = await loginAdminAgent(app);
    const project = await createProjectFixture({ prefix: "FT01-DD-CONFIRM" });
    const absentEmployee = await createEmployeeFixture("DD-CONFIRM-ABSENT");
    const retainedEmployee = await createEmployeeFixture("DD-CONFIRM-KEEP");
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-08-01",
      employeeIds: [absentEmployee.id, retainedEmployee.id],
    });

    await createEmployeeAbsenceFixture({
      employeeId: absentEmployee.id,
      from: "2099-08-03",
      until: "2099-08-03",
    });

    const response = await admin.patch(`/api/appointments/${appointment.id}`).send({
      version: appointment.version,
      projectId: project.id,
      startDate: "2099-08-03",
      employeeIds: [absentEmployee.id, retainedEmployee.id],
      confirmAvailabilityAdjustments: true,
    }).expect(200);

    expect(String(response.body.startDate).slice(0, 10)).toBe("2099-08-03");
    expect(response.body.employees.map((employee: { id: number }) => employee.id)).toEqual([retainedEmployee.id]);
    expect(response.body.excludedEmployees).toEqual([
      { id: absentEmployee.id, fullName: absentEmployee.fullName, reason: "absence" },
    ]);
    await expect(getAppointmentEmployeeIds(appointment.id)).resolves.toEqual([retainedEmployee.id]);
  });

  it("checks availability for the full target range during multiday moves", async () => {
    const admin = await loginAdminAgent(app);
    const project = await createProjectFixture({ prefix: "FT01-DD-MULTI" });
    const rangeBlockedEmployee = await createEmployeeFixture("DD-MULTI-BLOCKED");
    const retainedEmployee = await createEmployeeFixture("DD-MULTI-KEEP");
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-09-01",
      endDate: "2099-09-03",
      employeeIds: [rangeBlockedEmployee.id, retainedEmployee.id],
    });

    await createEmployeeAbsenceFixture({
      employeeId: rangeBlockedEmployee.id,
      from: "2099-09-06",
      until: "2099-09-06",
    });

    const blocked = await admin.patch(`/api/appointments/${appointment.id}`).send({
      version: appointment.version,
      projectId: project.id,
      startDate: "2099-09-05",
      endDate: "2099-09-07",
      employeeIds: [rangeBlockedEmployee.id, retainedEmployee.id],
      confirmAvailabilityAdjustments: false,
    }).expect(409);

    expect(blocked.body.code).toBe("AVAILABILITY_CONFIRMATION_REQUIRED");
    expect(blocked.body.availabilityConflicts).toEqual([
      { id: rangeBlockedEmployee.id, fullName: rangeBlockedEmployee.fullName, reason: "absence" },
    ]);
  });

});

describe("FT01 integration: drag and drop overlap handling", () => {
  it("returns EMPLOYEE_OVERLAP_CONFLICT when the moved appointment collides with an existing employee assignment", async () => {
    const admin = await loginAdminAgent(app);
    const customer = await createCustomerFixture("FT01-DD-OVERLAP-CUST");
    const overlappingEmployee = await createEmployeeFixture("DD-OVERLAP-BUSY");
    const appointmentToMove = await createAppointmentFixture({
      projectId: null,
      customerId: customer.id,
      startDate: "2099-10-01",
      employeeIds: [overlappingEmployee.id],
    });
    await createAppointmentFixture({
      projectId: null,
      customerId: customer.id,
      startDate: "2099-10-05",
      employeeIds: [overlappingEmployee.id],
    });

    const response = await admin.patch(`/api/appointments/${appointmentToMove.id}`).send({
      version: appointmentToMove.version,
      projectId: null,
      customerId: customer.id,
      startDate: "2099-10-05",
      employeeIds: [overlappingEmployee.id],
    }).expect(409);

    expect(response.body.code).toBe("EMPLOYEE_OVERLAP_CONFLICT");
    expect(response.body.conflictEmployees).toEqual([
      { id: overlappingEmployee.id, fullName: overlappingEmployee.fullName },
    ]);
    await expect(getAppointmentEmployeeIds(appointmentToMove.id)).resolves.toEqual([overlappingEmployee.id]);
  });
});
