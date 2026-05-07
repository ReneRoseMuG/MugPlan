/**
 * Test Scope:
 *
 * Feature: FT05+/FT13 - Mitarbeiter-Notizen
 * Use Case: Mitarbeiter-Notizen lesen und im Mitarbeiterformular verwalten
 *
 * Abgedeckte Regeln:
 * - Mitarbeiter-Notizen können gelistet, angelegt und scoped gelöscht werden.
 * - Notiz-Create übernimmt Vorlagenfarbe und behält den Druck-Default auch im Mitarbeiterkontext.
 * - Allgemeine Notiz-Update- und Pin-Endpunkte wirken auf Mitarbeiter-Notizen.
 * - Leserrolle darf Mitarbeiter-Notizen nicht mutieren.
 *
 * Fehlerfälle:
 * - Unbekannter Mitarbeiter liefert 404.
 * - Stale Note-Version liefert 409 VERSION_CONFLICT beim Loeschen.
 * - Leserrolle wird fuer Schreibzugriffe mit 403 blockiert.
 *
 * Ziel:
 * Die neue Employee-Notes-API inklusive Join-Persistenz und Formular-CRUD end-to-end absichern.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { db } from "../../../server/db";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { createUser } from "../../../server/repositories/usersRepository";
import { registerRoutes } from "../../../server/routes";
import { hashPassword } from "../../../server/security/passwordHash";
import { employeeNotes, notes } from "@shared/schema";
import { nextDeterministicToken } from "../../helpers/deterministic";

let app: express.Express;
let employeeCounter = 0;

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
  await agent.post("/api/auth/login").send({ username: "test-admin", password: "test-admin-password" }).expect(200);
  return agent;
}

async function createReaderAgent(): Promise<SuperAgentTest> {
  const username = `employee-notes-reader-${nextDeterministicToken("employee-notes-reader")}`;
  const password = "employee-notes-reader-password";
  const passwordHash = await hashPassword(password);
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "Test",
    lastName: "Reader",
    passwordHash,
    roleCode: "READER",
  });

  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username, password }).expect(200);
  return agent;
}

async function createEmployee(admin: SuperAgentTest) {
  employeeCounter += 1;
  const response = await admin
    .post("/api/employees")
    .send({
      firstName: `Notes-${employeeCounter}`,
      lastName: "Employee",
      phone: null,
      email: null,
    })
    .expect(201);

  return response.body as { id: number };
}

async function createNoteTemplate(admin: SuperAgentTest) {
  const token = nextDeterministicToken("employee-notes-template");
  const response = await admin
    .post("/api/note-templates")
    .send({
      title: `Mitarbeiter Vorlage ${token}`,
      body: "<p>Vorlage</p>",
      cardColor: "#1d4ed8",
      print: false,
      sortOrder: 0,
      isActive: true,
    })
    .expect(201);

  return response.body as { id: number };
}

describe("FT05+/FT13 integration: employee notes", () => {
  it("lists, creates and scoped-deletes employee notes with persisted join rows", async () => {
    const admin = await loginAdminAgent();
    const employee = await createEmployee(admin);

    await admin.get(`/api/employees/${employee.id}/notes`).expect(200).expect(({ body }) => {
      expect(body).toEqual([]);
    });

    const created = await admin
      .post(`/api/employees/${employee.id}/notes`)
      .send({
        title: "Mitarbeiterhinweis",
        body: "<p>Wichtig</p>",
        cardColor: "#f97316",
        print: true,
      })
      .expect(201);

    const noteId = Number(created.body.id);
    expect(created.body.title).toBe("Mitarbeiterhinweis");
    expect(created.body.cardColor).toBe("#f97316");

    const joinRows = await db
      .select()
      .from(employeeNotes)
      .where(and(eq(employeeNotes.employeeId, employee.id), eq(employeeNotes.noteId, noteId)));
    expect(joinRows).toHaveLength(1);

    await admin.get(`/api/employees/${employee.id}/notes`).expect(200).expect(({ body }) => {
      expect(body).toMatchObject([
        {
          id: noteId,
          title: "Mitarbeiterhinweis",
        },
      ]);
    });

    await admin
      .delete(`/api/employees/${employee.id}/notes/${noteId}`)
      .send({ version: created.body.version })
      .expect(204);

    const noteRows = await db.select().from(notes).where(eq(notes.id, noteId));
    expect(noteRows).toHaveLength(0);
  });

  it("creates employee note from template and allows update plus pin toggle via generic note endpoints", async () => {
    const admin = await loginAdminAgent();
    const employee = await createEmployee(admin);
    const template = await createNoteTemplate(admin);

    const created = await admin
      .post(`/api/employees/${employee.id}/notes`)
      .send({
        title: "Template Note",
        body: "<p>Body</p>",
        templateId: template.id,
      })
      .expect(201);

    expect(created.body.cardColor).toBe("#1d4ed8");
    expect(created.body.print).toBe(true);
    expect(created.body.cardColorLocked).toBe(true);

    const updated = await admin
      .put(`/api/notes/${created.body.id}`)
      .send({
        title: "Template Note Aktualisiert",
        body: "<p>Neu</p>",
        cardColor: "#ef4444",
        print: true,
        version: created.body.version,
      })
      .expect(200);

    expect(updated.body.title).toBe("Template Note Aktualisiert");
    expect(updated.body.body).toBe("<p>Neu</p>");
    expect(updated.body.cardColor).toBe("#1d4ed8");
    expect(updated.body.print).toBe(true);

    const pinned = await admin
      .patch(`/api/notes/${created.body.id}/pin`)
      .send({ isPinned: true, version: updated.body.version })
      .expect(200);

    expect(pinned.body.isPinned).toBe(true);
  });

  it("blocks reader role from mutating employee notes", async () => {
    const admin = await loginAdminAgent();
    const reader = await createReaderAgent();
    const employee = await createEmployee(admin);

    await reader
      .post(`/api/employees/${employee.id}/notes`)
      .send({
        title: "Unzulaessig",
        body: "<p>Keine Rechte</p>",
      })
      .expect(403)
      .expect(({ body }) => {
        expect(body.code).toBe("FORBIDDEN");
      });
  });

  it("returns 404 for unknown employee note parent and 409 for stale scoped delete", async () => {
    const admin = await loginAdminAgent();
    const employee = await createEmployee(admin);

    await admin
      .post("/api/employees/999999/notes")
      .send({
        title: "Fehlt",
        body: "<p>Fehlt</p>",
      })
      .expect(404)
      .expect(({ body }) => {
        expect(body.code).toBe("NOT_FOUND");
      });

    const created = await admin
      .post(`/api/employees/${employee.id}/notes`)
      .send({
        title: "Versioniert",
        body: "<p>Note</p>",
      })
      .expect(201);

    await admin
      .delete(`/api/employees/${employee.id}/notes/${created.body.id}`)
      .send({ version: created.body.version + 1 })
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe("VERSION_CONFLICT");
      });
  });
});
