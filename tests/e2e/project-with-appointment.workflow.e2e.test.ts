/**
 * Test Scope:
 *
 * Feature: FT01/FT02 - End-to-End Workflow
 * Use Case: UC Projekt mit Termin anlegen
 *
 * Abgedeckte Regeln:
 * - Voller API-Workflow fuer Kunde -> Projekt -> Termin funktioniert.
 * - Angelegter Termin ist ueber Projekt-Terminliste abrufbar.
 *
 * Fehlerfaelle:
 * - Workflow scheitert bei API-Kette trotz gueltiger Daten.
 *
 * Ziel:
 * Minimalen E2E-Workflow fuer Kernobjekte als Startpunkt der E2E-Ebene absichern.
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildCustomerPayload, resetTestDataFactoryState } from "../helpers/testDataFactory";
import { createApiTestApp, loginAdminAgent } from "../helpers/apiTestHarness";
import type express from "express";

let app: express.Express;

beforeAll(async () => {
  app = await createApiTestApp();
});

beforeEach(() => {
  resetTestDataFactoryState();
});

describe("E-001 e2e: create project with appointment", () => {
  it("creates customer, project, appointment and lists appointment by project", async () => {
    const admin = await loginAdminAgent(app);
    const customerPayload = buildCustomerPayload("E2E-CUST");

    const createdCustomer = await admin
      .post("/api/customers")
      .send(customerPayload)
      .expect(201);
    const customer = createdCustomer.body as { id: number; customerNumber: string };

    const createdProject = await admin
      .post("/api/projects")
      .send({
        name: "E2E Projekt",
        customerId: customer.id,
        orderNumber: "E2E-PROJ-0001",
        descriptionMd: null,
      })
      .expect(201);
    const project = createdProject.body as { id: number; version: number };

    const createdAppointment = await admin
      .post("/api/appointments")
      .send({
        projectId: project.id,
        startDate: "2099-09-01",
        employeeIds: [],
      })
      .expect(201);
    const appointment = createdAppointment.body as { id: number; projectId: number; startDate: string };

    expect(appointment.projectId).toBe(project.id);
    expect(appointment.startDate.startsWith("2099-09-01")).toBe(true);

    const listed = await admin
      .get(`/api/projects/${project.id}/appointments?fromDate=2000-01-01`)
      .expect(200);
    const items = listed.body as Array<{ id: number; projectId: number; customer: { id: number } }>;

    expect(items.some((item) => item.id === appointment.id)).toBe(true);
    expect(items.every((item) => item.projectId === project.id)).toBe(true);
    expect(items.every((item) => item.customer.id === customer.id)).toBe(true);
  });
});
