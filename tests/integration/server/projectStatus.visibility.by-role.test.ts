/**
 * Test Scope:
 *
 * Feature: FT15 - Projekt Status Verwaltung
 * Use Case: UC Projektstatuslisten und Projektstatus-Zuordnung nach Rolle
 *
 * Abgedeckte Regeln:
 * - Nicht-Admin sieht bei Projektstatuslisten nur aktive Stati, auch bei angefragtem all/inactive Scope.
 * - LESER darf die aktive Projektstatusliste abrufen.
 * - DISPONENT und ADMIN duerfen Projektstatus-Zuordnungen hinzufuegen/entfernen.
 * - LESER darf Projektstatus-Zuordnungen nicht hinzufuegen/entfernen.
 * - Projektstatus-Zuordnungen sind fuer Nicht-Admin readonly lesbar.
 *
 * Fehlerfaelle:
 * - LESER Add/Remove von Zuordnungen liefert FORBIDDEN.
 *
 * Ziel:
 * End-to-end-Absicherung der FT15-Rollenregeln fuer Sichtbarkeit und readonly-Zuordnungspfad.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeEach, beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import * as customersService from "../../../server/services/customersService";
import * as projectsService from "../../../server/services/projectsService";
import * as projectStatusService from "../../../server/services/projectStatusService";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";

let app: express.Express;
let sequence = 1;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

beforeEach(async () => {
  sequence = 1;
});

async function loginAgent(username: string, password: string): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username, password }).expect(200);
  return agent;
}

async function createRoleAgent(roleCode: "DISPATCHER" | "READER"): Promise<SuperAgentTest> {
  const suffix = `${roleCode.toLowerCase()}-${Date.now()}-${sequence}`;
  sequence += 1;
  const username = `test-${suffix}`;
  const password = `test-${suffix}-password`;
  const passwordHash = await hashPassword(password);
  await createUser({
    username,
    email: `${suffix}@local.test`,
    firstName: "Test",
    lastName: roleCode === "DISPATCHER" ? "Dispatcher" : "Reader",
    passwordHash,
    roleCode,
  });
  return loginAgent(username, password);
}

async function createProjectWithStatusPair() {
  const customer = await customersService.createCustomer({
    customerNumber: `PS-${Date.now()}-${sequence}`,
    firstName: "Projekt",
    lastName: `Status-${sequence}`,
    fullName: `Status-${sequence}, Projekt`,
    company: null,
    email: null,
    phone: "12345",
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    version: 1,
  });
  sequence += 1;

  const project = await projectsService.createProject({
    name: `Projekt-${Date.now()}-${sequence}`,
    customerId: customer.id,
    orderNumber: `ORD-STATUS-VIS-${Date.now()}-${sequence}`,
    descriptionMd: null,
    version: 1,
  });
  sequence += 1;

  const activeStatus = await projectStatusService.createProjectStatus(
    {
      title: `Aktiv-${Date.now()}-${sequence}`,
      color: "#0ea5e9",
      description: null,
      sortOrder: 1,
      isActive: true,
    },
    "ADMIN",
  );
  sequence += 1;

  const initiallyActive = await projectStatusService.createProjectStatus(
    {
      title: `Inaktiv-${Date.now()}-${sequence}`,
      color: "#64748b",
      description: null,
      sortOrder: 2,
      isActive: true,
    },
    "ADMIN",
  );
  sequence += 1;

  const inactiveStatus = await projectStatusService.toggleProjectStatusActive(
    initiallyActive.id,
    false,
    initiallyActive.version,
    "ADMIN",
  );
  if (!inactiveStatus) {
    throw new Error("Expected inactive status");
  }

  return { project, activeStatus, inactiveStatus };
}

describe("FT15 integration: project status visibility by role", () => {
  it("keeps non-admin project-status list on active scope even when all/inactive is requested", async () => {
    const dispatcher = await createRoleAgent("DISPATCHER");
    const { activeStatus, inactiveStatus } = await createProjectWithStatusPair();

    await dispatcher
      .get("/api/project-status?active=all")
      .expect(200)
      .expect((res) => {
        const ids = res.body.map((entry: { id: number }) => entry.id);
        expect(ids).toContain(activeStatus.id);
        expect(ids).not.toContain(inactiveStatus.id);
      });

    await dispatcher
      .get("/api/project-status?active=false")
      .expect(200)
      .expect((res) => {
        const ids = res.body.map((entry: { id: number }) => entry.id);
        expect(ids).toContain(activeStatus.id);
        expect(ids).not.toContain(inactiveStatus.id);
      });
  });

  it("allows READER to read active project-status list", async () => {
    const reader = await createRoleAgent("READER");
    const { activeStatus, inactiveStatus } = await createProjectWithStatusPair();

    await reader
      .get("/api/project-status")
      .expect(200)
      .expect((res) => {
        const ids = res.body.map((entry: { id: number }) => entry.id);
        expect(ids).toContain(activeStatus.id);
        expect(ids).not.toContain(inactiveStatus.id);
      });
  });

  it("allows DISPONENT to add and remove project-status relation", async () => {
    const dispatcher = await createRoleAgent("DISPATCHER");
    const { project, activeStatus } = await createProjectWithStatusPair();

    const createdRelation = await dispatcher
      .post(`/api/projects/${project.id}/statuses`)
      .send({ statusId: activeStatus.id, expectedVersion: 0 })
      .expect(201)
      .expect((res) => {
        expect(res.body.status.id).toBe(activeStatus.id);
        expect(typeof res.body.relationVersion).toBe("number");
      });

    await dispatcher
      .delete(`/api/projects/${project.id}/statuses/${activeStatus.id}`)
      .send({ version: createdRelation.body.relationVersion })
      .expect(204);
  });

  it("returns 403 FORBIDDEN when READER tries to add/remove project-status relation", async () => {
    const reader = await createRoleAgent("READER");
    const { project, activeStatus } = await createProjectWithStatusPair();

    await reader
      .post(`/api/projects/${project.id}/statuses`)
      .send({ statusId: activeStatus.id, expectedVersion: 0 })
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("FORBIDDEN");
      });

    const relation = await projectStatusService.addProjectStatus(project.id, activeStatus.id, 0, "ADMIN");
    await reader
      .delete(`/api/projects/${project.id}/statuses/${activeStatus.id}`)
      .send({ version: relation.relationVersion })
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("FORBIDDEN");
      });
  });

  it("allows non-admin readonly relation list", async () => {
    const reader = await createRoleAgent("READER");
    const { project, activeStatus } = await createProjectWithStatusPair();
    await projectStatusService.addProjectStatus(project.id, activeStatus.id, 0, "ADMIN");

    await reader
      .get(`/api/projects/${project.id}/statuses`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.some((entry: { status: { id: number } }) => entry.status.id === activeStatus.id)).toBe(true);
      });
  });
});
