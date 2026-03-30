/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die aktive Mitarbeitermenge einer Tour wird aus zukuenftigen Tour-Terminen abgeleitet.
 * - Historische Termine tragen nicht zur aktiven Mitarbeitermenge bei.
 * - Mehrfachbelegung desselben Mitarbeiters auf mehreren Tour-Terminen wird dedupliziert.
 *
 * Fehlerfaelle:
 * - Historische Termine erscheinen faelschlich in der aktiven Mitarbeitermenge.
 * - Eine Tour ohne aktuelle oder zukuenftige Termine liefert keine saubere leere Liste.
 *
 * Ziel:
 * Den neuen FT04-Lesevertrag `/api/tours/:tourId/employees/active` serverseitig absichern.
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

let app: express.Express;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function loginAdmin(): Promise<SuperAgentTest> {
  return loginAdminAgent(app);
}

describe("FT04 integration: active employees by tour", () => {
  it("lists deduplicated employees from future tour appointments", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#335577");
    const project = await createProjectFixture({ prefix: "FT04-ACTIVE" });
    const employeeA = await createEmployeeFixture("FT04-ACTIVE-A");
    const employeeB = await createEmployeeFixture("FT04-ACTIVE-B");

    await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: tour.id,
      employeeIds: [employeeA.id, employeeB.id],
    });
    await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
      tourId: tour.id,
      employeeIds: [employeeA.id],
    });

    await admin.get(`/api/tours/${tour.id}/employees/active`).expect(200).expect((res) => {
      const ids = (res.body as Array<{ id: number }>).map((employee) => employee.id).sort((left, right) => left - right);
      expect(ids).toEqual([employeeA.id, employeeB.id].sort((left, right) => left - right));
    });
  });

  it("excludes employees that are only assigned on historical tour appointments", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#1188aa");
    const project = await createProjectFixture({ prefix: "FT04-ACTIVE-HIST" });
    const employee = await createEmployeeFixture("FT04-ACTIVE-HIST");

    await createRawAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(-1),
      title: "historisch",
      tourId: tour.id,
      employeeIds: [employee.id],
    });

    await admin.get(`/api/tours/${tour.id}/employees/active`).expect(200).expect((res) => {
      expect(res.body).toEqual([]);
    });
  });

  it("ignores future appointments from other tours", async () => {
    const admin = await loginAdmin();
    const requestedTour = await createTourFixture("#aa4400");
    const otherTour = await createTourFixture("#00aa44");
    const project = await createProjectFixture({ prefix: "FT04-ACTIVE-OTHER" });
    const employee = await createEmployeeFixture("FT04-ACTIVE-OTHER");

    await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: otherTour.id,
      employeeIds: [employee.id],
    });

    await admin.get(`/api/tours/${requestedTour.id}/employees/active`).expect(200).expect((res) => {
      expect(res.body).toEqual([]);
    });
  });

  it("returns an empty list for tours without current or future appointments", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#333399");

    await admin.get(`/api/tours/${tour.id}/employees/active`).expect(200).expect((res) => {
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });
  });
});
