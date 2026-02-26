/**
 * Test Scope:
 *
 * Feature: FT05/FT05+ - Mitarbeiter API Lifecycle und Locking
 * Use Case: UC Mitarbeiter anlegen / aktualisieren / aktivieren-deaktivieren / Sichtbarkeit nach Rolle
 *
 * Abgedeckte Regeln:
 * - POST erzeugt Mitarbeiter mit version=1 und isActive=true.
 * - POST ist fuer Leserrollen als Schreibzugriff mit 403 FORBIDDEN blockiert.
 * - PUT/PATCH arbeiten optimistic-locking-basiert mit Versionspflicht.
 * - Stale Version liefert VERSION_CONFLICT, unbekannte ID liefert NOT_FOUND.
 * - Nicht-Admin darf isActive weder per PUT noch per PATCH aendern.
 * - Aktivieren/Deaktivieren ist idempotent und liefert auch bei gleichem Zielzustand 200.
 *
 * Fehlerfaelle:
 * - DTO-Fehler liefern im IST 422 VALIDATION_ERROR.
 * - Nicht-Admin Statuswechsel liefert 403 FORBIDDEN.
 *
 * Ziel:
 * FT05/FT05+ End-to-end als IST dokumentieren, inkl. Konflikt- und Fehlerpfade.
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
let employeeCounter = 1;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

function nextEmployeeSeed() {
  employeeCounter += 1;
  return employeeCounter;
}

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username: "test-admin", password: "test-admin-password" }).expect(200);
  return agent;
}

async function createDispatcherAgent(): Promise<SuperAgentTest> {
  const username = `test-dispatcher-${nextDeterministicToken("employees-lifecycle-dispatcher")}`;
  const password = "test-dispatcher-password";
  const passwordHash = await hashPassword(password);
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "Test",
    lastName: "Dispatcher",
    passwordHash,
    roleCode: "DISPATCHER",
  });

  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username, password }).expect(200);
  return agent;
}

async function createReaderAgent(): Promise<SuperAgentTest> {
  const username = `test-reader-${nextDeterministicToken("employees-lifecycle-reader")}`;
  const password = "test-reader-password";
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

async function createEmployee(agent: SuperAgentTest, suffix = "base") {
  const seq = nextEmployeeSeed();
  const response = await agent
    .post("/api/employees")
    .send({
      firstName: `First-${suffix}-${seq}`,
      lastName: `Last-${suffix}-${seq}`,
      phone: null,
      email: null,
    })
    .expect(201);

  return response.body as {
    id: number;
    version: number;
    isActive: boolean;
    firstName: string;
    lastName: string;
  };
}

describe("FT05 integration: employees lifecycle", () => {
  it("POST creates employee with version 1 and active default", async () => {
    const admin = await loginAdminAgent();

    await admin
      .post("/api/employees")
      .send({ firstName: "Create", lastName: "Case", phone: null, email: null })
      .expect(201)
      .expect((res) => {
        expect(res.body.version).toBe(1);
        expect(res.body.isActive).toBe(true);
      });
  });

  it("GET list includes created employee and GET detail returns matching payload", async () => {
    const admin = await loginAdminAgent();
    const created = await createEmployee(admin, "list");

    await admin
      .get("/api/employees?scope=active")
      .expect(200)
      .expect((res) => {
        const ids = (res.body as Array<{ id: number }>).map((entry) => entry.id);
        expect(ids).toContain(created.id);
      });

    await admin
      .get(`/api/employees/${created.id}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.employee.id).toBe(created.id);
        expect(res.body.employee.firstName).toBe(created.firstName);
        expect(res.body.employee.lastName).toBe(created.lastName);
      });
  });

  it("PUT with valid version succeeds and increments version exactly by 1", async () => {
    const admin = await loginAdminAgent();
    const created = await createEmployee(admin, "update");

    await admin
      .put(`/api/employees/${created.id}`)
      .send({ firstName: "Changed", version: created.version })
      .expect(200)
      .expect((res) => {
        expect(res.body.firstName).toBe("Changed");
        expect(res.body.version).toBe(created.version + 1);
      });
  });

  it("PUT with stale version returns 409 VERSION_CONFLICT", async () => {
    const admin = await loginAdminAgent();
    const created = await createEmployee(admin, "stale");

    await admin.put(`/api/employees/${created.id}`).send({ firstName: "A", version: created.version }).expect(200);

    await admin
      .put(`/api/employees/${created.id}`)
      .send({ firstName: "B", version: created.version })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("VERSION_CONFLICT");
      });
  });

  it("PATCH active true->false and false->true increments version by 1 each time", async () => {
    const admin = await loginAdminAgent();
    const created = await createEmployee(admin, "toggle");

    const deactivated = await admin
      .patch(`/api/employees/${created.id}/active`)
      .send({ isActive: false, version: created.version })
      .expect(200);

    expect(deactivated.body.isActive).toBe(false);
    expect(deactivated.body.version).toBe(created.version + 1);

    await admin
      .patch(`/api/employees/${created.id}/active`)
      .send({ isActive: true, version: deactivated.body.version })
      .expect(200)
      .expect((res) => {
        expect(res.body.isActive).toBe(true);
        expect(res.body.version).toBe(deactivated.body.version + 1);
      });
  });

  it("PATCH active is idempotent for already inactive employee and still returns 200", async () => {
    const admin = await loginAdminAgent();
    const created = await createEmployee(admin, "toggle-idempotent-false");

    const firstDeactivate = await admin
      .patch(`/api/employees/${created.id}/active`)
      .send({ isActive: false, version: created.version })
      .expect(200);

    await admin
      .patch(`/api/employees/${created.id}/active`)
      .send({ isActive: false, version: firstDeactivate.body.version })
      .expect(200)
      .expect((res) => {
        expect(res.body.isActive).toBe(false);
      });
  });

  it("PATCH active is idempotent for already active employee and still returns 200", async () => {
    const admin = await loginAdminAgent();
    const created = await createEmployee(admin, "toggle-idempotent-true");

    await admin
      .patch(`/api/employees/${created.id}/active`)
      .send({ isActive: true, version: created.version })
      .expect(200)
      .expect((res) => {
        expect(res.body.isActive).toBe(true);
      });
  });

  it("optimistic locking multi-user: second client update with old version returns 409", async () => {
    const adminA = await loginAdminAgent();
    const adminB = await loginAdminAgent();
    const created = await createEmployee(adminA, "multi");

    const snapshotA = await adminA.get(`/api/employees/${created.id}`).expect(200);
    const snapshotB = await adminB.get(`/api/employees/${created.id}`).expect(200);
    const versionX = snapshotA.body.employee.version as number;
    expect(snapshotB.body.employee.version).toBe(versionX);

    await adminA
      .put(`/api/employees/${created.id}`)
      .send({ firstName: "A-Update", version: versionX })
      .expect(200);

    await adminB
      .put(`/api/employees/${created.id}`)
      .send({ firstName: "B-Update", version: versionX })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("VERSION_CONFLICT");
      });

    await adminA
      .get(`/api/employees/${created.id}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.employee.firstName).toBe("A-Update");
      });
  });

  it("documents update with identical values: version still increments in IST", async () => {
    const admin = await loginAdminAgent();
    const created = await createEmployee(admin, "identical");

    await admin
      .put(`/api/employees/${created.id}`)
      .send({
        firstName: created.firstName,
        lastName: created.lastName,
        phone: null,
        email: null,
        version: created.version,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.version).toBe(created.version + 1);
      });
  });

  it("admin scope filter returns only active or only inactive", async () => {
    const admin = await loginAdminAgent();
    const activeEmployee = await createEmployee(admin, "scope-active");
    const toDeactivate = await createEmployee(admin, "scope-inactive");

    await admin
      .patch(`/api/employees/${toDeactivate.id}/active`)
      .send({ isActive: false, version: toDeactivate.version })
      .expect(200);

    await admin
      .get("/api/employees?scope=active")
      .expect(200)
      .expect((res) => {
        const ids = (res.body as Array<{ id: number }>).map((entry) => entry.id);
        expect(ids).toContain(activeEmployee.id);
        expect(ids).not.toContain(toDeactivate.id);
      });

    await admin
      .get("/api/employees?scope=inactive")
      .expect(200)
      .expect((res) => {
        const ids = (res.body as Array<{ id: number }>).map((entry) => entry.id);
        expect(ids).toContain(toDeactivate.id);
        expect(ids).not.toContain(activeEmployee.id);
      });
  });

  it("non-admin requesting inactive scope still gets effective active list", async () => {
    const admin = await loginAdminAgent();
    const dispatcher = await createDispatcherAgent();

    const activeEmployee = await createEmployee(admin, "scope-nonadmin-active");
    const inactiveEmployee = await createEmployee(admin, "scope-nonadmin-inactive");

    await admin
      .patch(`/api/employees/${inactiveEmployee.id}/active`)
      .send({ isActive: false, version: inactiveEmployee.version })
      .expect(200);

    await dispatcher
      .get("/api/employees?scope=inactive")
      .expect(200)
      .expect((res) => {
        const ids = (res.body as Array<{ id: number }>).map((entry) => entry.id);
        expect(ids).toContain(activeEmployee.id);
        expect(ids).not.toContain(inactiveEmployee.id);
      });
  });

  it("non-admin gets 404 for inactive employee detail", async () => {
    const admin = await loginAdminAgent();
    const dispatcher = await createDispatcherAgent();
    const employee = await createEmployee(admin, "inactive-detail");

    await admin
      .patch(`/api/employees/${employee.id}/active`)
      .send({ isActive: false, version: employee.version })
      .expect(200);

    await dispatcher.get(`/api/employees/${employee.id}`).expect(404);
  });

  it("error matrix: PUT without version returns 422 VALIDATION_ERROR", async () => {
    const admin = await loginAdminAgent();
    const employee = await createEmployee(admin, "err-no-version");

    await admin
      .put(`/api/employees/${employee.id}`)
      .send({ firstName: "NoVersion" })
      .expect(422)
      .expect((res) => {
        expect(res.body.code).toBe("VALIDATION_ERROR");
      });
  });

  it("error matrix: PUT with wrong version datatype returns 422 VALIDATION_ERROR", async () => {
    const admin = await loginAdminAgent();
    const employee = await createEmployee(admin, "err-type");

    await admin
      .put(`/api/employees/${employee.id}`)
      .send({ firstName: "Type", version: "1" })
      .expect(422)
      .expect((res) => {
        expect(res.body.code).toBe("VALIDATION_ERROR");
      });
  });

  it("error matrix: PATCH /active without version returns 422 VALIDATION_ERROR", async () => {
    const admin = await loginAdminAgent();
    const employee = await createEmployee(admin, "err-patch");

    await admin
      .patch(`/api/employees/${employee.id}/active`)
      .send({ isActive: false })
      .expect(422)
      .expect((res) => {
        expect(res.body.code).toBe("VALIDATION_ERROR");
      });
  });

  it("error matrix: PUT/PATCH on non-existing employee id returns 404 NOT_FOUND", async () => {
    const admin = await loginAdminAgent();

    await admin
      .put("/api/employees/999999")
      .send({ firstName: "Ghost", version: 1 })
      .expect(404)
      .expect((res) => {
        expect(res.body.code).toBe("NOT_FOUND");
      });

    await admin
      .patch("/api/employees/999999/active")
      .send({ isActive: false, version: 1 })
      .expect(404)
      .expect((res) => {
        expect(res.body.code).toBe("NOT_FOUND");
      });
  });

  it("non-admin cannot change status via PATCH and via PUT", async () => {
    const admin = await loginAdminAgent();
    const dispatcher = await createDispatcherAgent();
    const employee = await createEmployee(admin, "forbidden");

    await dispatcher
      .patch(`/api/employees/${employee.id}/active`)
      .send({ isActive: false, version: employee.version })
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("FORBIDDEN");
      });

    await dispatcher
      .put(`/api/employees/${employee.id}`)
      .send({ isActive: false, version: employee.version })
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("FORBIDDEN");
      });
  });

  it("reader cannot create employee via POST", async () => {
    const reader = await createReaderAgent();

    await reader
      .post("/api/employees")
      .send({ firstName: "No", lastName: "Access", phone: null, email: null })
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("FORBIDDEN");
      });
  });
});
