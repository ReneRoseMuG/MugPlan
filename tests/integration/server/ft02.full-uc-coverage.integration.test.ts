/**
 * Test Scope:
 *
 * Feature: FT02 - Projekte
 * Use Case: UC 02/01 bis UC 02/20 (Hauptsuite)
 *
 * Abgedeckte Regeln:
 * - Kernverhalten fuer Projekt create/update/delete, status-join, notes und Projektionen.
 * - Optimistic locking fuer Projektupdates.
 * - Join-Cleanup bei Projektloeschung.
 * - Cross-View Nachweis: Detail-Aggregat ist konsistent zu den dedizierten Projekt-Endpoints.
 *
 * Fehlerfaelle:
 * - stale version bei Projektupdate.
 * - Loeschkonflikt bei vorhandenen Terminen.
 * - stale denormalisierte Projektdaten in abhaengigen Appointment-Projektionen.
 *
 * Ziel:
 * FT02-UC-Traceability in einer zentralen Integrationssuite herstellen.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import * as customersService from "../../../server/services/customersService";
import * as projectsService from "../../../server/services/projectsService";
import * as appointmentsService from "../../../server/services/appointmentsService";
import { db } from "../../../server/db";
import { projectProjectStatus } from "../../../shared/schema";

let app: express.Express;
let seq = 1;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ username: "test-admin", password: "test-admin-password" })
    .expect(200);
  return agent;
}

async function createCustomer(prefix: string) {
  const token = `${prefix}-${Date.now()}-${seq++}`;
  return customersService.createCustomer({
    customerNumber: token,
    firstName: "FT02",
    lastName: token,
    fullName: `${token}, FT02`,
    company: null,
    email: null,
    phone: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    version: 1,
  });
}

async function createProject(customerId: number, name: string) {
  return projectsService.createProject({
    customerId,
    name,
    descriptionMd: null,
    version: 1,
  });
}

function listIds(payload: unknown): number[] {
  return (payload as Array<{ id: number }>).map((item) => item.id).sort((a, b) => a - b);
}

describe("FT02 integration: full uc coverage", () => {
  it("UC 02/01 create project happy and basic validation negative", async () => {
    const admin = await loginAdminAgent();
    const customer = await createCustomer("UC0201");

    const created = await admin
      .post("/api/projects")
      .send({ customerId: customer.id, name: "UC02-01 Project", descriptionMd: null })
      .expect(201);

    expect(created.body.customerId).toBe(customer.id);
    expect(Number.isInteger(created.body.version)).toBe(true);

    await admin
      .post("/api/projects")
      .send({ name: "Missing customer" })
      .expect(422);
  });

  it("UC 02/03: create project rejects inactive customer assignment", async () => {
    const admin = await loginAdminAgent();
    const customer = await createCustomer("UC0203");

    await admin
      .patch(`/api/customers/${customer.id}`)
      .send({ isActive: false, version: customer.version })
      .expect(200);

    await admin
      .post("/api/projects")
      .send({ customerId: customer.id, name: "UC02-03 Inactive Customer", descriptionMd: null })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("INACTIVE_ENTITY_ASSIGNMENT");
      });
  });

  it("UC 02/02 project update with optimistic lock conflict", async () => {
    const admin = await loginAdminAgent();
    const customer = await createCustomer("UC0202");
    const project = await createProject(customer.id, "UC02-02 Base");

    const updated = await admin
      .patch(`/api/projects/${project.id}`)
      .send({ version: project.version, name: "UC02-02 Updated" })
      .expect(200);

    await admin
      .patch(`/api/projects/${project.id}`)
      .send({ version: project.version, name: "UC02-02 Stale" })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("VERSION_CONFLICT");
      });

    expect(updated.body.version).toBeGreaterThan(project.version);
  });

  it("UC 02/04b: project customer reassignment to active customer succeeds", async () => {
    const admin = await loginAdminAgent();
    const sourceCustomer = await createCustomer("UC0204B-A");
    const targetCustomer = await createCustomer("UC0204B-B");
    const project = await createProject(sourceCustomer.id, "UC02-04b Base");

    const updated = await admin
      .patch(`/api/projects/${project.id}`)
      .send({ version: project.version, customerId: targetCustomer.id })
      .expect(200);

    expect(updated.body.customerId).toBe(targetCustomer.id);

    const detail = await admin.get(`/api/projects/${project.id}`).expect(200);
    expect(detail.body.project.customerId).toBe(targetCustomer.id);
  });

  it("UC 02/04c: project customer reassignment to inactive customer is blocked", async () => {
    const admin = await loginAdminAgent();
    const sourceCustomer = await createCustomer("UC0204C-A");
    const inactiveTargetCustomer = await createCustomer("UC0204C-B");
    const project = await createProject(sourceCustomer.id, "UC02-04c Base");

    await admin
      .patch(`/api/customers/${inactiveTargetCustomer.id}`)
      .send({ isActive: false, version: inactiveTargetCustomer.version })
      .expect(200);

    await admin
      .patch(`/api/projects/${project.id}`)
      .send({ version: project.version, customerId: inactiveTargetCustomer.id })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("INACTIVE_ENTITY_ASSIGNMENT");
      });
  });

  it("UC 02/04 status relation add/remove with inactive block", async () => {
    const admin = await loginAdminAgent();
    const customer = await createCustomer("UC0204");
    const project = await createProject(customer.id, "UC02-04");

    const activeStatus = await admin
      .post("/api/project-status")
      .send({ title: `UC0204-Active-${Date.now()}-${seq++}`, color: "#16a34a", description: null, sortOrder: 1 })
      .expect(201);

    await admin
      .post(`/api/projects/${project.id}/statuses`)
      .send({ statusId: activeStatus.body.id, expectedVersion: 0 })
      .expect(201);

    await admin
      .delete(`/api/projects/${project.id}/statuses/${activeStatus.body.id}`)
      .send({ version: 1 })
      .expect(204);

    const inactiveStatus = await admin
      .post("/api/project-status")
      .send({ title: `UC0204-Inactive-${Date.now()}-${seq++}`, color: "#64748b", description: null, sortOrder: 2 })
      .expect(201);

    await admin
      .patch(`/api/project-status/${inactiveStatus.body.id}/active`)
      .send({ isActive: false, version: inactiveStatus.body.version })
      .expect(200);

    await admin
      .post(`/api/projects/${project.id}/statuses`)
      .send({ statusId: inactiveStatus.body.id, expectedVersion: 0 })
      .expect(409);
  });

  it("UC 02/05 project notes create/list/delete", async () => {
    const admin = await loginAdminAgent();
    const customer = await createCustomer("UC0205");
    const project = await createProject(customer.id, "UC02-05");

    const createdNote = await admin
      .post(`/api/projects/${project.id}/notes`)
      .send({ title: "UC02 Note", body: "<p>Body</p>" })
      .expect(201);

    const noteId = Number(createdNote.body.id);
    expect(Number.isInteger(noteId)).toBe(true);

    const listed = await admin.get(`/api/projects/${project.id}/notes`).expect(200);
    expect((listed.body as Array<{ id: number }>).some((row) => row.id === noteId)).toBe(true);

    await admin
      .delete(`/api/projects/${project.id}/notes/${noteId}`)
      .send({ version: createdNote.body.version })
      .expect(204);
  });

  it("UC 02/06 invariant surface: project attachment delete endpoint is disabled", async () => {
    const admin = await loginAdminAgent();
    await admin
      .delete("/api/project-attachments/123456")
      .expect(405)
      .expect((res) => {
        expect(res.body.message).toBe("Attachment deletion is disabled");
      });
  });

  it("UC 02/08 delete rules: block when appointments exist and allow when empty", async () => {
    const admin = await loginAdminAgent();
    const customer = await createCustomer("UC0208");

    const blockedProject = await createProject(customer.id, "UC02-08 Blocked");
    await appointmentsService.createAppointment({
      projectId: blockedProject.id,
      startDate: "2099-12-20",
      employeeIds: [],
    });

    await admin
      .delete(`/api/projects/${blockedProject.id}`)
      .send({ version: blockedProject.version })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("BUSINESS_CONFLICT");
      });

    const deletableProject = await createProject(customer.id, "UC02-08 Deletable");
    await admin
      .delete(`/api/projects/${deletableProject.id}`)
      .send({ version: deletableProject.version })
      .expect(204);
  });

  it("UC 02/09 + UC 02/13: project update is reflected in calendar projection", async () => {
    const admin = await loginAdminAgent();
    const customer = await createCustomer("UC0209");
    const project = await createProject(customer.id, "UC02-09 Original");

    const appointment = await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-12-21",
      employeeIds: [],
    });

    await admin
      .patch(`/api/projects/${project.id}`)
      .send({ version: project.version, name: "UC02-09 Changed" })
      .expect(200);

    const calendar = await admin
      .get("/api/calendar/appointments?fromDate=2099-12-01&toDate=2099-12-31")
      .expect(200);

    const row = (calendar.body as Array<{ id: number; projectName: string }>).find((item) => item.id === appointment.id);
    expect(row).toBeDefined();
    expect(row?.projectName.includes("UC02-09 Changed")).toBe(true);
  });

  it("UC 02/10: project status projection appears in appointments payload", async () => {
    const admin = await loginAdminAgent();
    const customer = await createCustomer("UC0210");
    const project = await createProject(customer.id, "UC02-10");

    await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-12-22",
      employeeIds: [],
    });

    const status = await admin
      .post("/api/project-status")
      .send({ title: `UC0210-Status-${Date.now()}-${seq++}`, color: "#3344cc", description: null, sortOrder: 1 })
      .expect(201);

    await admin
      .post(`/api/projects/${project.id}/statuses`)
      .send({ statusId: status.body.id, expectedVersion: 0 })
      .expect(201);

    const response = await admin
      .get(`/api/customers/${customer.id}/appointments?scope=all`)
      .expect(200);

    const item = (response.body as Array<{ projectId: number; projectStatuses: Array<{ id: number }> }>).find(
      (row) => row.projectId === project.id,
    );

    expect(item).toBeDefined();
    expect(item?.projectStatuses.some((entry) => entry.id === status.body.id)).toBe(true);
  });

  it("UC 02/11 + UC 02/15: deleting project removes status join relations", async () => {
    const admin = await loginAdminAgent();
    const customer = await createCustomer("UC0211");
    const project = await createProject(customer.id, "UC02-11");

    const status = await admin
      .post("/api/project-status")
      .send({ title: `UC0211-Status-${Date.now()}-${seq++}`, color: "#882299", description: null, sortOrder: 1 })
      .expect(201);

    await admin
      .post(`/api/projects/${project.id}/statuses`)
      .send({ statusId: status.body.id, expectedVersion: 0 })
      .expect(201);

    const beforeRows = await db
      .select()
      .from(projectProjectStatus)
      .where(and(eq(projectProjectStatus.projectId, project.id), eq(projectProjectStatus.projectStatusId, status.body.id)));
    expect(beforeRows).toHaveLength(1);

    await admin
      .delete(`/api/projects/${project.id}`)
      .send({ version: project.version })
      .expect(204);

    const afterRows = await db
      .select()
      .from(projectProjectStatus)
      .where(and(eq(projectProjectStatus.projectId, project.id), eq(projectProjectStatus.projectStatusId, status.body.id)));
    expect(afterRows).toHaveLength(0);

    await admin.get(`/api/projects/${project.id}`).expect(404);
  });

  it("UC 02/14: two clients with same version cause stale conflict", async () => {
    const a = await loginAdminAgent();
    const b = await loginAdminAgent();
    const customer = await createCustomer("UC0214");
    const project = await createProject(customer.id, "UC02-14");

    const [first, second] = await Promise.all([
      a.patch(`/api/projects/${project.id}`).send({ version: project.version, name: "UC02-14 A" }),
      b.patch(`/api/projects/${project.id}`).send({ version: project.version, name: "UC02-14 B" }),
    ]);

    const statuses = [first.status, second.status].sort((x, y) => x - y);
    expect(statuses).toEqual([200, 409]);
  });

  it("UC 02/16: assigning non-existing customer should be rejected", async () => {
    const admin = await loginAdminAgent();

    await admin
      .post("/api/projects")
      .send({ customerId: 999999999, name: "UC02-16 Invalid", descriptionMd: null })
      .expect(422);
  });

  it("UC 02/12: project detail aggregate uses the same source-of-truth as dedicated project endpoints", async () => {
    const admin = await loginAdminAgent();
    const customer = await createCustomer("UC0212");
    const project = await createProject(customer.id, "UC02-12");

    const note = await admin
      .post(`/api/projects/${project.id}/notes`)
      .send({ title: "UC02-12 Note", body: "<p>UC02/12</p>" })
      .expect(201);

    const status = await admin
      .post("/api/project-status")
      .send({ title: `UC0212-Status-${Date.now()}-${seq++}`, color: "#0f766e", description: null, sortOrder: 1 })
      .expect(201);

    await admin
      .post(`/api/projects/${project.id}/statuses`)
      .send({ statusId: status.body.id, expectedVersion: 0 })
      .expect(201);

    await admin
      .post(`/api/projects/${project.id}/attachments`)
      .attach("file", Buffer.from("UC0212 attachment"), "uc0212.txt")
      .expect(201);

    const appointment = await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-12-23",
      employeeIds: [],
    });
    expect(appointment?.id).toBeDefined();
    expect(note.body.id).toBeDefined();

    const [detail, statuses, notes, attachments, appointments] = await Promise.all([
      admin.get(`/api/projects/${project.id}`).expect(200),
      admin.get(`/api/projects/${project.id}/statuses`).expect(200),
      admin.get(`/api/projects/${project.id}/notes`).expect(200),
      admin.get(`/api/projects/${project.id}/attachments`).expect(200),
      admin.get(`/api/projects/${project.id}/appointments?fromDate=1900-01-01`).expect(200),
    ]);

    const detailBody = detail.body as {
      projectStatuses: Array<{ status: { id: number } }>;
      projectNotes: Array<{ id: number }>;
      projectAttachments: Array<{ id: number }>;
      projectAppointments: Array<{ id: number }>;
    };

    const detailStatusIds = detailBody.projectStatuses.map((entry) => entry.status.id).sort((a, b) => a - b);
    const endpointStatusIds = (statuses.body as Array<{ status: { id: number } }>)
      .map((entry) => entry.status.id)
      .sort((a, b) => a - b);

    expect(detailStatusIds).toEqual(endpointStatusIds);
    expect(listIds(detailBody.projectNotes)).toEqual(listIds(notes.body));
    expect(listIds(detailBody.projectAttachments)).toEqual(listIds(attachments.body));
    expect(listIds(detailBody.projectAppointments)).toEqual(listIds(appointments.body));
  });

  it("UC 02/19: project detail aggregate stays traceable after mutations across dedicated endpoints", async () => {
    const admin = await loginAdminAgent();
    const customer = await createCustomer("UC0219");
    const project = await createProject(customer.id, "UC02-19 Base");

    const status = await admin
      .post("/api/project-status")
      .send({ title: `UC0219-Status-${Date.now()}-${seq++}`, color: "#4338ca", description: null, sortOrder: 1 })
      .expect(201);

    const addStatus = await admin
      .post(`/api/projects/${project.id}/statuses`)
      .send({ statusId: status.body.id, expectedVersion: 0 })
      .expect(201);

    const note = await admin
      .post(`/api/projects/${project.id}/notes`)
      .send({ title: "UC02-19 Note", body: "<p>Before mutation</p>" })
      .expect(201);

    const createdAppointment = await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-12-24",
      employeeIds: [],
    });
    expect(createdAppointment?.id).toBeDefined();

    await admin
      .patch(`/api/projects/${project.id}`)
      .send({ version: project.version, name: "UC02-19 Changed" })
      .expect(200);

    await admin
      .delete(`/api/projects/${project.id}/notes/${note.body.id}`)
      .send({ version: note.body.version })
      .expect(204);

    await admin
      .delete(`/api/projects/${project.id}/statuses/${status.body.id}`)
      .send({ version: addStatus.body.relationVersion })
      .expect(204);

    const [detail, statuses, notes, appointments] = await Promise.all([
      admin.get(`/api/projects/${project.id}`).expect(200),
      admin.get(`/api/projects/${project.id}/statuses`).expect(200),
      admin.get(`/api/projects/${project.id}/notes`).expect(200),
      admin.get(`/api/projects/${project.id}/appointments?fromDate=1900-01-01`).expect(200),
    ]);

    const detailBody = detail.body as {
      project: { name: string };
      projectStatuses: Array<{ status: { id: number } }>;
      projectNotes: Array<{ id: number }>;
      projectAppointments: Array<{ id: number; projectName: string }>;
    };

    expect(detailBody.project.name.includes("UC02-19 Changed")).toBe(true);
    expect(detailBody.projectStatuses).toHaveLength(0);
    expect(detailBody.projectNotes).toHaveLength(0);
    expect(detailBody.projectAppointments.some((entry) => entry.id === createdAppointment?.id)).toBe(true);
    expect(detailBody.projectAppointments.every((entry) => entry.projectName.includes("UC02-19 Changed"))).toBe(true);

    const endpointStatusIds = (statuses.body as Array<{ status: { id: number } }>).map((entry) => entry.status.id);
    expect(endpointStatusIds).toEqual([]);
    expect(listIds(detailBody.projectNotes)).toEqual(listIds(notes.body));
    expect(listIds(detailBody.projectAppointments)).toEqual(listIds(appointments.body));
  });

  it("UC 02/20: denormalized refresh contract stays consistent across calendar and project appointment projections", async () => {
    const admin = await loginAdminAgent();
    const customer = await createCustomer("UC0220");
    const project = await createProject(customer.id, "UC02-20 Base");

    const appointment = await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-12-25",
      employeeIds: [],
    });

    const initialCalendar = await admin
      .get("/api/calendar/appointments?fromDate=2099-12-01&toDate=2099-12-31")
      .expect(200);
    const initialProjectAppointments = await admin
      .get(`/api/projects/${project.id}/appointments?fromDate=1900-01-01`)
      .expect(200);

    const initialCalendarRow = (initialCalendar.body as Array<{ id: number; projectVersion: number }>).find(
      (row) => row.id === appointment.id,
    );
    const initialProjectRow = (initialProjectAppointments.body as Array<{ id: number; projectVersion: number }>).find(
      (row) => row.id === appointment.id,
    );
    expect(initialCalendarRow?.projectVersion).toBe(project.version);
    expect(initialProjectRow?.projectVersion).toBe(project.version);

    const patched = await admin
      .patch(`/api/projects/${project.id}`)
      .send({ version: project.version, name: "UC02-20 Changed" })
      .expect(200);

    const [detail, refreshedCalendar, refreshedProjectAppointments] = await Promise.all([
      admin.get(`/api/projects/${project.id}`).expect(200),
      admin.get("/api/calendar/appointments?fromDate=2099-12-01&toDate=2099-12-31").expect(200),
      admin.get(`/api/projects/${project.id}/appointments?fromDate=1900-01-01`).expect(200),
    ]);

    const detailVersion = Number((detail.body as { project: { version: number } }).project.version);
    expect(detailVersion).toBe(Number(patched.body.version));

    const calendarRow = (
      refreshedCalendar.body as Array<{ id: number; projectName: string; projectVersion: number }>
    ).find((row) => row.id === appointment.id);
    const projectRow = (
      refreshedProjectAppointments.body as Array<{ id: number; projectName: string; projectVersion: number }>
    ).find((row) => row.id === appointment.id);

    expect(calendarRow).toBeDefined();
    expect(projectRow).toBeDefined();
    expect(calendarRow?.projectName.includes("UC02-20 Changed")).toBe(true);
    expect(projectRow?.projectName.includes("UC02-20 Changed")).toBe(true);
    expect(calendarRow?.projectVersion).toBe(detailVersion);
    expect(projectRow?.projectVersion).toBe(detailVersion);
  });
});
