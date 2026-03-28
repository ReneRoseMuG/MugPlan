/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Druckvorschau-Endpoint liefert Zeitraum, Tour, Mitglieder und Termine fuer den angeforderten Wochenblock.
 * - Saunamodell und druckbare Notizen werden aus den bestehenden Aggregationsquellen fuer die Vorschau aufgeloest.
 * - Tags aus Termin, Kunde und Projekt werden je Termin korrekt in die Response gemappt.
 * - Termin ohne Projekt liefert leeren projectName statt "Ohne Projekt".
 *
 * Fehlerfaelle:
 * - Nicht druckbare Notizen gelangen in die Vorschauantwort.
 * - Nicht existierende Touren liefern keinen sauberen 404-Pfad.
 * - Tags werden in das falsche Array gemappt.
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
import {
  createExactTagFixture,
  attachAppointmentTagFixture,
  attachProjectTagFixture,
} from "../../helpers/testDataFactory";
import { db } from "../../../server/db";
import { customerTags } from "@shared/schema";

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

  it("returns appointments without tour assignment when tourId is 0", async () => {
    const admin = await loginAdminAgent();
    const seq = nextSeq();

    const customer = await customersService.createCustomer({
      customerNumber: `TPP-OT-${Date.now()}-${seq}`,
      firstName: "Ohne",
      lastName: `Tour-${seq}`,
      fullName: `Tour-${seq}, Ohne`,
      company: null,
      email: null,
      phone: "12345",
      addressLine1: "Testgasse 1",
      addressLine2: null,
      postalCode: "10115",
      city: "Berlin",
      version: 1,
    });

    const project = await projectsService.createProject({
      name: `OhTour Projekt ${seq}`,
      customerId: customer.id,
      orderNumber: `OT-${seq}`,
      descriptionMd: null,
      version: 1,
    });

    // Termin ohne Tour-Zuordnung
    const appointmentWithoutTour = await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-07-14",
      endDate: "2099-07-14",
      tourId: null,
      employeeIds: [],
    });

    // Termin mit echter Tour – darf nicht erscheinen
    const tourWithId = await admin.post("/api/tours").send({ color: "#ff0000" }).expect(201);
    await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: "2099-07-14",
      endDate: "2099-07-14",
      tourId: tourWithId.body.id,
      employeeIds: [],
    });

    const requestedFromDate = "2099-07-14";
    const expectedWeekStart = startOfWeek(new Date(`${requestedFromDate}T00:00:00`), { weekStartsOn: 1 });
    const expectedWeekEnd = endOfWeek(expectedWeekStart, { weekStartsOn: 1 });

    await admin
      .get(`/api/tours/0/print-preview?fromDate=${requestedFromDate}&weekCount=1`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual(
          expect.objectContaining({
            fromDate: format(expectedWeekStart, "yyyy-MM-dd"),
            toDate: format(expectedWeekEnd, "yyyy-MM-dd"),
            tour: { id: 0, name: "Ohne Tour", color: null },
          }),
        );
        expect(res.body.members).toEqual([]);
        expect(res.body.weeks).toHaveLength(1);

        const ids = res.body.appointments.map((a: { id: number }) => a.id);
        expect(ids).toContain(appointmentWithoutTour!.id);
        expect(ids).not.toContain(tourWithId.body.id);
      });
  });

  it("liefert appointmentTag korrekt in appointmentTags der Response", async () => {
    const admin = await loginAdminAgent();
    const seq = nextSeq();
    const tourRes = await admin.post("/api/tours").send({ color: "#aabbcc" }).expect(201);
    const customer = await customersService.createCustomer({
      customerNumber: `TAG-APT-${Date.now()}-${seq}`,
      firstName: "Tag", lastName: `Apt-${seq}`, fullName: `Apt-${seq}, Tag`,
      company: null, email: null, phone: null, addressLine1: null, addressLine2: null,
      postalCode: "10000", city: "Berlin", version: 1,
    });
    const project = await projectsService.createProject({
      name: `Tag-Appt-Projekt-${seq}`, customerId: customer.id,
      orderNumber: `TA-${seq}`, descriptionMd: null, version: 1,
    });
    const appointment = await appointmentsService.createAppointment({
      projectId: project.id, startDate: "2099-08-04", endDate: "2099-08-04",
      tourId: tourRes.body.id, employeeIds: [],
    });
    const tag = await createExactTagFixture(`Reklamation-${seq}`);
    await attachAppointmentTagFixture(appointment!.id, tag.id);

    await admin
      .get(`/api/tours/${tourRes.body.id}/print-preview?fromDate=2099-08-04&weekCount=1`)
      .expect(200)
      .expect((res) => {
        const appt = res.body.appointments[0];
        expect(appt.appointmentTags).toEqual(expect.arrayContaining([expect.objectContaining({ id: tag.id })]));
        expect(appt.customerTags).toEqual([]);
        expect(appt.projectTags).toEqual([]);
      });
  });

  it("liefert customerTag korrekt in customerTags der Response", async () => {
    const admin = await loginAdminAgent();
    const seq = nextSeq();
    const tourRes = await admin.post("/api/tours").send({ color: "#ccbbaa" }).expect(201);
    const customer = await customersService.createCustomer({
      customerNumber: `TAG-CST-${Date.now()}-${seq}`,
      firstName: "Tag", lastName: `Cst-${seq}`, fullName: `Cst-${seq}, Tag`,
      company: null, email: null, phone: null, addressLine1: null, addressLine2: null,
      postalCode: "20000", city: "Hamburg", version: 1,
    });
    const project = await projectsService.createProject({
      name: `Tag-Cust-Projekt-${seq}`, customerId: customer.id,
      orderNumber: `TC-${seq}`, descriptionMd: null, version: 1,
    });
    const appointment = await appointmentsService.createAppointment({
      projectId: project.id, startDate: "2099-08-11", endDate: "2099-08-11",
      tourId: tourRes.body.id, employeeIds: [],
    });
    const tag = await createExactTagFixture(`Sondermaß-${seq}`);
    await db.insert(customerTags).values({ customerId: customer.id, tagId: tag.id, version: 1 });

    await admin
      .get(`/api/tours/${tourRes.body.id}/print-preview?fromDate=2099-08-11&weekCount=1`)
      .expect(200)
      .expect((res) => {
        const appt = res.body.appointments[0];
        expect(appt.customerTags).toEqual(expect.arrayContaining([expect.objectContaining({ id: tag.id })]));
        expect(appt.appointmentTags).toEqual([]);
      });
  });

  it("liefert projectTag korrekt in projectTags der Response", async () => {
    const admin = await loginAdminAgent();
    const seq = nextSeq();
    const tourRes = await admin.post("/api/tours").send({ color: "#112233" }).expect(201);
    const customer = await customersService.createCustomer({
      customerNumber: `TAG-PRJ-${Date.now()}-${seq}`,
      firstName: "Tag", lastName: `Prj-${seq}`, fullName: `Prj-${seq}, Tag`,
      company: null, email: null, phone: null, addressLine1: null, addressLine2: null,
      postalCode: "30000", city: "Köln", version: 1,
    });
    const project = await projectsService.createProject({
      name: `Tag-Proj-Projekt-${seq}`, customerId: customer.id,
      orderNumber: `TP-${seq}`, descriptionMd: null, version: 1,
    });
    await appointmentsService.createAppointment({
      projectId: project.id, startDate: "2099-08-18", endDate: "2099-08-18",
      tourId: tourRes.body.id, employeeIds: [],
    });
    const tag = await createExactTagFixture(`ProjTag-${seq}`);
    await attachProjectTagFixture(project.id, tag.id);

    await admin
      .get(`/api/tours/${tourRes.body.id}/print-preview?fromDate=2099-08-18&weekCount=1`)
      .expect(200)
      .expect((res) => {
        const appt = res.body.appointments[0];
        expect(appt.projectTags).toEqual(expect.arrayContaining([expect.objectContaining({ id: tag.id })]));
        expect(appt.appointmentTags).toEqual([]);
        expect(appt.customerTags).toEqual([]);
      });
  });

  it("liefert leere Tag-Arrays wenn Termin keine Tags hat", async () => {
    const admin = await loginAdminAgent();
    const seq = nextSeq();
    const tourRes = await admin.post("/api/tours").send({ color: "#445566" }).expect(201);
    const customer = await customersService.createCustomer({
      customerNumber: `TAG-NONE-${Date.now()}-${seq}`,
      firstName: "Tag", lastName: `None-${seq}`, fullName: `None-${seq}, Tag`,
      company: null, email: null, phone: null, addressLine1: null, addressLine2: null,
      postalCode: "40000", city: "München", version: 1,
    });
    const project = await projectsService.createProject({
      name: `NoTag-Projekt-${seq}`, customerId: customer.id,
      orderNumber: `NT-${seq}`, descriptionMd: null, version: 1,
    });
    await appointmentsService.createAppointment({
      projectId: project.id, startDate: "2099-09-01", endDate: "2099-09-01",
      tourId: tourRes.body.id, employeeIds: [],
    });

    await admin
      .get(`/api/tours/${tourRes.body.id}/print-preview?fromDate=2099-09-01&weekCount=1`)
      .expect(200)
      .expect((res) => {
        const appt = res.body.appointments[0];
        expect(appt.appointmentTags).toEqual([]);
        expect(appt.customerTags).toEqual([]);
        expect(appt.projectTags).toEqual([]);
      });
  });

  it("liefert Tags aus zwei Quellen korrekt in die richtigen Arrays", async () => {
    const admin = await loginAdminAgent();
    const seq = nextSeq();
    const tourRes = await admin.post("/api/tours").send({ color: "#667788" }).expect(201);
    const customer = await customersService.createCustomer({
      customerNumber: `TAG-TWO-${Date.now()}-${seq}`,
      firstName: "Tag", lastName: `Two-${seq}`, fullName: `Two-${seq}, Tag`,
      company: null, email: null, phone: null, addressLine1: null, addressLine2: null,
      postalCode: "50000", city: "Frankfurt", version: 1,
    });
    const project = await projectsService.createProject({
      name: `TwoTag-Projekt-${seq}`, customerId: customer.id,
      orderNumber: `TT-${seq}`, descriptionMd: null, version: 1,
    });
    const appointment = await appointmentsService.createAppointment({
      projectId: project.id, startDate: "2099-09-08", endDate: "2099-09-08",
      tourId: tourRes.body.id, employeeIds: [],
    });
    const aptTag = await createExactTagFixture(`AptTag-${seq}`);
    const cstTag = await createExactTagFixture(`CstTag-${seq}`);
    await attachAppointmentTagFixture(appointment!.id, aptTag.id);
    await db.insert(customerTags).values({ customerId: customer.id, tagId: cstTag.id, version: 1 });

    await admin
      .get(`/api/tours/${tourRes.body.id}/print-preview?fromDate=2099-09-08&weekCount=1`)
      .expect(200)
      .expect((res) => {
        const appt = res.body.appointments[0];
        expect(appt.appointmentTags).toEqual(expect.arrayContaining([expect.objectContaining({ id: aptTag.id })]));
        expect(appt.customerTags).toEqual(expect.arrayContaining([expect.objectContaining({ id: cstTag.id })]));
        expect(appt.appointmentTags.map((t: { id: number }) => t.id)).not.toContain(cstTag.id);
        expect(appt.customerTags.map((t: { id: number }) => t.id)).not.toContain(aptTag.id);
      });
  });

  it("liefert leeren projectName wenn Termin ohne Projekt angelegt ist", async () => {
    const admin = await loginAdminAgent();
    const seq = nextSeq();
    const tourRes = await admin.post("/api/tours").send({ color: "#778899" }).expect(201);
    const customer = await customersService.createCustomer({
      customerNumber: `TAG-NOPROJ-${Date.now()}-${seq}`,
      firstName: "Ohne", lastName: `Projekt-${seq}`, fullName: `Projekt-${seq}, Ohne`,
      company: null, email: null, phone: null, addressLine1: null, addressLine2: null,
      postalCode: "60000", city: "Stuttgart", version: 1,
    });
    await appointmentsService.createAppointment({
      projectId: null, startDate: "2099-09-15", endDate: "2099-09-15",
      tourId: tourRes.body.id, employeeIds: [],
      customerId: customer.id,
    });

    await admin
      .get(`/api/tours/${tourRes.body.id}/print-preview?fromDate=2099-09-15&weekCount=1`)
      .expect(200)
      .expect((res) => {
        const appt = res.body.appointments[0];
        expect(appt.projectName).toBe("");
        expect(appt.projectId).toBeNull();
      });
  });
});
