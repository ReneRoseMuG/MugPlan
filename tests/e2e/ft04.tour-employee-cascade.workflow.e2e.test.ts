/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - FT04 bildet einen kompletten API-Workflow fuer Add-Preview, selektive Add-Execute, Remove-Preview und Remove-Execute.
 * - Der Mitarbeiterzustand und die betroffenen Terminzuordnungen bleiben ueber den gesamten Workflow konsistent.
 *
 * Fehlerfaelle:
 * - Add- und Remove-Kaskade verlieren zwischen den Schritten den fachlichen Zustand.
 * - Selektiv ausgewaehlte Termine werden im Gesamtworkflow nicht korrekt beibehalten.
 *
 * Ziel:
 * Einen schlanken FT04-Ende-zu-Ende-Workflow ueber die reale API-Pipeline absichern.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type express from "express";

import { createApiTestApp, loginAdminAgent } from "../helpers/apiTestHarness";
import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../helpers/testDataFactory";
import { getAppointmentEmployeeIds } from "../helpers/appointmentOverlapFixtures";

let app: express.Express;

beforeAll(async () => {
  app = await createApiTestApp();
});

describe("FT04 e2e: tour employee cascade workflow", () => {
  it("adds and removes a member through the real cascade API flow", async () => {
    const admin = await loginAdminAgent(app);
    const tour = await createTourFixture("#336699");
    const project = await createProjectFixture({ prefix: "FT04-E2E", name: "FT04 E2E Projekt" });
    const employee = await createEmployeeFixture("FT04-E2E-CANDIDATE");

    const firstAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: tour.id,
    });
    const secondAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
      tourId: tour.id,
    });

    const addPreview = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-add/preview`)
      .send({ employeeId: employee.id })
      .expect(200);
    expect(addPreview.body).toHaveLength(2);

    await admin
      .post(`/api/tours/${tour.id}/employees/cascade-add`)
      .send({
        employeeId: employee.id,
        employeeVersion: employee.version,
        selectedAppointmentIds: [firstAppointment!.id],
      })
      .expect(200);

    expect(await getAppointmentEmployeeIds(firstAppointment!.id)).toEqual([employee.id]);
    expect(await getAppointmentEmployeeIds(secondAppointment!.id)).toEqual([]);

    const refreshedEmployee = (await admin.get(`/api/employees/${employee.id}`).expect(200)).body.employee as {
      version: number;
    };

    const removePreview = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-remove/preview`)
      .send({ employeeId: employee.id })
      .expect(200);
    expect(removePreview.body.map((row: { appointmentId: number }) => row.appointmentId)).toEqual([firstAppointment!.id]);

    await admin
      .post(`/api/tours/${tour.id}/employees/cascade-remove`)
      .send({
        employeeId: employee.id,
        employeeVersion: refreshedEmployee.version,
        selectedAppointmentIds: [firstAppointment!.id],
      })
      .expect(200);

    expect(await getAppointmentEmployeeIds(firstAppointment!.id)).toEqual([]);
    const finalEmployee = (await admin.get(`/api/employees/${employee.id}`).expect(200)).body.employee as {
      tourId: number | null;
    };
    expect(finalEmployee.tourId).toBeNull();
  });
});
