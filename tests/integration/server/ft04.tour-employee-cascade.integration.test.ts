/**
 * Test Scope:
 *
 * Feature: FT04 - Tourenplanung
 * Use Case: UC 04/11, UC 04/12
 *
 * Abgedeckte Regeln:
 * - UC 04/11 Preview: liefert alle zukuenftigen Tour-Termine, historische werden ausgeschlossen.
 * - UC 04/11 Preview: Overlap-Konflikte werden als eligible=false, conflictReason=EMPLOYEE_OVERLAP markiert.
 * - UC 04/11 Preview: bereits zugewiesener Mitarbeiter wird als eligible=false, conflictReason=ALREADY_ASSIGNED markiert.
 * - UC 04/11 Execute: nur explizit uebergebene selectedAppointmentIds werden mutiert.
 * - UC 04/11 Execute: nicht gewaehlte Termine bleiben unveraendert.
 * - UC 04/11 Execute: Overlap der zwischen Preview und Execute entsteht wird als EMPLOYEE_OVERLAP geskippt, kein Rollback der Tourzuordnung.
 * - UC 04/11 Execute: employee.tourId wird atomar mit den Termin-Mutationen gesetzt.
 * - UC 04/12 Preview: listet nur Termine auf denen der Mitarbeiter tatsaechlich eingetragen ist.
 * - UC 04/12 Preview: historische Termine und Termine ohne den Mitarbeiter werden nicht gelistet.
 * - UC 04/12 Execute: entfernt Mitarbeiter selektiv nur aus angehakten Terminen.
 * - UC 04/12 Execute: nicht angehakte Termine behalten den Mitarbeiter.
 * - UC 04/12 Execute: employee.tourId wird auf null gesetzt.
 * - Rollback: VERSION_CONFLICT auf employee setzt keine Termin-Mutationen durch.
 *
 * Fehlerfaelle:
 * - Historische Termine werden nicht mutiert (HISTORICAL_APPOINTMENT skip).
 * - Termin nicht auf Tour: APPOINTMENT_NOT_ON_TOUR skip.
 * - Mitarbeiter bereits zugewiesen: ALREADY_ASSIGNED skip beim Execute.
 * - Mitarbeiter nicht zugewiesen: NOT_ASSIGNED skip beim Remove-Execute.
 *
 * Ziel:
 * Den fachlichen FT04-Kaskadenkern fuer Preview, Execute, Rollback und selektive Auswahl
 * serverseitig absichern. Abwesenheiten sind aus dem Scope ausgenommen.
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

describe("FT04 UC 04/11: Mitarbeiter zur Tour hinzufuegen â Kaskaden-Preview", () => {
  it("liefert alle zukuenftigen Tour-Termine und schliesst historische aus", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#227799");
    const project = await createProjectFixture({ prefix: "FT04-PREV-HIST" });
    const candidate = await createEmployeeFixture("FT04-PREV-HIST-CAND");

    await createRawAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(-1),
      title: "historisch",
      tourId: tour.id,
    });

    const futureAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: tour.id,
    });

    const preview = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-add/preview`)
      .send({ employeeId: candidate.id })
      .expect(200);

    const ids = (preview.body as Array<{ appointmentId: number }>).map((row) => row.appointmentId);
    expect(ids).toContain(futureAppointment!.id);
    expect(preview.body).toHaveLength(1);
  });

  it("markiert Overlap-Konflikte als eligible=false mit conflictReason EMPLOYEE_OVERLAP", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#334455");
    const project = await createProjectFixture({ prefix: "FT04-PREV-OVERLAP" });
    const candidate = await createEmployeeFixture("FT04-PREV-OVERLAP-CAND");

    const conflictAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
      tourId: tour.id,
    });
    const freeAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(3),
      tourId: tour.id,
    });

    await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
      employeeIds: [candidate.id],
    });

    const preview = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-add/preview`)
      .send({ employeeId: candidate.id })
      .expect(200);

    const byId = new Map(
      (preview.body as Array<{ appointmentId: number; eligible: boolean; conflictReason: string | null }>).map(
        (row) => [row.appointmentId, row],
      ),
    );

    expect(byId.get(conflictAppointment!.id)).toMatchObject({
      eligible: false,
      conflictReason: "EMPLOYEE_OVERLAP",
    });
    expect(byId.get(freeAppointment!.id)).toMatchObject({
      eligible: true,
      conflictReason: null,
    });
  });

  it("markiert bereits zugewiesenen Mitarbeiter als eligible=false mit conflictReason ALREADY_ASSIGNED", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#556677");
    const project = await createProjectFixture({ prefix: "FT04-PREV-ALREADY" });
    const candidate = await createEmployeeFixture("FT04-PREV-ALREADY-CAND");

    const alreadyAssigned = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: tour.id,
      employeeIds: [candidate.id],
    });

    const preview = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-add/preview`)
      .send({ employeeId: candidate.id })
      .expect(200);

    const byId = new Map(
      (preview.body as Array<{ appointmentId: number; eligible: boolean; conflictReason: string | null }>).map(
        (row) => [row.appointmentId, row],
      ),
    );

    expect(byId.get(alreadyAssigned!.id)).toMatchObject({
      eligible: false,
      conflictReason: "ALREADY_ASSIGNED",
    });
  });
});

describe("FT04 UC 04/11: Mitarbeiter zur Tour hinzufuegen â Kaskaden-Execute", () => {
  it("fuegt Mitarbeiter nur zu explizit gewaehlten Terminen hinzu, nicht gewaehlte bleiben unveraendert", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#338855");
    const project = await createProjectFixture({ prefix: "FT04-EXEC-SEL" });
    const candidate = await createEmployeeFixture("FT04-EXEC-SEL-CAND");

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

    const result = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-add`)
      .send({
        employeeId: candidate.id,
        employeeVersion: candidate.version,
        selectedAppointmentIds: [selected!.id],
      })
      .expect(200);

    expect(result.body).toMatchObject({
      updatedAppointmentCount: 1,
      skipped: [],
    });
    expect(await getAppointmentEmployeeIds(selected!.id)).toEqual([candidate.id]);
    expect(await getAppointmentEmployeeIds(notSelected!.id)).toEqual([]);

    const employeeResp = await admin.get(`/api/employees/${candidate.id}`).expect(200);
    expect(employeeResp.body.employee.tourId).toBe(tour.id);
  });

  it("skippt Termin mit EMPLOYEE_OVERLAP wenn Konflikt zwischen Preview und Execute entstand, Tourzuordnung bleibt gesetzt", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#884422");
    const project = await createProjectFixture({ prefix: "FT04-EXEC-LATE-CONFLICT" });
    const candidate = await createEmployeeFixture("FT04-EXEC-LATE-CAND");

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

    const result = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-add`)
      .send({
        employeeId: candidate.id,
        employeeVersion: candidate.version,
        selectedAppointmentIds: [targetAppointment!.id],
      })
      .expect(200);

    expect(result.body).toMatchObject({
      updatedAppointmentCount: 0,
      skipped: [{ appointmentId: targetAppointment!.id, reason: "EMPLOYEE_OVERLAP" }],
    });
    expect(await getAppointmentEmployeeIds(targetAppointment!.id)).toEqual([]);
    const employeeResp = await admin.get(`/api/employees/${candidate.id}`).expect(200);
    expect(employeeResp.body.employee.tourId).toBe(tour.id);
  });

  it("skippt historischen Termin mit HISTORICAL_APPOINTMENT auch wenn er in selectedAppointmentIds uebergeben wird", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#aabbcc");
    const project = await createProjectFixture({ prefix: "FT04-EXEC-HIST" });
    const candidate = await createEmployeeFixture("FT04-EXEC-HIST-CAND");

    const historicalAppointmentId = await createRawAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(-1),
      title: "historisch",
      tourId: tour.id,
    });

    const result = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-add`)
      .send({
        employeeId: candidate.id,
        employeeVersion: candidate.version,
        selectedAppointmentIds: [historicalAppointmentId],
      })
      .expect(200);

    expect(result.body.skipped).toEqual([
      { appointmentId: historicalAppointmentId, reason: "HISTORICAL_APPOINTMENT" },
    ]);
    expect(await getAppointmentEmployeeIds(historicalAppointmentId)).toEqual([]);
  });

  it("skippt Termin mit APPOINTMENT_NOT_ON_TOUR wenn Termin nicht zur Tour gehoert", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#112233");
    const project = await createProjectFixture({ prefix: "FT04-EXEC-NOT-ON-TOUR" });
    const candidate = await createEmployeeFixture("FT04-EXEC-NOT-ON-TOUR-CAND");

    const otherAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: null,
    });

    const result = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-add`)
      .send({
        employeeId: candidate.id,
        employeeVersion: candidate.version,
        selectedAppointmentIds: [otherAppointment!.id],
      })
      .expect(200);

    expect(result.body.skipped).toEqual([
      { appointmentId: otherAppointment!.id, reason: "APPOINTMENT_NOT_ON_TOUR" },
    ]);
  });

  it("lehnt VERSION_CONFLICT ab und mutiert keine Termine", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#999000");
    const project = await createProjectFixture({ prefix: "FT04-EXEC-VERSION" });
    const candidate = await createEmployeeFixture("FT04-EXEC-VERSION-CAND");

    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: tour.id,
    });

    const result = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-add`)
      .send({
        employeeId: candidate.id,
        employeeVersion: 99999,
        selectedAppointmentIds: [appointment!.id],
      });

    expect(result.status).toBe(409);
    expect(result.body.code).toBe("VERSION_CONFLICT");
    expect(await getAppointmentEmployeeIds(appointment!.id)).toEqual([]);
    const employeeResp = await admin.get(`/api/employees/${candidate.id}`).expect(200);
    expect(employeeResp.body.employee.tourId).toBeNull();
  });
});

describe("FT04 UC 04/12: Mitarbeiter von Tour abziehen â Kaskaden-Preview", () => {
  it("listet nur Termine auf denen der Mitarbeiter eingetragen ist, nicht alle Tour-Termine", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#663399");
    const project = await createProjectFixture({ prefix: "FT04-REM-PREV" });
    const assigned = await createEmployeeFixture("FT04-REM-PREV-CAND");

    await admin
      .post(`/api/tours/${tour.id}/employees`)
      .send({ items: [{ employeeId: assigned.id, version: assigned.version }] })
      .expect(200);

    const withEmployee = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: tour.id,
      employeeIds: [assigned.id],
    });
    const withoutEmployee = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(2),
      tourId: tour.id,
      employeeIds: [],
    });

    const preview = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-remove/preview`)
      .send({ employeeId: assigned.id })
      .expect(200);

    const ids = (preview.body as Array<{ appointmentId: number }>).map((row) => row.appointmentId);
    expect(ids).toContain(withEmployee!.id);
    expect(ids).not.toContain(withoutEmployee!.id);
  });

  it("schliesst historische Termine aus der Preview aus", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#442266");
    const project = await createProjectFixture({ prefix: "FT04-REM-PREV-HIST" });
    const assigned = await createEmployeeFixture("FT04-REM-PREV-HIST-CAND");

    await admin
      .post(`/api/tours/${tour.id}/employees`)
      .send({ items: [{ employeeId: assigned.id, version: assigned.version }] })
      .expect(200);

    await createRawAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(-1),
      title: "historisch mit MA",
      tourId: tour.id,
      employeeIds: [assigned.id],
    });

    const preview = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-remove/preview`)
      .send({ employeeId: assigned.id })
      .expect(200);

    expect(preview.body).toHaveLength(0);
  });
});

describe("FT04 UC 04/12: Mitarbeiter von Tour abziehen â Kaskaden-Execute", () => {
  it("entfernt Mitarbeiter selektiv nur aus angehakten Terminen, nicht angehakte behalten ihn", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#663300");
    const project = await createProjectFixture({ prefix: "FT04-REM-EXEC-SEL" });
    const assigned = await createEmployeeFixture("FT04-REM-EXEC-SEL-CAND");

    await admin
      .post(`/api/tours/${tour.id}/employees`)
      .send({ items: [{ employeeId: assigned.id, version: assigned.version }] })
      .expect(200);

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

    const refreshed = (await admin.get(`/api/employees/${assigned.id}`).expect(200)).body.employee as {
      id: number;
      version: number;
    };

    const result = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-remove`)
      .send({
        employeeId: assigned.id,
        employeeVersion: refreshed.version,
        selectedAppointmentIds: [toRemove!.id],
      })
      .expect(200);

    expect(result.body).toMatchObject({
      updatedAppointmentCount: 1,
      skipped: [],
    });
    expect(await getAppointmentEmployeeIds(toRemove!.id)).toEqual([]);
    expect(await getAppointmentEmployeeIds(toKeep!.id)).toEqual([assigned.id]);

    const employeeResp = await admin.get(`/api/employees/${assigned.id}`).expect(200);
    expect(employeeResp.body.employee.tourId).toBeNull();
  });

  it("skippt Termin mit NOT_ASSIGNED wenn Mitarbeiter nicht auf dem Termin steht", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#221100");
    const project = await createProjectFixture({ prefix: "FT04-REM-EXEC-NOT-ASSIGNED" });
    const assigned = await createEmployeeFixture("FT04-REM-EXEC-NOT-ASSIGNED-CAND");

    await admin
      .post(`/api/tours/${tour.id}/employees`)
      .send({ items: [{ employeeId: assigned.id, version: assigned.version }] })
      .expect(200);

    const emptyAppointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: tour.id,
      employeeIds: [],
    });

    const refreshed = (await admin.get(`/api/employees/${assigned.id}`).expect(200)).body.employee as {
      id: number;
      version: number;
    };

    const result = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-remove`)
      .send({
        employeeId: assigned.id,
        employeeVersion: refreshed.version,
        selectedAppointmentIds: [emptyAppointment!.id],
      })
      .expect(200);

    expect(result.body.skipped).toEqual([
      { appointmentId: emptyAppointment!.id, reason: "NOT_ASSIGNED" },
    ]);
  });

  it("lehnt VERSION_CONFLICT ab und entfernt keine Mitarbeiter von Terminen", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#000111");
    const project = await createProjectFixture({ prefix: "FT04-REM-EXEC-VERSION" });
    const assigned = await createEmployeeFixture("FT04-REM-EXEC-VERSION-CAND");

    await admin
      .post(`/api/tours/${tour.id}/employees`)
      .send({ items: [{ employeeId: assigned.id, version: assigned.version }] })
      .expect(200);

    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: tour.id,
      employeeIds: [assigned.id],
    });

    const result = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-remove`)
      .send({
        employeeId: assigned.id,
        employeeVersion: 99999,
        selectedAppointmentIds: [appointment!.id],
      });

    expect(result.status).toBe(409);
    expect(result.body.code).toBe("VERSION_CONFLICT");
    expect(await getAppointmentEmployeeIds(appointment!.id)).toEqual([assigned.id]);
  });

  it("leere selectedAppointmentIds loest nur Tourzuordnung auf ohne Termine zu mutieren", async () => {
    const admin = await loginAdmin();
    const tour = await createTourFixture("#aabbcc");
    const project = await createProjectFixture({ prefix: "FT04-REM-EXEC-EMPTY" });
    const assigned = await createEmployeeFixture("FT04-REM-EXEC-EMPTY-CAND");

    await admin
      .post(`/api/tours/${tour.id}/employees`)
      .send({ items: [{ employeeId: assigned.id, version: assigned.version }] })
      .expect(200);

    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(1),
      tourId: tour.id,
      employeeIds: [assigned.id],
    });

    const refreshed = (await admin.get(`/api/employees/${assigned.id}`).expect(200)).body.employee as {
      id: number;
      version: number;
    };

    const result = await admin
      .post(`/api/tours/${tour.id}/employees/cascade-remove`)
      .send({
        employeeId: assigned.id,
        employeeVersion: refreshed.version,
        selectedAppointmentIds: [],
      })
      .expect(200);

    expect(result.body).toMatchObject({
      updatedAppointmentCount: 0,
      skipped: [],
    });
    expect(await getAppointmentEmployeeIds(appointment!.id)).toEqual([assigned.id]);
    const employeeResp = await admin.get(`/api/employees/${assigned.id}`).expect(200);
    expect(employeeResp.body.employee.tourId).toBeNull();
  });
});
