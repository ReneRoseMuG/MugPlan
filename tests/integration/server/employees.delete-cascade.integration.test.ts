import fs from "fs";
import { and, eq } from "drizzle-orm";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { db } from "../../../server/db";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import {
  appointmentEmployees,
  appointments,
  employeeAttachments,
  employeeNotes,
  employeeTags,
  notes,
  tourWeekEmployees,
} from "../../../shared/schema";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import { nextDeterministicToken } from "../../helpers/deterministic";
import {
  createAppointmentFixture,
  createEmployeeFixture,
  createProjectFixture,
  createTagFixture,
  createTourFixture,
  getRelativeBerlinDate,
} from "../../helpers/testDataFactory";

let app: Awaited<ReturnType<typeof createApiTestApp>>;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function createDispatcherAgent(): Promise<SuperAgentTest> {
  const username = `employee-delete-dispatcher-${nextDeterministicToken("employee-delete-dispatcher")}`;
  const password = "employee-delete-dispatcher-password";
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "Delete",
    lastName: "Dispatcher",
    passwordHash: await hashPassword(password),
    roleCode: "DISPATCHER",
  });

  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username, password }).expect(200);
  return agent;
}

describe("FT05 integration: employee delete cascade", () => {
  it("allows admin delete while preserving appointments and deleting employee-owned notes and attachments", async () => {
    const admin = await loginAdminAgent(app);
    const employee = await createEmployeeFixture("FT05-DELETE-CASCADE");
    const project = await createProjectFixture({ prefix: "FT05-DELETE-CASCADE-PROJ" });
    const appointment = await createAppointmentFixture({
      projectId: project.id,
      startDate: getRelativeBerlinDate(4),
      employeeIds: [employee.id],
    });
    const tag = await createTagFixture("FT05-DELETE-CASCADE-TAG");
    await admin.post(`/api/employees/${employee.id}/tags`).send({ tagId: tag.id }).expect(201);

    const noteResponse = await admin
      .post(`/api/employees/${employee.id}/notes`)
      .send({
        title: "Mitarbeiterlöschung Notiz",
        body: "<p>Wird mit dem Mitarbeiter gelöscht.</p>",
        print: false,
      })
      .expect(201);
    const noteId = Number(noteResponse.body.id);

    const attachmentResponse = await admin
      .post(`/api/employees/${employee.id}/attachments`)
      .attach("file", Buffer.from("Mitarbeiterlöschung Anhang", "utf8"), "mitarbeiter-loeschung.txt")
      .expect(201);
    const attachmentId = Number(attachmentResponse.body.id);
    const attachmentRowsBefore = await db
      .select()
      .from(employeeAttachments)
      .where(eq(employeeAttachments.id, attachmentId));
    expect(attachmentRowsBefore).toHaveLength(1);
    expect(fs.existsSync(attachmentRowsBefore[0].storagePath)).toBe(true);

    const tour = await createTourFixture("#226688");
    await db.insert(tourWeekEmployees).values({
      tourId: tour.id,
      isoYear: 2099,
      isoWeek: 1,
      employeeId: employee.id,
    });

    await admin.delete(`/api/employees/${employee.id}`).send({ version: employee.version }).expect(204);

    await admin.get(`/api/employees/${employee.id}`).expect(404);
    await admin.get(`/api/appointments/${appointment.id}`).expect(200).expect(({ body }) => {
      expect(body.id).toBe(appointment.id);
      expect((body.employees as Array<{ id: number }>).map((entry) => entry.id)).not.toContain(employee.id);
    });

    await expect(db.select().from(appointments).where(eq(appointments.id, appointment.id))).resolves.toHaveLength(1);
    await expect(
      db
        .select()
        .from(appointmentEmployees)
        .where(and(eq(appointmentEmployees.appointmentId, appointment.id), eq(appointmentEmployees.employeeId, employee.id))),
    ).resolves.toHaveLength(0);
    await expect(db.select().from(employeeNotes).where(eq(employeeNotes.employeeId, employee.id))).resolves.toHaveLength(0);
    await expect(db.select().from(notes).where(eq(notes.id, noteId))).resolves.toHaveLength(0);
    await expect(db.select().from(employeeAttachments).where(eq(employeeAttachments.id, attachmentId))).resolves.toHaveLength(0);
    await expect(fs.existsSync(attachmentRowsBefore[0].storagePath)).toBe(false);
    await expect(db.select().from(employeeTags).where(eq(employeeTags.employeeId, employee.id))).resolves.toHaveLength(0);
    await expect(
      db.select().from(tourWeekEmployees).where(eq(tourWeekEmployees.employeeId, employee.id)),
    ).resolves.toHaveLength(0);
  });

  it("blocks non-admin delete and keeps the employee", async () => {
    const admin = await loginAdminAgent(app);
    const dispatcher = await createDispatcherAgent();
    const employee = await createEmployeeFixture("FT05-DELETE-FORBIDDEN");

    await dispatcher
      .delete(`/api/employees/${employee.id}`)
      .send({ version: employee.version })
      .expect(403)
      .expect(({ body }) => {
        expect(body.code).toBe("FORBIDDEN");
      });

    await admin.get(`/api/employees/${employee.id}`).expect(200);
  });

  it("returns VERSION_CONFLICT for stale employee delete versions", async () => {
    const admin = await loginAdminAgent(app);
    const employee = await createEmployeeFixture("FT05-DELETE-STALE");

    await admin
      .put(`/api/employees/${employee.id}`)
      .send({ firstName: "Updated", version: employee.version })
      .expect(200);

    await admin
      .delete(`/api/employees/${employee.id}`)
      .send({ version: employee.version })
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe("VERSION_CONFLICT");
      });

    await admin.get(`/api/employees/${employee.id}`).expect(200);
  });
});
