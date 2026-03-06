/**
 * Test Scope:
 *
 * Feature: FT01 - Kalendertermine verwalten
 * Use Case: UC 01/01 bis UC 01/16
 *
 * Abgedeckte Regeln:
 * - End-to-end Absicherung der Termin-Lifecycle-, Zuordnungs-, Historien-, Locking- und Projektion-Regeln.
 * - DB-Write-Pfade werden mit Join-Konsistenz (appointment_employee) und Atomaritaets-Checks validiert.
 * - UC-Regeln werden als verifizierbare Integrationskontrakte abgedeckt.
 *
 * Fehlerfaelle:
 * - Overlap-Konflikte, Versionskonflikte, historische Blockaden, ungueltige Eingaben und List-Filter-Fehler.
 * - Kontraktabweichungen mit expliziter Fehlermeldung statt stiller Auslassung.
 *
 * Ziel:
 * Vollstaendige UC-nahe FT01-Testabdeckung unter strikter Produktionscode-Sperre.
 */
import express from "express";
import { createServer } from "http";
import { eq, sql } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { db } from "../../../server/db";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { registerRoutes } from "../../../server/routes";
import { appointmentEmployees, appointments, type Appointment } from "@shared/schema";
import {
  assignEmployeesToTeamFixture,
  assignEmployeesToTourFixture,
  assertNoDuplicateAppointmentEmployeePairs,
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTeamFixture,
  createTourFixture,
  expectConflictPayloadContainsEmployees,
  getAppointmentEmployeeIds,
  loginAdminAgent,
  resetAppointmentOverlapFixtureCounters,
} from "../../helpers/appointmentOverlapFixtures";

let app: express.Express;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

beforeEach(() => {
  resetAppointmentOverlapFixtureCounters();
});

async function getAppointmentRow(appointmentId: number): Promise<Appointment | null> {
  const [row] = await db.select().from(appointments).where(eq(appointments.id, appointmentId));
  return row ?? null;
}

async function getVersionFromApi(appointmentId: number): Promise<number> {
  const response = await (await loginAdminAgent(app)).get(`/api/appointments/${appointmentId}`).expect(200);
  return Number(response.body.version);
}

async function listIds(url: string): Promise<number[]> {
  const response = await (await loginAdminAgent(app)).get(url).expect(200);
  const rows = response.body as Array<{ id: number }>;
  return rows.map((row) => row.id).sort((a, b) => a - b);
}

