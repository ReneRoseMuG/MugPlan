/**
 * Test Scope:
 *
 * Feature: FT05+/FT13/FT19 - Mitarbeiterlisten-Aggregate
 * Use Case: UC Mitarbeiterkarte zeigt Notiz- und Anhangszähler aus der Listenprojektion
 *
 * Abgedeckte Regeln:
 * - `GET /api/employees` liefert `notesCount` und `attachmentsCount` direkt im Listenresponse.
 * - Änderungen an Mitarbeiter-Notizen und -Anhängen werden im nächsten Listenaufruf sofort reflektiert.
 *
 * Fehlerfälle:
 * - Die Listenprojektion liefert stale oder fehlende Zähler.
 * - Notiz-/Anhang-Mutationen werden nicht in den Listenresponse übernommen.
 *
 * Ziel:
 * Die neue Mitarbeiterlisten-Aggregation end-to-end absichern.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { errorHandler } from "../../../server/middleware/errorHandler";
import { registerRoutes } from "../../../server/routes";

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

async function createEmployee(admin: SuperAgentTest) {
  employeeCounter += 1;
  const response = await admin
    .post("/api/employees")
    .send({
      firstName: `Aggregate-${employeeCounter}`,
      lastName: "Employee",
      phone: null,
      email: null,
    })
    .expect(201);

  return response.body as { id: number };
}

describe("FT05+ integration: employee list aggregates", () => {
  it("reflects note and attachment mutations in the next employee list response", async () => {
    const admin = await loginAdminAgent();
    const employee = await createEmployee(admin);

    const initialList = await admin.get("/api/employees?scope=active").expect(200);
    const initialRow = (initialList.body as Array<{ id: number; notesCount: number; attachmentsCount: number }>).find((entry) => entry.id === employee.id);
    expect(initialRow).toMatchObject({ notesCount: 0, attachmentsCount: 0 });

    const createdNote = await admin
      .post(`/api/employees/${employee.id}/notes`)
      .send({
        title: "Listenhinweis",
        body: "<p>Badge aktualisieren</p>",
        cardColor: "#0f766e",
        print: false,
      })
      .expect(201);

    const afterNoteList = await admin.get("/api/employees?scope=active").expect(200);
    const afterNoteRow = (afterNoteList.body as Array<{ id: number; notesCount: number; attachmentsCount: number }>).find((entry) => entry.id === employee.id);
    expect(afterNoteRow).toMatchObject({ notesCount: 1, attachmentsCount: 0 });

    const createdAttachment = await admin
      .post(`/api/employees/${employee.id}/attachments`)
      .attach("file", Buffer.from("employee aggregate attachment"), "aggregate.txt")
      .expect(201);

    const afterAttachmentList = await admin.get("/api/employees?scope=active").expect(200);
    const afterAttachmentRow = (afterAttachmentList.body as Array<{ id: number; notesCount: number; attachmentsCount: number }>).find((entry) => entry.id === employee.id);
    expect(afterAttachmentRow).toMatchObject({ notesCount: 1, attachmentsCount: 1 });

    await admin
      .delete(`/api/employees/${employee.id}/notes/${createdNote.body.id}`)
      .send({ version: createdNote.body.version })
      .expect(204);

    await admin
      .delete(`/api/employee-attachments/${createdAttachment.body.id}`)
      .expect(200);

    const afterDeleteList = await admin.get("/api/employees?scope=active").expect(200);
    const afterDeleteRow = (afterDeleteList.body as Array<{ id: number; notesCount: number; attachmentsCount: number }>).find((entry) => entry.id === employee.id);
    expect(afterDeleteRow).toMatchObject({ notesCount: 0, attachmentsCount: 0 });
  });
});
