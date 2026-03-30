/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - UC 04/11 Preview liefert nur zukuenftige Tour-Termine und markiert Konflikte sichtbar.
 * - UC 04/11 Execute mutiert nur explizit ausgewaehlte Termine.
 * - UC 04/12 Preview listet nur Tour-Termine, auf denen der Mitarbeiter tatsaechlich eingetragen ist.
 * - UC 04/12 Execute entfernt Mitarbeiter selektiv nur aus angehakten Terminen.
 *
 * Fehlerfaelle:
 * - Historische Termine werden in Preview oder Execute faelschlich beruecksichtigt.
 * - Overlap-, Already-assigned- und Not-assigned-Faelle liefern keinen stabilen Skip-/Preview-Zustand.
 *
 * Ziel:
 * Den FT04-Kaskadenkern nach Wegfall von `employee.tourId` serverseitig absichern.
 */
import type { SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import type express from "express";

import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createRawAppointmentFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../../helpers/testDataFactory";
import { getAppointmentEmployeeIds } from "../../helpers/appointmentOverlapFixtures";

let app: express.Express;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function loginAdmin(): Promise<SuperAgentTest> {
  return loginAdminAgent(app);
}

describe("FT04 UC 04/11: Mitarbeiter zur Tour hinzufuegen", () => {
  it("preview excludes historical appointments and marks overlap and already-assigned rows", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#334455");
    const project = await createProjectFixture({ prefix: "FT04-CASCADE-PREVIEW" });
    const candidate = await createEmployeeFixture("FT04-CASCADE-CAND");

    await createRawAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(-1),
      title: "historisch",
      tourId: tour.id,
    });

    const overlapAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: tour.id,
    });
    const assignedAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
      tourId: tour.id,
      employeeIds: [candidate.id],
    });
    const freeAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(3),
      tourId: tour.id,
    });

    await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      employeeIds: [candidate.id],
    });

    const preview = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-add/preview`)
      .send({ employeeId: candidate.id })
      .expect(200);

    const byId = new Map(
      (preview.body as Array<{ appointmentId: number; eligible: boolean; conflictReason: string | null }>).map((row) => [row.appointmentId, row] as const),
    );

    expect(byId.has(overlapAppointment!.id)).toBe(true);
    expect(byId.has(assignedAppointment!.id)).toBe(true);
    expect(byId.has(freeAppointment!.id)).toBe(true);
    expect(preview.body).toHaveLength(3);
    expect(byId.get(overlapAppointment!.id)).toMatchObject({
      eligible: false,
      conflictReason: "EMPLOYEE_OVERLAP",
    });
    expect(byId.get(assignedAppointment!.id)).toMatchObject({
      eligible: false,
      conflictReason: "ALREADY_ASSIGNED",
    });
    expect(byId.get(freeAppointment!.id)).toMatchObject({
      eligible: true,
      conflictReason: null,
    });
  });

  it("execute mutates only selected future appointments and leaves others untouched", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#338855");
    const project = await createProjectFixture({ prefix: "FT04-CASCADE-ADD" });
    const candidate = await createEmployeeFixture("FT04-CASCADE-ADD-CAND");

    const selected = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: tour.id,
    });
    const notSelected = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
      tourId: tour.id,
    });
    const historical = await createRawAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(-1),
      title: "historisch",
      tourId: tour.id,
    });

    const result = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-add`)
      .send({
        employeeId: candidate.id,
        selectedAppointmentIds: [selected!.id, historical],
      })
      .expect(200);

    expect(result.body).toMatchObject({
      updatedAppointmentCount: 1,
      skipped: [{ appointmentId: historical, reason: "HISTORICAL_APPOINTMENT" }],
    });
    expect(await getAppointmentEmployeeIds(selected!.id)).toEqual([candidate.id]);
    expect(await getAppointmentEmployeeIds(notSelected!.id)).toEqual([]);
  });

  it("execute skips appointments outside the tour or with late overlap conflicts", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#884422");
    const project = await createProjectFixture({ prefix: "FT04-CASCADE-ADD-SKIPS" });
    const candidate = await createEmployeeFixture("FT04-CASCADE-LATE-CAND");

    const targetAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: tour.id,
    });
    const foreignAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
      tourId: null,
    });

    await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      employeeIds: [candidate.id],
    });

    const result = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-add`)
      .send({
        employeeId: candidate.id,
        selectedAppointmentIds: [targetAppointment!.id, foreignAppointment!.id],
      })
      .expect(200);

    expect(result.body.skipped).toEqual([
      { appointmentId: targetAppointment!.id, reason: "EMPLOYEE_OVERLAP" },
      { appointmentId: foreignAppointment!.id, reason: "APPOINTMENT_NOT_ON_TOUR" },
    ]);
    expect(await getAppointmentEmployeeIds(targetAppointment!.id)).toEqual([]);
    expect(await getAppointmentEmployeeIds(foreignAppointment!.id)).toEqual([]);
  });
});

describe("FT04 UC 04/12: Mitarbeiter von Tour abziehen", () => {
  it("preview lists only appointments that currently contain the employee", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#663399");
    const project = await createProjectFixture({ prefix: "FT04-CASCADE-REMOVE-PREVIEW" });
    const assigned = await createEmployeeFixture("FT04-CASCADE-REMOVE-CAND");

    const withEmployee = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: tour.id,
      employeeIds: [assigned.id],
    });
    await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
      tourId: tour.id,
      employeeIds: [],
    });
    await createRawAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(-1),
      title: "historisch",
      tourId: tour.id,
      employeeIds: [assigned.id],
    });

    const preview = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-remove/preview`)
      .send({ employeeId: assigned.id })
      .expect(200);

    expect(preview.body.map((row: { appointmentId: number }) => row.appointmentId)).toEqual([withEmployee!.id]);
  });

  it("execute removes the employee only from selected appointments", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#663300");
    const project = await createProjectFixture({ prefix: "FT04-CASCADE-REMOVE" });
    const assigned = await createEmployeeFixture("FT04-CASCADE-REMOVE-EXEC");

    const toRemove = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: tour.id,
      employeeIds: [assigned.id],
    });
    const toKeep = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
      tourId: tour.id,
      employeeIds: [assigned.id],
    });

    const result = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-remove`)
      .send({
        employeeId: assigned.id,
        selectedAppointmentIds: [toRemove!.id],
      })
      .expect(200);

    expect(result.body).toMatchObject({
      updatedAppointmentCount: 1,
      skipped: [],
    });
    expect(await getAppointmentEmployeeIds(toRemove!.id)).toEqual([]);
    expect(await getAppointmentEmployeeIds(toKeep!.id)).toEqual([assigned.id]);
  });

  it("execute skips non-assigned or foreign appointments during remove", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#221100");
    const project = await createProjectFixture({ prefix: "FT04-CASCADE-REMOVE-SKIPS" });
    const assigned = await createEmployeeFixture("FT04-CASCADE-REMOVE-SKIP");

    const emptyAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: tour.id,
      employeeIds: [],
    });
    const foreignAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
      tourId: null,
      employeeIds: [assigned.id],
    });

    const result = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-remove`)
      .send({
        employeeId: assigned.id,
        selectedAppointmentIds: [emptyAppointment!.id, foreignAppointment!.id],
      })
      .expect(200);

    expect(result.body.skipped).toEqual([
      { appointmentId: emptyAppointment!.id, reason: "NOT_ASSIGNED" },
      { appointmentId: foreignAppointment!.id, reason: "APPOINTMENT_NOT_ON_TOUR" },
    ]);
  });
});
