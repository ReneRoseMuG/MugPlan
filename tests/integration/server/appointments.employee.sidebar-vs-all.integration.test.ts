/**
 * Test Scope:
 *
 * Feature: FT04/FT05 - Terminprojektion Mitarbeiter
 * Use Case: UC Sidebar zeigt nur aktuelle Termine, Dialog "Alle Termine" zeigt Historie + Zukunft
 *
 * Abgedeckte Regeln:
 * - /api/employees/:id/current-appointments mit fromDate=2026-02-25 liefert nur Termine ab diesem Datum.
 * - /api/calendar/appointments mit employeeId und Range 1900-2100 liefert historische + aktuelle + zukuenftige Termine.
 * - Das Verhalten ist fuer mehrere Mitarbeiter gleichzeitig korrekt getrennt (keine Fremdtermine).
 *
 * Fehlerfaelle:
 * - Historische Termine erscheinen faelschlich in der Sidebar-Liste.
 * - "Alle Termine" blendet historische Termine aus.
 * - Termine anderer Mitarbeiter werden mitgeliefert.
 *
 * Ziel:
 * End-to-end absichern, dass Mitarbeiter-Sidebar und Mitarbeiter-"Alle Termine" unterschiedliche Filterlogik korrekt anwenden.
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
const ALL_TO_DATE = "2100-12-31";

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

async function createEmployee(admin: SuperAgentTest, label: string) {
  const seq = nextSeq();
  const response = await admin
    .post("/api/employees")
    .send({ firstName: `Emp-${label}-${seq}`, lastName: "Filter", phone: null, email: null })
    .expect(201);
  return response.body as { id: number; fullName: string };
}

async function createProjectForEmployee(label: string) {
  const seq = nextSeq();
  const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const customer = await customersService.createCustomer({
    customerNumber: `EMP-SIDE-ALL-${label}-${seq}-${unique}`,
    firstName: "Emp",
    lastName: `Customer-${label}-${seq}`,
    fullName: `Customer-${label}-${seq}, Emp`,
    company: null,
    email: null,
    phone: "12345",
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    version: 1,
  });

  return projectsService.createProject({
    name: `Emp SidebarAll Project ${label} ${seq}`,
    customerId: customer.id,
    descriptionMd: null,
    version: 1,
  });
}

async function insertAppointment(params: {
  projectId: number;
  employeeIds: number[];
  startDate: string;
  title: string;
}) {
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
    params.employeeIds,
  );
  return created.id as number;
}

describe("FT04/FT05 integration: employee sidebar vs all appointments", () => {
  it("returns only current+future for sidebar and full history for all-appointments across multiple employees", async () => {
    const admin = await loginAdminAgent();
    const employees = await Promise.all([
      createEmployee(admin, "A"),
      createEmployee(admin, "B"),
      createEmployee(admin, "C"),
    ]);
    const projects = await Promise.all([
      createProjectForEmployee("A"),
      createProjectForEmployee("B"),
      createProjectForEmployee("C"),
    ]);

    const expectedByEmployee = new Map<number, { historical: number; current: number; future: number }>();

    for (let index = 0; index < employees.length; index += 1) {
      const employee = employees[index];
      const project = projects[index];
      const historicalId = await insertAppointment({
        projectId: project.id,
        employeeIds: [employee.id],
        startDate: "2026-02-20",
        title: `Historical ${employee.id}`,
      });
      const currentId = await insertAppointment({
        projectId: project.id,
        employeeIds: [employee.id],
        startDate: "2026-02-25",
        title: `Current ${employee.id}`,
      });
      const futureId = await insertAppointment({
        projectId: project.id,
        employeeIds: [employee.id],
        startDate: "2026-03-05",
        title: `Future ${employee.id}`,
      });

      expectedByEmployee.set(employee.id, {
        historical: historicalId,
        current: currentId,
        future: futureId,
      });
    }

    for (const employee of employees) {
      const expected = expectedByEmployee.get(employee.id);
      if (!expected) throw new Error("Expected appointment ids for employee");

      const sidebarResponse = await admin
        .get(`/api/employees/${employee.id}/current-appointments?fromDate=${SIDEBAR_FROM_DATE}`)
        .expect(200);
      const sidebarItems = sidebarResponse.body as Array<{ id: number; startDate: string; employees: Array<{ id: number }> }>;

      expect(sidebarItems).toHaveLength(2);
      expect(sidebarItems.every((item) => item.startDate >= SIDEBAR_FROM_DATE)).toBe(true);
      expect(sidebarItems.map((item) => item.id).sort((a, b) => a - b)).toEqual(
        [expected.current, expected.future].sort((a, b) => a - b),
      );
      expect(sidebarItems.every((item) => item.employees.some((entry) => entry.id === employee.id))).toBe(true);

      const allResponse = await admin
        .get(`/api/calendar/appointments?fromDate=${ALL_FROM_DATE}&toDate=${ALL_TO_DATE}&detail=full&employeeId=${employee.id}`)
        .expect(200);
      const allItems = allResponse.body as Array<{ id: number; employees: Array<{ id: number }> }>;

      expect(allItems).toHaveLength(3);
      expect(allItems.map((item) => item.id).sort((a, b) => a - b)).toEqual(
        [expected.historical, expected.current, expected.future].sort((a, b) => a - b),
      );
      expect(allItems.every((item) => item.employees.some((entry) => entry.id === employee.id))).toBe(true);
    }
  });
});

