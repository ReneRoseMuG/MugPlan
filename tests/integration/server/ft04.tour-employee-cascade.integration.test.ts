/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - UC 04/11 liefert fuer zukuenftige Tour-Termine eine selektive Vorschau mit Konfliktkennzeichnung.
 * - UC 04/11 fuehrt konfliktfreie Termine aus und meldet spaet entstandene Konflikte als Skip.
 * - UC 04/12 zeigt nur tatsaechlich belegte zukuenftige Termine an und entfernt den Mitarbeiter selektiv.
 *
 * Fehlerfaelle:
 * - Historische Termine erscheinen in der Vorschau oder werden mutiert.
 * - Zwischen Vorschau und Bestaetigung entstandene Konflikte blockieren die gesamte Kaskade statt partiell geskippt zu werden.
 * - Abzugs-Vorschau listet Termine ohne Mitarbeiter weiterhin auf.
 *
 * Ziel:
 * Den fachlichen FT04-Kaskadenkern fuer Preview, Execute, Rollback und selektive Auswahl serverseitig absichern.
 */
import type { SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import type express from "express";

import * as appointmentsRepository from "../../../server/repositories/appointmentsRepository";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import {
  createAppointmentFixture,
  createEmployeeAbsenceFixture,
  createEmployeeFixture,
  createProjectFixture,
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

describe.skip("FT04 integration: tour employee cascade", () => {
  it("marks overlap and availability conflicts in the add preview and excludes historical appointments", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#227799");
    const project = await createProjectFixture({ prefix: "FT04-CASCADE-PREVIEW", name: "FT04 Preview Projekt" });
    const candidate = await createEmployeeFixture("FT04-CASCADE-CANDIDATE");

    await appointmentsRepository.createAppointment(
      {
        projectId: project.id,
        customerId: project.customerId,
        tourId: tour.id,
        title: "historical",
        description: null,
        startDate: new Date(`${getRelativeBerlinDate(-1)}T00:00:00`),
        startTime: null,
        endDate: null,
        endTime: null,
      },
      [],
    );
    const eligibleAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: tour.id,
    });
    const overlapAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
      tourId: tour.id,
    });
    const absenceAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(3),
      tourId: tour.id,
    });

    await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
      employeeIds: [candidate.id],
    });
    await createEmployeeAbsenceFixture({
      employeeId: candidate.id,
      from: getRelativeBerlinDate(3),
      until: getRelativeBerlinDate(3),
    });

    const preview = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-add/preview`)
      .send({ employeeId: candidate.id })
      .expect(200);

    expect(preview.body).toHaveLength(3);
    const byId = new Map(preview.body.map((row: { appointmentId: number }) => [row.appointmentId, row]));
    expect(byId.has(eligibleAppointment!.id)).toBe(true);
    expect(byId.has(overlapAppointment!.id)).toBe(true);
    expect(byId.has(absenceAppointment!.id)).toBe(true);

    expect(byId.get(eligibleAppointment!.id)).toMatchObject({
      eligible: true,
      conflictReason: null,
    });
    expect(byId.get(overlapAppointment!.id)).toMatchObject({
      eligible: false,
      conflictReason: "EMPLOYEE_OVERLAP",
    });
    expect(byId.get(absenceAppointment!.id)).toMatchObject({
      eligible: false,
      conflictReason: "EMPLOYEE_ABSENCE",
    });
  });

  it("executes add cascade partially and reports overlap plus availability skips", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#4a8458");
    const project = await createProjectFixture({ prefix: "FT04-CASCADE-PARTIAL", name: "FT04 Partial Projekt" });
    const candidate = await createEmployeeFixture("FT04-PARTIAL-CANDIDATE");

    const eligibleAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: tour.id,
    });
    const overlapAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
      tourId: tour.id,
    });
    const absenceAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(3),
      tourId: tour.id,
    });

    await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
      employeeIds: [candidate.id],
    });
    await createEmployeeAbsenceFixture({
      employeeId: candidate.id,
      from: getRelativeBerlinDate(3),
      until: getRelativeBerlinDate(3),
    });

    const result = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-add`)
      .send({
        employeeId: candidate.id,
        employeeVersion: candidate.version,
        selectedAppointmentIds: [eligibleAppointment!.id, overlapAppointment!.id, absenceAppointment!.id],
      })
      .expect(200);

    expect(result.body).toEqual({
      updatedAppointmentCount: 1,
      skipped: [
        { appointmentId: overlapAppointment!.id, reason: "EMPLOYEE_OVERLAP" },
        { appointmentId: absenceAppointment!.id, reason: "EMPLOYEE_ABSENCE" },
      ],
    });
    expect(await getAppointmentEmployeeIds(eligibleAppointment!.id)).toEqual([candidate.id]);
    expect(await getAppointmentEmployeeIds(overlapAppointment!.id)).toEqual([]);
    expect(await getAppointmentEmployeeIds(absenceAppointment!.id)).toEqual([]);

    const employeeResponse = await admin.get(`/api/employees/${candidate.id}`).expect(200);
    expect(employeeResponse.body.employee.tourId).toBe(tour.id);
  });

  it("executes add cascade selectively and keeps unselected future appointments unchanged", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#338855");
    const project = await createProjectFixture({ prefix: "FT04-CASCADE-ADD", name: "FT04 Add Projekt" });
    const candidate = await createEmployeeFixture("FT04-ADD-CANDIDATE");

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

    const result = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-add`)
      .send({
        employeeId: candidate.id,
        employeeVersion: candidate.version,
        selectedAppointmentIds: [firstAppointment!.id],
      })
      .expect(200);

    expect(result.body).toEqual({
      updatedAppointmentCount: 1,
      skipped: [],
    });
    expect(await getAppointmentEmployeeIds(firstAppointment!.id)).toEqual([candidate.id]);
    expect(await getAppointmentEmployeeIds(secondAppointment!.id)).toEqual([]);

    const employeeResponse = await admin.get(`/api/employees/${candidate.id}`).expect(200);
    expect(employeeResponse.body.employee.tourId).toBe(tour.id);
  });

  it("returns a skip when an overlap appears after the preview", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#884422");
    const project = await createProjectFixture({ prefix: "FT04-CASCADE-ROLLBACK", name: "FT04 Skip Projekt" });
    const candidate = await createEmployeeFixture("FT04-ROLLBACK-CANDIDATE");

    const targetAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: tour.id,
    });

    await admin
      .post(`/api/tours/${tour.id}/employees/cascade-add/preview`)
      .send({ employeeId: candidate.id })
      .expect(200);

    await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      employeeIds: [candidate.id],
    });

    const response = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-add`)
      .send({
        employeeId: candidate.id,
        employeeVersion: candidate.version,
        selectedAppointmentIds: [targetAppointment!.id],
      })
      .expect(200);

    expect(response.body).toEqual({
      updatedAppointmentCount: 0,
      skipped: [{ appointmentId: targetAppointment!.id, reason: "EMPLOYEE_OVERLAP" }],
    });
    expect(await getAppointmentEmployeeIds(targetAppointment!.id)).toEqual([]);
    const employeeResponse = await admin.get(`/api/employees/${candidate.id}`).expect(200);
    expect(employeeResponse.body.employee.tourId).toBe(tour.id);
  });

  it("previews and executes remove cascade only for future appointments that currently include the employee", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#663399");
    const project = await createProjectFixture({ prefix: "FT04-CASCADE-REMOVE", name: "FT04 Remove Projekt" });
    const assigned = await createEmployeeFixture("FT04-REMOVE-CANDIDATE");

    await admin
      .post(`/api/tours/${tour.id}/employees`)
      .send({ items: [{ employeeId: assigned.id, version: assigned.version }] })
      .expect(200);

    const firstAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: tour.id,
      employeeIds: [assigned.id],
    });
    const secondAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
      tourId: tour.id,
      employeeIds: [assigned.id],
    });
    await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(3),
      tourId: tour.id,
      employeeIds: [],
    });

    const refreshedEmployee = (await admin.get(`/api/employees/${assigned.id}`).expect(200)).body.employee as {
      id: number;
      version: number;
    };

    const preview = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-remove/preview`)
      .send({ employeeId: assigned.id })
      .expect(200);

    expect(preview.body.map((row: { appointmentId: number }) => row.appointmentId).sort((a: number, b: number) => a - b)).toEqual([
      firstAppointment!.id,
      secondAppointment!.id,
    ]);

    const result = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-remove`)
      .send({
        employeeId: assigned.id,
        employeeVersion: refreshedEmployee.version,
        selectedAppointmentIds: [firstAppointment!.id],
      })
      .expect(200);

    expect(result.body).toEqual({
      updatedAppointmentCount: 1,
      skipped: [],
    });
    expect(await getAppointmentEmployeeIds(firstAppointment!.id)).toEqual([]);
    expect(await getAppointmentEmployeeIds(secondAppointment!.id)).toEqual([assigned.id]);

    const employeeResponse = await admin.get(`/api/employees/${assigned.id}`).expect(200);
    expect(employeeResponse.body.employee.tourId).toBeNull();
  });
});
