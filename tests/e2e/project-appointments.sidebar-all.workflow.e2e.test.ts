/**
 * Test Scope:
 *
 * Feature: FT04 - Terminverwaltung
 * Use Case: UC Projektformular Sidebar "Alle Termine"
 *
 * Abgedeckte Regeln:
 * - End-to-end liefert die Panel-Quelle vergangene und zukuenftige Termine eines Projekts.
 * - Die Rueckgabe bleibt projektgebunden.
 *
 * Fehlerfaelle:
 * - Der historische Termin fehlt trotz Projektverknuepfung.
 * - Termine anderer Projekte erscheinen in der Rueckgabe.
 *
 * Ziel:
 * API-E2E Absicherung des Sidebar-Panel-Datenflusses fuer "Alle Termine".
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createProjectWithPastAndFutureAppointmentsFixture,
  resetTestDataFactoryState,
} from "../helpers/testDataFactory";
import { createApiTestApp, loginAdminAgent } from "../helpers/apiTestHarness";
import type express from "express";

let app: express.Express;

beforeAll(async () => {
  app = await createApiTestApp();
});

beforeEach(() => {
  resetTestDataFactoryState();
});

describe("E-002 e2e: project sidebar all appointments", () => {
  it("returns past and future appointments for one project via panel source endpoint", async () => {
    const admin = await loginAdminAgent(app);
    const primary = await createProjectWithPastAndFutureAppointmentsFixture({ prefix: "E2E-SIDEBAR-ALL" });
    const foreign = await createProjectWithPastAndFutureAppointmentsFixture({ prefix: "E2E-SIDEBAR-FOREIGN" });

    const listed = await admin
      .get(`/api/projects/${primary.project.id}/appointments?fromDate=1900-01-01`)
      .expect(200);

    const items = listed.body as Array<{ id: number; projectId: number; startDate: string }>;

    expect(items).toHaveLength(2);
    expect(items.every((item) => item.projectId === primary.project.id)).toBe(true);

    const ids = items.map((item) => item.id).sort((a, b) => a - b);
    expect(ids).toEqual(
      [primary.pastAppointmentId, primary.futureAppointmentId].sort((a, b) => a - b),
    );

    expect(ids).not.toContain(foreign.pastAppointmentId);
    expect(ids).not.toContain(foreign.futureAppointmentId);
  });
});
