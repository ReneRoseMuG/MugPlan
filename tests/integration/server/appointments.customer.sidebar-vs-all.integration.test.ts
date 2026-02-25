/**
 * Test Scope:
 *
 * Feature: FT04/FT05+ - Terminprojektion Kunde
 * Use Case: UC Sidebar zeigt nur aktuelle Kundentermine, Dialog "Alle Termine" zeigt komplette Historie
 *
 * Abgedeckte Regeln:
 * - Kunden-Sidebar-Logik (projektbasiert mit fromDate=2026-02-25) liefert nur Termine ab diesem Datum.
 * - Kunden-"Alle Termine"-Logik (projektbasiert mit fromDate=1900-01-01) liefert historische + aktuelle + zukuenftige Termine.
 * - Das Verhalten ist fuer mehrere Kunden gleichzeitig korrekt getrennt (keine Fremdtermine).
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

const SIDEBAR_FROM_DATE = "2026-02-25";
const ALL_FROM_DATE = "1900-01-01";

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

async function loadCustomerAppointmentsByProjects(admin: SuperAgentTest, customerId: number, fromDate: string) {
  const projectsResponse = await admin.get(`/api/projects?customerId=${customerId}&filter=all`).expect(200);
  const projects = projectsResponse.body as Array<{ id: number }>;

  const responses = await Promise.all(
    projects.map(async (project) => {
      const response = await admin.get(`/api/projects/${project.id}/appointments?fromDate=${fromDate}`).expect(200);
      return response.body as Array<{ id: number; startDate: string; customer: { id: number } }>;
    }),
  );

  return {
    projectIds: projects.map((project) => project.id),
    items: responses.flat(),
  };
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
        startDate: "2026-02-20",
        title: `Historical ${bundle.customer.id}`,
      });
      const currentId = await insertProjectAppointment({
        projectId: bundle.projects[0].id,
        startDate: "2026-02-25",
        title: `Current ${bundle.customer.id}`,
      });
      const futureId = await insertProjectAppointment({
        projectId: bundle.projects[1].id,
        startDate: "2026-03-05",
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

      const sidebar = await loadCustomerAppointmentsByProjects(admin, bundle.customer.id, SIDEBAR_FROM_DATE);
      expect(sidebar.projectIds.sort((a, b) => a - b)).toEqual(expected.projectIds);
      expect(sidebar.items).toHaveLength(2);
      expect(sidebar.items.every((item) => item.startDate >= SIDEBAR_FROM_DATE)).toBe(true);
      expect(sidebar.items.map((item) => item.id).sort((a, b) => a - b)).toEqual(
        [expected.current, expected.future].sort((a, b) => a - b),
      );
      expect(sidebar.items.every((item) => item.customer.id === bundle.customer.id)).toBe(true);

      const all = await loadCustomerAppointmentsByProjects(admin, bundle.customer.id, ALL_FROM_DATE);
      expect(all.projectIds.sort((a, b) => a - b)).toEqual(expected.projectIds);
      expect(all.items).toHaveLength(3);
      expect(all.items.map((item) => item.id).sort((a, b) => a - b)).toEqual(
        [expected.historical, expected.current, expected.future].sort((a, b) => a - b),
      );
      expect(all.items.every((item) => item.customer.id === bundle.customer.id)).toBe(true);
    }
  });
});