describe("FT01 UC coverage integration", () => {
  it("UC 01/01 happy+negative: create with project and block only when project and customer are both missing", async () => {
    const agent = await loginAdminAgent(app);
    const { customer, project } = await createProjectFixture("UC01-01");
    const employee = await createEmployeeFixture("UC01-01-E");
    const beforeList = await agent.get(`/api/projects/${project.id}/appointments?fromDate=1900-01-01`).expect(200);
    const beforeCount = (beforeList.body as Array<unknown>).length;

    const created = await agent
      .post("/api/appointments")
      .send({ projectId: project.id, startDate: "2099-10-01", employeeIds: [employee.id] })
      .expect(201);

    const id = Number(created.body.id);
    expect(Number.isInteger(id)).toBe(true);
    const detail = await agent.get(`/api/appointments/${id}`).expect(200);
    expect(detail.body.projectId).toBe(project.id);
    expect(await getAppointmentEmployeeIds(id)).toEqual([employee.id]);

    const projectAppointments = await agent.get(`/api/projects/${project.id}/appointments?fromDate=1900-01-01`).expect(200);
    const projection = (projectAppointments.body as Array<{ id: number; customer: { id: number } }>).find((row) => row.id === id);
    expect(projection?.customer.id).toBe(customer.id);

    const invalid = await agent.post("/api/appointments").send({ startDate: "2099-10-01", employeeIds: [] });
    expect([400, 422]).toContain(invalid.status);

    const invalidProject = await agent.post("/api/appointments").send({
      projectId: 9_999_999_999,
      startDate: "2099-10-01",
      employeeIds: [],
    });
    expect(invalidProject.status).toBe(422);
    expect(invalidProject.body).toMatchObject({ code: "VALIDATION_ERROR" });

    const afterList = await agent.get(`/api/projects/${project.id}/appointments?fromDate=1900-01-01`).expect(200);
    expect((afterList.body as Array<unknown>).length).toBe(beforeCount + 1);
  });

  it("UC 01/01 rule: startTime is only startTime and does not imply default duration", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("UC01-01-START-TIME");

    const created = await agent
      .post("/api/appointments")
      .send({
        projectId: project.id,
        startDate: "2099-10-01",
        startTime: "09:30:00",
        employeeIds: [],
      })
      .expect(201);

    const id = Number(created.body.id);
    const detail = await agent.get(`/api/appointments/${id}`).expect(200);

    expect(detail.body.startTime).toBe("09:30:00");
    expect(detail.body.endDate ?? null).toBeNull();
    expect(detail.body.endTime ?? null).toBeNull();
  });

  it("UC 01/02 happy+negative: update project/customer projection and overlap rollback", async () => {
    const agent = await loginAdminAgent(app);
    const a = await createProjectFixture("UC01-02-A");
    const b = await createProjectFixture("UC01-02-B");
    const employee = await createEmployeeFixture("UC01-02-E");

    const appt = await createAppointmentFixture({ projectId: a.project.id, startDate: "2099-10-02", employeeIds: [] });
    const apptVersion = await getVersionFromApi(appt.id);

    await agent
      .patch(`/api/appointments/${appt.id}`)
      .send({
        version: apptVersion,
        projectId: b.project.id,
        startDate: "2099-10-02",
        employeeIds: [],
      })
      .expect(200);

    const calendar = await agent.get("/api/calendar/appointments?fromDate=2099-10-01&toDate=2099-10-31&detail=full").expect(200);
    const row = (calendar.body as Array<{ id: number; projectId: number; customer: { id: number } }>).find((entry) => entry.id === appt.id);
    expect(row?.projectId).toBe(b.project.id);
    expect(row?.customer.id).toBe(b.customer.id);

    await createAppointmentFixture({ projectId: b.project.id, startDate: "2099-10-02", employeeIds: [employee.id] });
    const beforeEmployees = await getAppointmentEmployeeIds(appt.id);
    const staleVersion = await getVersionFromApi(appt.id);
    const conflict = await agent
      .patch(`/api/appointments/${appt.id}`)
      .send({
        version: staleVersion,
        projectId: b.project.id,
        startDate: "2099-10-02",
        employeeIds: [employee.id],
      });
    expect(conflict.status).toBe(409);
    expectConflictPayloadContainsEmployees(conflict.body, [{ id: employee.id }]);
    expect(await getAppointmentEmployeeIds(appt.id)).toEqual(beforeEmployees);
  });

  it("UC 01/02 rule: overlap uses all-day category and timed start hour", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("UC01-02-TIME");
    const employee = await createEmployeeFixture("UC01-02-TIME-E");

    await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-10-02",
      employeeIds: [employee.id],
    });

    const mixedAllowed = await agent
      .post("/api/appointments")
      .send({
        projectId: project.id,
        startDate: "2099-10-02",
        startTime: "10:00:00",
        employeeIds: [employee.id],
      });
    expect(mixedAllowed.status).toBe(201);

    await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-10-03",
      startTime: "10:15:00",
      employeeIds: [employee.id],
    });

    const sameHourBlocked = await agent
      .post("/api/appointments")
      .send({
        projectId: project.id,
        startDate: "2099-10-03",
        startTime: "10:45:00",
        employeeIds: [employee.id],
      });
    expect(sameHourBlocked.status).toBe(409);
    expectConflictPayloadContainsEmployees(sameHourBlocked.body, [{ id: employee.id }]);

    const otherHourAllowed = await agent
      .post("/api/appointments")
      .send({
        projectId: project.id,
        startDate: "2099-10-03",
        startTime: "11:00:00",
        employeeIds: [employee.id],
      });
    expect(otherHourAllowed.status).toBe(201);
  });

  it("UC 01/03 happy+negative: move keeps time and blocks historical move", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("UC01-03");
    const appt = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-10-03",
      startTime: "09:30:00",
      employeeIds: [],
    });
    const version = await getVersionFromApi(appt.id);

    const moved = await agent
      .patch(`/api/appointments/${appt.id}`)
      .send({
        version,
        projectId: project.id,
        startDate: "2099-10-08",
        startTime: "09:30:00",
        employeeIds: [],
      })
      .expect(200);
    expect(moved.body.startTime).toBe("09:30:00");

    const detail = await agent.get(`/api/appointments/${appt.id}`).expect(200);
    expect(detail.body.startDate).toBe("2099-10-08");

    const historical = await agent
      .patch(`/api/appointments/${appt.id}`)
      .send({
        version: detail.body.version,
        projectId: project.id,
        startDate: "2000-01-01",
        startTime: "09:30:00",
        employeeIds: [],
      });
    expect([403, 409]).toContain(historical.status);
    const unchanged = await agent.get(`/api/appointments/${appt.id}`).expect(200);
    expect(unchanged.body.startDate).toBe("2099-10-08");
  });

  it("UC 01/04 happy+negative: delete clears join and stale version keeps state", async () => {
    const agent = await loginAdminAgent(app);
    const { customer, project } = await createProjectFixture("UC01-04");
    const employeeA = await createEmployeeFixture("UC01-04-A");
    const employeeB = await createEmployeeFixture("UC01-04-B");
    const tour = await createTourFixture("#224488");
    await assignEmployeesToTourFixture(tour.id, [employeeA, employeeB]);

    const appt = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-10-04",
      tourId: tour.id,
      employeeIds: [employeeA.id, employeeB.id],
    });
    const beforeJoin = await getAppointmentEmployeeIds(appt.id);
    expect(beforeJoin).toEqual([employeeA.id, employeeB.id]);

    const stale = await agent.delete(`/api/appointments/${appt.id}`).send({ version: 1_000_000 });
    expect(stale.status).toBe(409);
    expect(await getAppointmentEmployeeIds(appt.id)).toEqual(beforeJoin);

    const version = await getVersionFromApi(appt.id);
    await agent.delete(`/api/appointments/${appt.id}`).send({ version }).expect(204);

    await agent.get(`/api/appointments/${appt.id}`).expect(404);
    expect(await getAppointmentEmployeeIds(appt.id)).toEqual([]);

    const projectIds = await listIds(`/api/projects/${project.id}/appointments?fromDate=1900-01-01`);
    expect(projectIds.includes(appt.id)).toBe(false);
    const customerIds = await listIds(`/api/customers/${customer.id}/appointments?scope=all`);
    expect(customerIds.includes(appt.id)).toBe(false);
    const calendar = await listIds("/api/calendar/appointments?fromDate=2099-10-01&toDate=2099-10-31");
    expect(calendar.includes(appt.id)).toBe(false);
  });

  it("UC 01/05 + UC 01/06: tour assign/replace and remove keep join rules", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("UC01-05-06");
    const oldEmployee = await createEmployeeFixture("OLD");
    const newEmployeeA = await createEmployeeFixture("NEW-A");
    const newEmployeeB = await createEmployeeFixture("NEW-B");
    const tour = await createTourFixture("#669933");
    await assignEmployeesToTourFixture(tour.id, [newEmployeeA, newEmployeeB]);

    const appt = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-10-05",
      employeeIds: [oldEmployee.id],
    });

    const version1 = await getVersionFromApi(appt.id);
    await agent
      .patch(`/api/appointments/${appt.id}`)
      .send({
        version: version1,
        projectId: project.id,
        startDate: "2099-10-05",
        tourId: tour.id,
        employeeIds: [newEmployeeA.id, newEmployeeB.id],
      })
      .expect(200);
    expect(await getAppointmentEmployeeIds(appt.id)).toEqual([newEmployeeA.id, newEmployeeB.id]);

    const version2 = await getVersionFromApi(appt.id);
    await agent
      .patch(`/api/appointments/${appt.id}`)
      .send({
        version: version2,
        projectId: project.id,
        startDate: "2099-10-05",
        tourId: null,
        employeeIds: [newEmployeeA.id, newEmployeeB.id],
      })
      .expect(200);
    expect(await getAppointmentEmployeeIds(appt.id)).toEqual([newEmployeeA.id, newEmployeeB.id]);
    const row = await getAppointmentRow(appt.id);
    expect(row?.tourId ?? null).toBeNull();
  });

  it("UC 01/05 negative: tour assignment overlap does not partially persist", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("UC01-05-NEG");
    const blocker = await createEmployeeFixture("BLOCK");
    const companion = await createEmployeeFixture("COMP");
    const old = await createEmployeeFixture("OLD");
    const tour = await createTourFixture("#777777");
    await assignEmployeesToTourFixture(tour.id, [blocker, companion]);

    await createAppointmentFixture({ projectId: project.id, startDate: "2099-10-06", employeeIds: [blocker.id] });
    const appt = await createAppointmentFixture({ projectId: project.id, startDate: "2099-10-06", employeeIds: [old.id] });

    const beforeTour = (await getAppointmentRow(appt.id))?.tourId ?? null;
    const beforeJoin = await getAppointmentEmployeeIds(appt.id);
    const version = await getVersionFromApi(appt.id);

    const response = await agent
      .patch(`/api/appointments/${appt.id}`)
      .send({
        version,
        projectId: project.id,
        startDate: "2099-10-06",
        tourId: tour.id,
        employeeIds: [blocker.id, companion.id],
      });
    expect(response.status).toBe(409);
    expect((await getAppointmentRow(appt.id))?.tourId ?? null).toBe(beforeTour);
    expect(await getAppointmentEmployeeIds(appt.id)).toEqual(beforeJoin);
  });

  it("UC 01/07 + UC 01/08 + UC 01/09 + UC 01/16: team add, manual add, remove and no duplicates", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("UC01-07-08-09-16");
    const employeeA = await createEmployeeFixture("A");
    const employeeB = await createEmployeeFixture("B");
    const employeeC = await createEmployeeFixture("C");
    const team = await createTeamFixture("#0055aa");
    await assignEmployeesToTeamFixture(team.id, [employeeB, employeeC]);

    const appt = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-10-07",
      employeeIds: [employeeA.id],
    });

    const version1 = await getVersionFromApi(appt.id);
    await agent
      .patch(`/api/appointments/${appt.id}`)
      .send({
        version: version1,
        projectId: project.id,
        startDate: "2099-10-07",
        employeeIds: [employeeA.id, employeeB.id, employeeC.id],
      })
      .expect(200);
    expect(await getAppointmentEmployeeIds(appt.id)).toEqual([employeeA.id, employeeB.id, employeeC.id]);

    const version2 = await getVersionFromApi(appt.id);
    await agent
      .patch(`/api/appointments/${appt.id}`)
      .send({
        version: version2,
        projectId: project.id,
        startDate: "2099-10-07",
        employeeIds: [employeeA.id, employeeB.id, employeeC.id, employeeC.id],
      })
      .expect(200);
    expect(await getAppointmentEmployeeIds(appt.id)).toEqual([employeeA.id, employeeB.id, employeeC.id]);

    const version3 = await getVersionFromApi(appt.id);
    await agent
      .patch(`/api/appointments/${appt.id}`)
      .send({
        version: version3,
        projectId: project.id,
        startDate: "2099-10-07",
        employeeIds: [employeeB.id, employeeC.id],
      })
      .expect(200);
    expect(await getAppointmentEmployeeIds(appt.id)).toEqual([employeeB.id, employeeC.id]);
    await assertNoDuplicateAppointmentEmployeePairs();
  });

  it("UC 01/07 negative: team style assignment overlap is blocked atomically", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("UC01-07-NEG");
    const blocked = await createEmployeeFixture("BLOCKED");
    const free = await createEmployeeFixture("FREE");
    const existing = await createAppointmentFixture({ projectId: project.id, startDate: "2099-10-08", employeeIds: [] });
    await createAppointmentFixture({ projectId: project.id, startDate: "2099-10-08", employeeIds: [blocked.id] });

    const before = await getAppointmentEmployeeIds(existing.id);
    const version = await getVersionFromApi(existing.id);
    const res = await agent
      .patch(`/api/appointments/${existing.id}`)
      .send({
        version,
        projectId: project.id,
        startDate: "2099-10-08",
        employeeIds: [blocked.id, free.id],
      });
    expect(res.status).toBe(409);
    expectConflictPayloadContainsEmployees(res.body, [{ id: blocked.id }]);
    expect(await getAppointmentEmployeeIds(existing.id)).toEqual(before);
  });

  it("UC 01/10 happy+negative: cross-view consistency and blocked write keeps all views stable", async () => {
    const agent = await loginAdminAgent(app);
    const { customer, project } = await createProjectFixture("UC01-10");
    const employee = await createEmployeeFixture("VIEWS");
    const blockedEmployee = await createEmployeeFixture("VIEWS-BLOCK");
    const tour = await createTourFixture("#123abc");
    await assignEmployeesToTourFixture(tour.id, [employee]);
    await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-10-09",
      employeeIds: [blockedEmployee.id],
    });

    const appt = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-10-09",
      tourId: tour.id,
      employeeIds: [employee.id],
    });

    const projectBefore = await listIds(`/api/projects/${project.id}/appointments?fromDate=1900-01-01`);
    const customerBefore = await listIds(`/api/customers/${customer.id}/appointments?scope=all`);
    const employeeBefore = await listIds(`/api/employees/${employee.id}/appointments?scope=all`);
    const tourBefore = await listIds(`/api/tours/${tour.id}/current-appointments?fromDate=1900-01-01`);
    const calendarBefore = await listIds("/api/calendar/appointments?fromDate=2099-10-01&toDate=2099-10-31");
    expect(projectBefore).toContain(appt.id);
    expect(customerBefore).toContain(appt.id);
    expect(employeeBefore).toContain(appt.id);
    expect(tourBefore).toContain(appt.id);
    expect(calendarBefore).toContain(appt.id);

    const version = await getVersionFromApi(appt.id);
    const blocked = await agent
      .patch(`/api/appointments/${appt.id}`)
      .send({
        version,
        projectId: project.id,
        startDate: "2099-10-09",
        tourId: tour.id,
        employeeIds: [employee.id, blockedEmployee.id],
      });
    expect(blocked.status).toBe(409);

    expect(await listIds(`/api/projects/${project.id}/appointments?fromDate=1900-01-01`)).toEqual(projectBefore);
    expect(await listIds(`/api/customers/${customer.id}/appointments?scope=all`)).toEqual(customerBefore);
    expect(await listIds(`/api/employees/${employee.id}/appointments?scope=all`)).toEqual(employeeBefore);
    expect(await listIds(`/api/tours/${tour.id}/current-appointments?fromDate=1900-01-01`)).toEqual(tourBefore);
    expect(await listIds("/api/calendar/appointments?fromDate=2099-10-01&toDate=2099-10-31")).toEqual(calendarBefore);
  });

  it("UC 01/11 happy+negative: denormalized names refresh and stale version update does not leak", async () => {
    const agent = await loginAdminAgent(app);
    const { customer, project } = await createProjectFixture("UC01-11");
    const appt = await createAppointmentFixture({ projectId: project.id, startDate: "2099-10-10", employeeIds: [] });

    const before = await agent.get("/api/calendar/appointments?fromDate=2099-10-01&toDate=2099-10-31").expect(200);
    const beforeRow = (before.body as Array<{ id: number; projectName: string; customer: { fullName: string | null } }>).find((r) => r.id === appt.id);
    expect(beforeRow).toBeDefined();

    await agent.patch(`/api/projects/${project.id}`).send({ version: project.version, name: "UC01-11-PROJECT-NEW" }).expect(200);
    const customerPatch = await agent
      .patch(`/api/customers/${customer.id}`)
      .send({ version: customer.version, firstName: "Neu", lastName: "Name" })
      .expect(200);
    const staleCustomerVersion = Number(customerPatch.body.version) - 1;
    const stale = await agent.patch(`/api/customers/${customer.id}`).send({ version: staleCustomerVersion, firstName: "X" });
    expect(stale.status).toBe(409);

    const after = await agent.get("/api/calendar/appointments?fromDate=2099-10-01&toDate=2099-10-31").expect(200);
    const afterRow = (after.body as Array<{ id: number; projectName: string; customer: { fullName: string | null } }>).find((r) => r.id === appt.id);
    expect(afterRow?.projectName.includes("UC01-11-PROJECT-NEW")).toBe(true);
    expect(afterRow?.customer.fullName).toBe("Name, Neu");
  });

  it("UC 01/12 happy+negative: list filters and invalid date range", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("UC01-12");
    const employeeA = await createEmployeeFixture("UC01-12-A");
    const employeeB = await createEmployeeFixture("UC01-12-B");
    const tour = await createTourFixture("#11aa11");
    await createAppointmentFixture({ projectId: project.id, startDate: "2099-10-11", startTime: null, employeeIds: [employeeA.id], tourId: tour.id });
    await createAppointmentFixture({ projectId: project.id, startDate: "2099-10-12", startTime: "12:00:00", employeeIds: [employeeA.id, employeeB.id] });

    const byProject = await agent.get(`/api/appointments/list?projectId=${project.id}&page=1&pageSize=50`).expect(200);
    expect((byProject.body.items as Array<unknown>).length).toBeGreaterThanOrEqual(2);

    const byTour = await agent.get(`/api/appointments/list?tourId=${tour.id}&page=1&pageSize=50`).expect(200);
    expect((byTour.body.items as Array<{ tourId: number | null }>).every((row) => row.tourId === tour.id)).toBe(true);

    const byEmployee = await agent.get(`/api/appointments/list?employeeId=${employeeB.id}&page=1&pageSize=50`).expect(200);
    expect((byEmployee.body.items as Array<{ employees: Array<{ id: number }> }>).every((row) => row.employees.some((e) => e.id === employeeB.id))).toBe(true);

    const allDayOnly = await agent.get("/api/appointments/list?allDayOnly=true&page=1&pageSize=50").expect(200);
    expect((allDayOnly.body.items as Array<{ allDay: boolean }>).every((row) => row.allDay)).toBe(true);

    const invalid = await agent.get("/api/appointments/list?dateFrom=2099-10-20&dateTo=2099-10-01&page=1&pageSize=10");
    expect(invalid.status).toBe(422);
  });

  it("UC 01/13 happy: color projection provides tourColor or null", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("UC01-13");
    const tour = await createTourFixture("#c0ffee");
    await createAppointmentFixture({ projectId: project.id, startDate: "2099-10-13", tourId: tour.id, employeeIds: [] });
    await createAppointmentFixture({ projectId: project.id, startDate: "2099-10-14", tourId: null, employeeIds: [] });

    const response = await agent.get("/api/calendar/appointments?fromDate=2099-10-01&toDate=2099-10-31").expect(200);
    const rows = response.body as Array<{ startDate: string; tourId: number | null; tourColor: string | null }>;
    const withTour = rows.find((row) => row.startDate === "2099-10-13");
    const withoutTour = rows.find((row) => row.startDate === "2099-10-14");
    expect(withTour?.tourId).toBe(tour.id);
    expect(withTour?.tourColor).toBe("#c0ffee");
    expect(withoutTour?.tourId ?? null).toBeNull();
    expect(withoutTour?.tourColor ?? null).toBeNull();
  });

  it("UC 01/13 rule: missing tour color uses server default in projection contract", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("UC01-13-DEFAULT");

    const tour = await agent.post("/api/tours").send({}).expect(201);
    expect(tour.body.color).toBe("#2563eb");

    await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-10-19",
      tourId: Number(tour.body.id),
      employeeIds: [],
    });

    const response = await agent
      .get("/api/calendar/appointments?fromDate=2099-10-01&toDate=2099-10-31")
      .expect(200);
    const rows = response.body as Array<{ startDate: string; tourId: number | null; tourColor: string | null }>;
    const withDefaultTour = rows.find((row) => row.startDate === "2099-10-19");
    expect(withDefaultTour?.tourId).toBe(Number(tour.body.id));
    expect(withDefaultTour?.tourColor).toBe("#2563eb");
  });

  it("UC 01/14 happy+negative: historical create and historical time are blocked", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("UC01-14");

    const historicalCreate = await agent.post("/api/appointments").send({
      projectId: project.id,
      startDate: "2000-01-01",
      employeeIds: [],
    });
    expect(historicalCreate.status).toBe(409);

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const historicalTime = await agent.post("/api/appointments").send({
      projectId: project.id,
      startDate: today,
      startTime: "00:00:00",
      employeeIds: [],
    });
    expect([409, 422]).toContain(historicalTime.status);
  });

  it("UC 01/14 rule: historical delete is blocked for ADMIN", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("UC01-14-DEL");

    const created = await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-10-20",
      employeeIds: [],
    });
    expect(created).toBeTruthy();

    await db
      .update(appointments)
      .set({ startDate: new Date("2000-01-01T00:00:00") })
      .where(eq(appointments.id, created!.id));

    const version = await getVersionFromApi(created!.id);
    const blocked = await agent
      .delete(`/api/appointments/${created!.id}`)
      .send({ version });
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe("PAST_APPOINTMENT_READONLY");

    await agent.get(`/api/appointments/${created!.id}`).expect(200);
  });

  it("UC 01/15 happy+negative: optimistic locking success and stale conflict", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("UC01-15");
    const appt = await createAppointmentFixture({ projectId: project.id, startDate: "2099-10-15", employeeIds: [] });

    const v1 = await getVersionFromApi(appt.id);
    const ok = await agent
      .patch(`/api/appointments/${appt.id}`)
      .send({
        version: v1,
        projectId: project.id,
        startDate: "2099-10-16",
        employeeIds: [],
      })
      .expect(200);
    expect(ok.body.version).toBe(v1 + 1);

    const stale = await agent
      .patch(`/api/appointments/${appt.id}`)
      .send({
        version: v1,
        projectId: project.id,
        startDate: "2099-10-17",
        employeeIds: [],
      });
    expect(stale.status).toBe(409);
    expect(stale.body.code).toBe("VERSION_CONFLICT");
  });

  it("UC 01/16 negative: repeated assignment operations keep join deterministic and duplicate-free", async () => {
    const agent = await loginAdminAgent(app);
    const { project } = await createProjectFixture("UC01-16");
    const employeeA = await createEmployeeFixture("UC01-16-A");
    const employeeB = await createEmployeeFixture("UC01-16-B");

    const appt = await createAppointmentFixture({ projectId: project.id, startDate: "2099-10-18", employeeIds: [employeeA.id] });

    const v1 = await getVersionFromApi(appt.id);
    await agent
      .patch(`/api/appointments/${appt.id}`)
      .send({
        version: v1,
        projectId: project.id,
        startDate: "2099-10-18",
        employeeIds: [employeeA.id, employeeA.id, employeeB.id],
      })
      .expect(200);

    const v2 = await getVersionFromApi(appt.id);
    await agent
      .patch(`/api/appointments/${appt.id}`)
      .send({
        version: v2,
        projectId: project.id,
        startDate: "2099-10-18",
        employeeIds: [employeeA.id, employeeB.id, employeeB.id],
      })
      .expect(200);

    expect(await getAppointmentEmployeeIds(appt.id)).toEqual([employeeA.id, employeeB.id]);
    await assertNoDuplicateAppointmentEmployeePairs();
  });
});
