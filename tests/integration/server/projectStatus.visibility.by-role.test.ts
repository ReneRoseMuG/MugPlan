/**
 * Test Scope:
 *
 * Feature: FT15 - Projekt Status Verwaltung
 * Use Case: UC Projektstatus-Katalog nach Rolle
 *
 * Abgedeckte Regeln:
 * - Nur ADMIN darf den Projektstatus-Katalog lesen.
 * - Nicht-Admin erhaelt auch bei Scope-Parametern keinen Lesepfad.
 *
 * Fehlerfaelle:
 * - DISPONENT oder LESER koennen den Katalog trotz eingeschraenkter Sichtbarkeit lesen.
 *
 * Ziel:
 * End-to-end-Absicherung, dass Projektstatus ausserhalb der Admin-Stammdatenpflege nicht mehr sichtbar ist.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeEach, beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
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

async function createStatusPair() {
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

  return { activeStatus, inactiveStatus };
}

describe("FT15 integration: project status visibility by role", () => {
  it("returns forbidden for non-admin project-status reads even when scope parameters are requested", async () => {
    const dispatcher = await createRoleAgent("DISPATCHER");
    await createStatusPair();

    await dispatcher
      .get("/api/project-status?active=all")
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("FORBIDDEN");
      });

    await dispatcher
      .get("/api/project-status?active=false")
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("FORBIDDEN");
      });
  });

  it("returns forbidden for READER project-status reads", async () => {
    const reader = await createRoleAgent("READER");
    await createStatusPair();

    await reader
      .get("/api/project-status")
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("FORBIDDEN");
      });
  });

  it("keeps project-status list available for admin", async () => {
    const admin = await loginAgent("test-admin", "test-admin-password");
    const { activeStatus, inactiveStatus } = await createStatusPair();

    await admin
      .get("/api/project-status?active=all")
      .expect(200)
      .expect((res) => {
        const ids = res.body.map((entry: { id: number }) => entry.id);
        expect(ids).toContain(activeStatus.id);
        expect(ids).toContain(inactiveStatus.id);
      });
  });
});
