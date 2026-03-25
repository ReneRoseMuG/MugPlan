/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - POST /api/calendar-weeks/:yearNumber/:weekNumber/notes legt eine Notiz an und gibt 201 zurück.
 * - GET /api/calendar-weeks/:yearNumber/:weekNumber/notes gibt angelegte Notizen der Woche zurück.
 * - DELETE mit korrekter Version entfernt die Notiz (204).
 * - DELETE mit falscher Version gibt 409 VERSION_CONFLICT.
 * - POST als Nutzer mit Rolle READER gibt 403 FORBIDDEN.
 * - week_number außerhalb 1–53 wird bei POST mit 422 abgewiesen.
 *
 * Fehlerfälle:
 * - Version-Konflikt beim Löschen.
 * - Rollensperre für schreibende Operationen (READER).
 * - Ungültige week_number im Pfad führt zu Ablehnung durch den Controller.
 *
 * Ziel:
 * Absicherung der CRUD-Infrastruktur für Kalenderwochen-Notizen inkl. Rollenguards und Validierung.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { nextDeterministicToken } from "../../helpers/deterministic";

let app: express.Express;
let readerCounter = 1;

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

async function loginReaderAgent(): Promise<SuperAgentTest> {
  const idx = readerCounter++;
  const username = `cwn-reader-${idx}-${nextDeterministicToken("cwn-reader")}`;
  const password = `cwn-reader-pw-${idx}`;
  const passwordHash = await hashPassword(password);
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "CWN",
    lastName: "Reader",
    passwordHash,
    roleCode: "READER",
  });
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ username, password })
    .expect(200);
  return agent;
}

describe("calendar-week-notes integration", () => {
  it("POST legt Notiz an und gibt 201 zurück", async () => {
    const agent = await loginAdminAgent();
    const res = await agent
      .post("/api/calendar-weeks/2026/13/notes")
      .send({ title: "KW-Notiz", body: "<p>Inhalt</p>", print: false })
      .expect(201);
    expect(res.body.id).toEqual(expect.any(Number));
    expect(res.body.title).toBe("KW-Notiz");
    expect(res.body.version).toBeGreaterThanOrEqual(1);
  });

  it("GET gibt angelegte Notizen der Woche zurück", async () => {
    const agent = await loginAdminAgent();
    const token = nextDeterministicToken("cwn-get");
    const title = `KW-GET-${token}`;
    await agent
      .post("/api/calendar-weeks/2026/14/notes")
      .send({ title, body: "<p>Test</p>", print: false })
      .expect(201);
    const res = await agent.get("/api/calendar-weeks/2026/14/notes").expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((n: { title: string }) => n.title === title);
    expect(found).toBeDefined();
  });

  it("DELETE mit korrekter Version entfernt Notiz (204)", async () => {
    const agent = await loginAdminAgent();
    const createRes = await agent
      .post("/api/calendar-weeks/2026/15/notes")
      .send({ title: "Löschnotiz", body: "<p>Weg</p>", print: false })
      .expect(201);
    const { id, version } = createRes.body;
    await agent
      .delete(`/api/calendar-weeks/2026/15/notes/${id}`)
      .send({ version })
      .expect(204);
  });

  it("DELETE mit falscher Version gibt 409", async () => {
    const agent = await loginAdminAgent();
    const createRes = await agent
      .post("/api/calendar-weeks/2026/16/notes")
      .send({ title: "Conflict-Notiz", body: "<p>Conflict</p>", print: false })
      .expect(201);
    const { id } = createRes.body;
    const res = await agent
      .delete(`/api/calendar-weeks/2026/16/notes/${id}`)
      .send({ version: 9999 })
      .expect(409);
    expect(res.body.code).toBe("VERSION_CONFLICT");
  });

  it("POST als Leser gibt 403", async () => {
    const reader = await loginReaderAgent();
    const res = await reader
      .post("/api/calendar-weeks/2026/17/notes")
      .send({ title: "Reader-Notiz", body: "<p>Gesperrt</p>", print: false })
      .expect(403);
    expect(res.body.code).toBe("FORBIDDEN");
  });

  it("week_number außerhalb 1–53 wird mit 422 abgewiesen", async () => {
    const agent = await loginAdminAgent();
    const res = await agent
      .post("/api/calendar-weeks/2026/54/notes")
      .send({ title: "Ungültig", body: "<p>x</p>", print: false })
      .expect(422);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });
});
