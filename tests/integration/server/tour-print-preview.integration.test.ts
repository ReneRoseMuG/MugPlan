/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Druckvorschau-Endpoint liefert Zeitraum, Tour, Mitglieder und Termine fuer den angeforderten Wochenblock.
 * - Saunamodell und druckbare Notizen werden aus den bestehenden Aggregationsquellen fuer die Vorschau aufgeloest.
 *
 * Fehlerfaelle:
 * - Nicht druckbare Notizen gelangen in die Vorschauantwort.
 * - Nicht existierende Touren liefern keinen sauberen 404-Pfad.
 *
 * Ziel:
 * Den serverseitigen Aggregationsvertrag der Tour-Druckvorschau end-to-end absichern.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { endOfWeek, format, startOfWeek } from "date-fns";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import * as appointmentNotesService from "../../../server/services/appointmentNotesService";
import * as appointmentsService from "../../../server/services/appointmentsService";
import * as customerNotesService from "../../../server/services/customerNotesService";
import * as customersService from "../../../server/services/customersService";
import * as employeesService from "../../../server/services/employeesService";
import * as projectNotesService from "../../../server/services/projectNotesService";
import * as projectsService from "../../../server/services/projectsService";
import * as tourEmployeesService from "../../../server/services/tourEmployeesService";

let app: express.Express;
let counter = 1;

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

describe("FT31 integration: tour print preview", () => {
  it("aggregates members, sauna model and print-only notes for the preview payload", async () => {
    const admin = await loginAdminAgent();
    const seq = nextSeq();
    const tourResponse = await admin.post("/api/tours").send({ color: "#2266aa" }).expect(201);

    const employee = await employeesService.createEmployee({
      firstName: "Mia",
      lastName: `Print-${seq}`,
      phone: null,
      email: null,
      isActive: true,
    });
    await tourEmployeesService.assignEmployeesToTour(tourResponse.body.id, [{ employeeId: employee.id, version: employee.version }]);

    const customer = await customersService.createCustomer({
      customerNumber: `TPP-${Date.now()}-${seq}`,
      firstName: "Tour",
      lastName: `Preview-${seq}`,
      fullName: `Preview-${seq}, Tour`,
      company: null,
      email: null,
      phone: "12345",
      addressLine1: "Beispielweg 1",
      addressLine2: null,
      postalCode: "12345",
      city: "Berlin",
      version: 1,
    });

    const project = await projectsService.createProject({
      name: `Print Projekt ${seq}`,
      customerId: customer.id,
      orderNumber: `P-${seq}`,
      descriptionMd: null,
      version: 1,
    });

    const appointment = await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-06-17",
      endDate: "2099-06-18",
      tourId: tourResponse.body.id,
      employeeIds: [employee.id],
    });

    await customerNotesService.createCustomerNote(customer.id, {
      title: "Kunde drucken",
      body: "<p>Kundennotiz sichtbar</p>",
      print: true,
    });
    await customerNotesService.createCustomerNote(customer.id, {
      title: "Kunde intern",
      body: "<p>Darf nicht in die Vorschau</p>",
      print: false,
    });
    await projectNotesService.createProjectNote(project.id, {
      title: "Projekt drucken",
      body: "<p>Projektinfo</p>",
      print: true,
    });
    await appointmentNotesService.createAppointmentNote(appointment!.id, {
      title: "Termin drucken",
      body: "<p>Termininfo</p>",
      print: true,
    });

    const requestedFromDate = "2099-06-17";
    const expectedWeekStart = startOfWeek(new Date(`${requestedFromDate}T00:00:00`), { weekStartsOn: 1 });
    const expectedWeekEnd = endOfWeek(expectedWeekStart, { weekStartsOn: 1 });

    await admin
      .get(`/api/tours/${tourResponse.body.id}/print-preview?fromDate=${requestedFromDate}&weekCount=1`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual(
          expect.objectContaining({
            fromDate: format(expectedWeekStart, "yyyy-MM-dd"),
            toDate: format(expectedWeekEnd, "yyyy-MM-dd"),
            tour: expect.objectContaining({ id: tourResponse.body.id }),
          }),
        );
        expect(res.body.members).toEqual(
          expect.arrayContaining([expect.objectContaining({ id: employee.id, fullName: employee.fullName })]),
        );
        expect(res.body.weeks).toHaveLength(1);
        expect(res.body.appointments).toHaveLength(1);

        const previewAppointment = res.body.appointments[0];
        expect(previewAppointment).toEqual(
          expect.objectContaining({
            id: appointment!.id,
            projectId: project.id,
            projectName: project.name,
            durationDays: 2,
            saunaModel: null,
            customer: expect.objectContaining({ postalCode: "12345" }),
          }),
        );

        const noteTitles = previewAppointment.printNotes.map((note: { title: string }) => note.title);
        expect(noteTitles).toContain("Kunde drucken");
        expect(noteTitles).toContain("Projekt drucken");
        expect(noteTitles).toContain("Termin drucken");
        expect(noteTitles).not.toContain("Kunde intern");
      });
  });

  it("returns 404 for unknown tours", async () => {
    const admin = await loginAdminAgent();

    await admin
      .get("/api/tours/999999/print-preview?fromDate=2099-06-17&weekCount=1")
      .expect(404);
  });
});
