/**
 * Test Scope:
 *
 * Feature: FT11 - Team Verwaltung
 * Use Case: UC Team anlegen / bearbeiten / loeschen (ohne Terminbezug)
 *
 * Abgedeckte Regeln:
 * - Team-CRUD arbeitet ueber /api/teams mit serverseitiger Namensgenerierung.
 * - Team-Mitarbeiterverwaltung erfolgt getrennt ueber /api/teams/:teamId/employees.
 * - Join-Relationen werden bei Remove/Delete bereinigt.
 *
 * Fehlerfaelle:
 * - Ungueltige Payloads liefern VALIDATION_ERROR (IST: 422).
 * - Unbekannte Team-ID liefert NOT_FOUND.
 * - Duplicate-Assign im selben Batch fuehrt zu VERSION_CONFLICT.
 *
 * Ziel:
 * Beobachtbares Team-CRUD und Team-Mitarbeiterverhalten der FT11-Routen absichern, ohne fehlende Rechte-Guards als Soll zu konservieren.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeEach, beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";

let app: express.Express;
let employeeCounter = 1;
let roleUserCounter = 1;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

beforeEach(async () => {
  employeeCounter = 1;
  roleUserCounter += 1;
});

async function loginAgent(username: string, password: string): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username, password }).expect(200);
  return agent;
}

async function loginAdminAgent(): Promise<SuperAgentTest> {
  return loginAgent("test-admin", "test-admin-password");
}

async function loginRoleAgent(roleCode: "DISPATCHER" | "READER"): Promise<SuperAgentTest> {
  const token = `ft11-${roleCode.toLowerCase()}-${roleUserCounter}`;
  roleUserCounter += 1;
  const username = `test-${token}`;
  const password = `${token}-password`;
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "FT11",
    lastName: roleCode,
    passwordHash: await hashPassword(password),
    roleCode,
  });
  return loginAgent(username, password);
}

async function createEmployee(agent: SuperAgentTest) {
  const idx = employeeCounter++;
  const response = await agent
    .post("/api/employees")
    .send({
      firstName: `FT11-${idx}`,
      lastName: `Employee-${idx}`,
      phone: null,
      email: null,
    })
    .expect(201);

  return response.body as { id: number; version: number; teamId: number | null; isActive: boolean };
}

describe("FT11 integration: team management core behavior", () => {
  it("creates a team, auto-generates name and ignores client-provided name", async () => {
    const admin = await loginAdminAgent();

    const created = await admin.post("/api/teams").send({ color: "#2255aa", name: "Client Team Name" }).expect(201);

    expect(created.body.id).toBeTypeOf("number");
    expect(created.body.name).toBe("Team 1");
    expect(created.body.name).not.toBe("Client Team Name");
    expect(created.body.color).toBe("#2255aa");
    expect(created.body.version).toBe(1);
  });

  it("returns 422 VALIDATION_ERROR for invalid create payload", async () => {
    const admin = await loginAdminAgent();

    await admin.post("/api/teams").send({}).expect(422).expect((res) => {
      expect(res.body.code).toBe("VALIDATION_ERROR");
    });
  });

  it("allows dispatchers to create, update and delete teams", async () => {
    const dispatcher = await loginRoleAgent("DISPATCHER");

    const created = await dispatcher.post("/api/teams").send({ color: "#224477" }).expect(201);

    const updated = await dispatcher
      .patch(`/api/teams/${created.body.id}`)
      .send({ color: "#337788", version: created.body.version })
      .expect(200);

    expect(updated.body.color).toBe("#337788");

    await dispatcher.delete(`/api/teams/${created.body.id}`).send({ version: updated.body.version }).expect(204);
  });

  it("blocks reader write access on all team mutation endpoints with FORBIDDEN", async () => {
    const admin = await loginAdminAgent();
    const reader = await loginRoleAgent("READER");
    const team = await admin.post("/api/teams").send({ color: "#663399" }).expect(201);
    const employee = await createEmployee(admin);

    await reader.get("/api/teams").expect(200);

    await reader.post("/api/teams").send({ color: "#112233" }).expect(403).expect((res) => {
      expect(res.body.code).toBe("FORBIDDEN");
    });
    await reader
      .patch(`/api/teams/${team.body.id}`)
      .send({ color: "#334455", version: team.body.version })
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("FORBIDDEN");
      });
    await reader
      .delete(`/api/teams/${team.body.id}`)
      .send({ version: team.body.version })
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("FORBIDDEN");
      });
    await reader
      .post(`/api/teams/${team.body.id}/employees`)
      .send({ items: [{ employeeId: employee.id, version: employee.version }] })
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("FORBIDDEN");
      });
    await reader
      .delete(`/api/teams/${team.body.id}/employees/${employee.id}`)
      .send({ version: employee.version })
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("FORBIDDEN");
      });
  });

  it("documents empty assign payload behavior as 200 with empty array", async () => {
    const admin = await loginAdminAgent();
    const team = await admin.post("/api/teams").send({ color: "#117799" }).expect(201);

    await admin
      .post(`/api/teams/${team.body.id}/employees`)
      .send({ items: [] })
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(0);
      });
  });

  it("adds and removes team members via dedicated team-employees endpoints", async () => {
    const admin = await loginAdminAgent();
    const team = await admin.post("/api/teams").send({ color: "#aa6622" }).expect(201);
    const employee = await createEmployee(admin);

    const assigned = await admin
      .post(`/api/teams/${team.body.id}/employees`)
      .send({ items: [{ employeeId: employee.id, version: employee.version }] })
      .expect(200);

    expect(assigned.body).toHaveLength(1);
    expect(assigned.body[0].id).toBe(employee.id);
    expect(assigned.body[0].teamId).toBe(team.body.id);

    await admin
      .delete(`/api/teams/${team.body.id}/employees/${employee.id}`)
      .send({ version: assigned.body[0].version })
      .expect(200)
      .expect((res) => {
        expect(res.body.teamId).toBeNull();
      });
  });

  it("allows assigning inactive employees (IST behavior)", async () => {
    const admin = await loginAdminAgent();
    const team = await admin.post("/api/teams").send({ color: "#445566" }).expect(201);
    const employee = await createEmployee(admin);

    const deactivated = await admin
      .patch(`/api/employees/${employee.id}/active`)
      .send({ isActive: false, version: employee.version })
      .expect(200);

    await admin
      .post(`/api/teams/${team.body.id}/employees`)
      .send({ items: [{ employeeId: employee.id, version: deactivated.body.version }] })
      .expect(200)
      .expect((res) => {
        expect(res.body[0].id).toBe(employee.id);
        expect(res.body[0].teamId).toBe(team.body.id);
        expect(res.body[0].isActive).toBe(false);
      });
  });

  it("returns VERSION_CONFLICT when duplicate employee is assigned twice in same batch", async () => {
    const admin = await loginAdminAgent();
    const team = await admin.post("/api/teams").send({ color: "#1a1a1a" }).expect(201);
    const employee = await createEmployee(admin);

    await admin
      .post(`/api/teams/${team.body.id}/employees`)
      .send({
        items: [
          { employeeId: employee.id, version: employee.version },
          { employeeId: employee.id, version: employee.version },
        ],
      })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("VERSION_CONFLICT");
      });
  });

  it("updates team color, keeps team name unchanged and returns 404 for unknown id", async () => {
    const admin = await loginAdminAgent();
    const created = await admin.post("/api/teams").send({ color: "#123123" }).expect(201);

    const updated = await admin
      .patch(`/api/teams/${created.body.id}`)
      .send({ color: "#456456", version: created.body.version, name: "Renamed Team" })
      .expect(200);

    expect(updated.body.color).toBe("#456456");
    expect(updated.body.name).toBe(created.body.name);
    expect(updated.body.version).toBe(created.body.version + 1);

    await admin.patch("/api/teams/999999").send({ color: "#000000", version: 1 }).expect(404).expect((res) => {
      expect(res.body.code).toBe("NOT_FOUND");
    });
  });

  it("supports full member replacement workflow without stale relations", async () => {
    const admin = await loginAdminAgent();
    const team = await admin.post("/api/teams").send({ color: "#0099aa" }).expect(201);
    const employeeA = await createEmployee(admin);
    const employeeB = await createEmployee(admin);
    const employeeC = await createEmployee(admin);

    const initialAssign = await admin
      .post(`/api/teams/${team.body.id}/employees`)
      .send({
        items: [
          { employeeId: employeeA.id, version: employeeA.version },
          { employeeId: employeeB.id, version: employeeB.version },
        ],
      })
      .expect(200);

    const versionA = initialAssign.body.find((entry: { id: number }) => entry.id === employeeA.id).version as number;
    await admin.delete(`/api/teams/${team.body.id}/employees/${employeeA.id}`).send({ version: versionA }).expect(200);

    await admin
      .post(`/api/teams/${team.body.id}/employees`)
      .send({ items: [{ employeeId: employeeC.id, version: employeeC.version }] })
      .expect(200);

    await admin.get(`/api/teams/${team.body.id}/employees`).expect(200).expect((res) => {
      const ids = res.body.map((entry: { id: number }) => entry.id).sort((l: number, r: number) => l - r);
      expect(ids).toEqual([employeeB.id, employeeC.id].sort((l, r) => l - r));
      expect(ids).not.toContain(employeeA.id);
    });
  });

  it("deletes team and clears employee.teamId relation, unknown id returns 404", async () => {
    const admin = await loginAdminAgent();
    const team = await admin.post("/api/teams").send({ color: "#ff7744" }).expect(201);
    const employee = await createEmployee(admin);

    const assigned = await admin
      .post(`/api/teams/${team.body.id}/employees`)
      .send({ items: [{ employeeId: employee.id, version: employee.version }] })
      .expect(200);

    expect(assigned.body[0].teamId).toBe(team.body.id);

    await admin.delete(`/api/teams/${team.body.id}`).send({ version: team.body.version }).expect(204);

    await admin.get(`/api/employees/${employee.id}`).expect(200).expect((res) => {
      expect(res.body.employee.teamId).toBeNull();
    });

    await admin.delete("/api/teams/999999").send({ version: 1 }).expect(404).expect((res) => {
      expect(res.body.code).toBe("NOT_FOUND");
    });
  });

});
