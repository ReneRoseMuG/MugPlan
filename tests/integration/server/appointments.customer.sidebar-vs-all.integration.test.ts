/**
 * Test Scope:
 *
 * Feature: FT04/FT05+ - Terminprojektion Kunde
 * Use Case: UC Sidebar zeigt nur aktuelle Kundentermine, Dialog "Alle Termine" zeigt komplette Historie
 *
 * Abgedeckte Regeln:
 * - /api/customers/:id/appointments?scope=upcoming liefert nur aktuelle/zukuenftige Termine.
 * - /api/customers/:id/appointments?scope=all liefert historische + aktuelle + zukuenftige Termine.
 * - Das Verhalten ist fuer mehrere Kunden gleichzeitig korrekt getrennt (keine Fremdtermine).
 * - Der Payload deckt die fuer Tabelle+Preview benoetigten Felder vollstaendig ab.
 *
 * Fehlerfaelle:
 * - Historische Termine erscheinen in der Sidebar-Projektion.
 * - Historische Termine fehlen in der "Alle Termine"-Projektion.
 * - Termine fremder Kunden gelangen in die aggregierten Listen.
 *
 * Ziel:
 * End-to-end absichern, dass Kunden-Sidebar und Kunden-"Alle Termine" die erwarteten Datumsfilter und Entitaetsgrenzen einhalten.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import * as customersService from "../../../server/services/customersService";
import * as projectsService from "../../../server/services/projectsService";
import * as appointmentsRepository from "../../../server/repositories/appointmentsRepository";

let app: express.Express;
let counter = 0;

const HISTORICAL_DATE = "2000-01-01";
const CURRENT_DATE = "2099-01-01";
const FUTURE_DATE = "2099-02-01";

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

function nextSeq() {
  counter += 1;
  return counter;
}

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username: "test-admin", password: "test-admin-password" }).expect(200);
  return agent;
}

async function createCustomerWithProjects(label: string) {
  const seq = nextSeq();
  const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const customer = await customersService.createCustomer({
    customerNumber: `CUST-SIDE-ALL-${label}-${seq}-${unique}`,
    firstName: "Cust",
    lastName: `Filter-${label}-${seq}`,
    fullName: `Filter-${label}-${seq}, Cust`,
    company: null,
    email: null,
    phone: "67890",
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    version: 1,
  });

  const projectPrimary = await projectsService.createProject({
    name: `Cust SidebarAll Primary ${label} ${seq}`,
    customerId: customer.id,
    descriptionMd: null,
    version: 1,
  });
  const projectSecondary = await projectsService.createProject({
    name: `Cust SidebarAll Secondary ${label} ${seq}`,
    customerId: customer.id,
    descriptionMd: null,
    version: 1,
  });

  return { customer, projects: [projectPrimary, projectSecondary] };
}

async function insertProjectAppointment(params: { projectId: number; startDate: string; title: string }) {
  const created = await appointmentsRepository.createAppointment(
    {
      projectId: params.projectId,
      tourId: null,
      title: params.title,
      description: null,
      startDate: new Date(`${params.startDate}T00:00:00`),
      startTime: null,
      endDate: null,
      endTime: null,
    },
    [],
  );
  return created.id as number;
}

describe("FT04/FT05+ integration: customer sidebar vs all appointments", () => {
  it("returns only current+future for sidebar and full history for all-appointments across multiple customers", async () => {
    const admin = await loginAdminAgent();
    const customerBundles = await Promise.all([
      createCustomerWithProjects("A"),
      createCustomerWithProjects("B"),
      createCustomerWithProjects("C"),
    ]);

    const expectedByCustomer = new Map<number, { historical: number; current: number; future: number; projectIds: number[] }>();

    for (const bundle of customerBundles) {
      const historicalId = await insertProjectAppointment({
        projectId: bundle.projects[0].id,
        startDate: HISTORICAL_DATE,
        title: `Historical ${bundle.customer.id}`,
      });
      const currentId = await insertProjectAppointment({
        projectId: bundle.projects[0].id,
        startDate: CURRENT_DATE,
        title: `Current ${bundle.customer.id}`,
      });
      const futureId = await insertProjectAppointment({
        projectId: bundle.projects[1].id,
        startDate: FUTURE_DATE,
        title: `Future ${bundle.customer.id}`,
      });
      expectedByCustomer.set(bundle.customer.id, {
        historical: historicalId,
        current: currentId,
        future: futureId,
        projectIds: bundle.projects.map((project) => project.id).sort((a, b) => a - b),
      });
    }

    for (const bundle of customerBundles) {
      const expected = expectedByCustomer.get(bundle.customer.id);
      if (!expected) throw new Error("Expected appointment ids for customer");

      const sidebarResponse = await admin.get(`/api/customers/${bundle.customer.id}/appointments?scope=upcoming`).expect(200);
      const sidebarItems = sidebarResponse.body as Array<{ id: number; customer: { id: number } }>;
      expect(sidebarItems).toHaveLength(2);
      expect(sidebarItems.map((item) => item.id).sort((a, b) => a - b)).toEqual(
        [expected.current, expected.future].sort((a, b) => a - b),
      );
      expect(sidebarItems.every((item) => item.customer.id === bundle.customer.id)).toBe(true);

      const allResponse = await admin.get(`/api/customers/${bundle.customer.id}/appointments?scope=all`).expect(200);
      const allItems = allResponse.body as Array<{
        id: number;
        version: number;
        projectName: string;
        projectOrderNumber: string | null;
        projectDescription: string | null;
        projectStatuses: Array<{ id: number; title: string; color: string }>;
        startDate: string;
        startTime: string | null;
        customer: {
          id: number;
          customerNumber: string;
          fullName: string | null;
          addressLine1: string | null;
          addressLine2: string | null;
          postalCode: string | null;
          city: string | null;
        };
        employees: Array<{ id: number; fullName: string }>;
        tourColor: string | null;
        isLocked: boolean;
      }>;
      expect(allItems).toHaveLength(3);
      expect(allItems.map((item) => item.id).sort((a, b) => a - b)).toEqual(
        [expected.historical, expected.current, expected.future].sort((a, b) => a - b),
      );
      expect(allItems.every((item) => item.customer.id === bundle.customer.id)).toBe(true);
      const sample = allItems[0];
      expect(sample).toEqual(expect.objectContaining({
        id: expect.any(Number),
        version: expect.any(Number),
        projectName: expect.any(String),
        projectStatuses: expect.any(Array),
        startDate: expect.any(String),
        customer: expect.objectContaining({
          id: expect.any(Number),
          customerNumber: expect.any(String),
        }),
        employees: expect.any(Array),
        isLocked: expect.any(Boolean),
      }));
      expect("projectOrderNumber" in sample).toBe(true);
      expect("projectDescription" in sample).toBe(true);
      expect("startTime" in sample).toBe(true);
      expect("tourColor" in sample).toBe(true);
      expect("fullName" in sample.customer).toBe(true);
      expect("addressLine1" in sample.customer).toBe(true);
      expect("addressLine2" in sample.customer).toBe(true);
      expect("postalCode" in sample.customer).toBe(true);
      expect("city" in sample.customer).toBe(true);
    }
  });

  it("allows fromDate override in test env for upcoming and ignores fromDate for all", async () => {
    const admin = await loginAdminAgent();
    const bundle = await createCustomerWithProjects("override");

    await insertProjectAppointment({ projectId: bundle.projects[0].id, startDate: HISTORICAL_DATE, title: "Historical override" });
    await insertProjectAppointment({ projectId: bundle.projects[0].id, startDate: CURRENT_DATE, title: "Current override" });
    await insertProjectAppointment({ projectId: bundle.projects[1].id, startDate: FUTURE_DATE, title: "Future override" });

    const withoutHeader = await admin
      .get(`/api/customers/${bundle.customer.id}/appointments?scope=upcoming&fromDate=${HISTORICAL_DATE}`)
      .expect(200);
    expect((withoutHeader.body as Array<{ id: number }>)).toHaveLength(3);

    const withHeader = await admin
      .get(`/api/customers/${bundle.customer.id}/appointments?scope=upcoming&fromDate=${HISTORICAL_DATE}`)
      .set("x-internal-debug", "1")
      .expect(200);
    expect((withHeader.body as Array<{ id: number }>)).toHaveLength(3);

    const allWithFromDate = await admin
      .get(`/api/customers/${bundle.customer.id}/appointments?scope=all&fromDate=${FUTURE_DATE}`)
      .expect(200);
    expect((allWithFromDate.body as Array<{ id: number }>)).toHaveLength(3);
  });
});
