/**
 * Test Scope:
 *
 * Bereich:
 * - Terminverschiebung mit Mitarbeiterkollision
 *
 * Abgedeckte Regeln:
 * - Drag-and-drop-Updates liefern einen blockierenden Konflikt, wenn der Mitarbeiter am Zieldatum bereits verplant ist.
 * - Der Server meldet den Konflikt explizit als `EMPLOYEE_OVERLAP_CONFLICT`.
 * - Bei blockiertem Konflikt bleibt die bestehende Mitarbeiterzuweisung unveraendert.
 *
 * Fehlerfaelle:
 * - Terminverschiebung ignoriert bestehende Mitarbeiterbelegungen.
 * - Konflikt wird nur generisch oder mit falschem Code gemeldet.
 *
 * Ziel:
 * Den serverseitigen PATCH-Vertrag fuer echte Mitarbeiterkollisionen beim Kalender-Drag-and-drop absichern.
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type express from "express";

import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createEmployeeFixture,
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

describe("calendar drag and drop overlap handling", () => {
  it("returns EMPLOYEE_OVERLAP_CONFLICT when the moved appointment collides with an existing employee assignment", async () => {
    const admin = await loginAdminAgent(app);
    const customer = await createCustomerFixture("DD-OVERLAP-CUST");
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
      { id: overlappingEmployee.id, fullName: overlappingEmployee.fullName, isAbsence: false },
    ]);
    await expect(getAppointmentEmployeeIds(appointmentToMove.id)).resolves.toEqual([overlappingEmployee.id]);
  });
});
