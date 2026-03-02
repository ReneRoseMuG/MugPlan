/**
 * Test Scope:
 *
 * Feature: FT04 - Terminverwaltung
 * Use Case: UC Projekt-Sidebar "Alle Termine"
 *
 * Abgedeckte Regeln:
 * - Der Endpoint /api/projects/:projectId/appointments?fromDate=1900-01-01 liefert vergangene und zukuenftige Projekttemine.
 * - Die Rueckgabe ist strikt auf das gewaehlte Projekt begrenzt.
 *
 * Fehlerfaelle:
 * - Historische Termine fehlen in der Sidebar-Quelle.
 * - Fremdtermine eines anderen Projekts erscheinen in der Rueckgabe.
 *
 * Ziel:
 * Sicherstellen, dass die Datenquelle des Sidebar-Panels "Alle Termine" wirklich die komplette Projekthistorie liefert.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import {
  createProjectWithPastAndFutureAppointmentsFixture,
  resetTestDataFactoryState,
} from "../../helpers/testDataFactory";

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
  resetTestDataFactoryState();
});

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ username: "test-admin", password: "test-admin-password" })
    .expect(200);
  return agent;
}

describe("FT04 integration: project sidebar all appointments source", () => {
  it("returns past and future appointments for the selected project", async () => {
    const admin = await loginAdminAgent();
    const primary = await createProjectWithPastAndFutureAppointmentsFixture({ prefix: "FT04-SIDEBAR-ALL" });
    const foreign = await createProjectWithPastAndFutureAppointmentsFixture({ prefix: "FT04-SIDEBAR-FOREIGN" });

    const response = await admin
      .get(`/api/projects/${primary.project.id}/appointments?fromDate=1900-01-01`)
      .expect(200);

    const items = response.body as Array<{ id: number; projectId: number; startDate: string }>;
    expect(items).toHaveLength(2);
    expect(items.every((item) => item.projectId === primary.project.id)).toBe(true);

    const ids = items.map((item) => item.id).sort((a, b) => a - b);
    expect(ids).toEqual(
      [primary.pastAppointmentId, primary.futureAppointmentId].sort((a, b) => a - b),
    );

    const dates = items.map((item) => item.startDate).sort();
    expect(dates).toEqual([primary.pastDate, primary.futureDate].sort());

    expect(ids).not.toContain(foreign.pastAppointmentId);
    expect(ids).not.toContain(foreign.futureAppointmentId);
  });
});

