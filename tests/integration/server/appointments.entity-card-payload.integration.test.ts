/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - `/api/calendar/appointments?detail=full`, `/api/appointments/:id` und `/api/appointments/list` liefern die fuer Wochenkarte, Tabellen-Preview und Edit-Reopen benoetigten Termin-Card-Payloads vollstaendig.
 * - Aenderungen an Kundenstammdaten, Projektstammdaten, Artikelliste, Notizen, Anhaengen, Tags und Mitarbeiterrelationen erscheinen im naechsten Kalender- und Listenaufruf ohne stale Payload.
 *
 * Fehlerfaelle:
 * - Termin-Preview-Payloads verlieren Kundenkontaktfelder, Artikellisten, Aggregatzaehler oder Tag-Gruppen.
 * - Nach Parent-Mutationen liefern Kalender- oder Tabellenendpunkte veraltete Projektionen.
 *
 * Ziel:
 * Vollstaendigkeit und Freshness der Termin-Entity-Card-Payloads fuer Board- und Table-Preview end-to-end absichern.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type express from "express";

import * as projectsService from "../../../server/services/projectsService";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import {
  attachAppointmentTagFixture,
  attachCustomerTagFixture,
  attachProjectTagFixture,
  createCustomerFixtureWithOverrides,
  createEmployeeFixtureWithOverrides,
  createExactTagFixture,
  createEntityCardMasterDataFixture,
  createFilledProjectArticleListFixture,
  createProjectFixtureWithOverrides,
  createTemporaryAttachmentFilesFixture,
  ensureSystemTagsFixture,
  getRelativeBerlinDate,
  createAppointmentFixture,
} from "../../helpers/testDataFactory";

let app: express.Express;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function createNote(admin: Awaited<ReturnType<typeof loginAdminAgent>>, url: string, title: string) {
  await admin
    .post(url)
    .send({
      title,
      body: `<p>${title}</p>`,
      cardColor: "#0f766e",
      print: false,
    })
    .expect(201);
}

async function buildAppointmentCardFixture(prefix: string) {
  const admin = await loginAdminAgent(app);
  const attachmentFiles = await createTemporaryAttachmentFilesFixture(prefix.toLowerCase());
  const { systemTags } = await ensureSystemTagsFixture();
  const systemTag = systemTags[0];
  const customTag = await createExactTagFixture(`${prefix} Custom`, "#2563eb");

  const customer = await createCustomerFixtureWithOverrides({
    prefix: `${prefix}-CUST`,
    firstName: "Mara",
    lastName: `${prefix} Kunde`,
    fullName: `Mara ${prefix} Kunde`,
    company: `${prefix} GmbH`,
    email: `${prefix.toLowerCase()}@example.test`,
    phone: "0441123456",
    addressLine1: "Hafenweg 8",
    addressLine2: "Tor B",
    postalCode: "26135",
    city: "Oldenburg",
    country: "Deutschland",
  });

  const project = await createProjectFixtureWithOverrides({
    prefix: `${prefix}-PROJ`,
    customerId: customer.id,
    name: `${prefix} Projekt`,
    orderNumber: `${prefix}-ORD-001`,
    descriptionMd: `${prefix} Projektbeschreibung`,
    amount: "24599.90",
    projectOrder: {
      amount: "24599.90",
      plannedDateText: "KW 18 / Montag",
      plannedWeek: "2099-W18",
    },
  });

  await createFilledProjectArticleListFixture({
    projectId: project.id,
    orderNumber: project.orderNumber ?? `${prefix}-ORD-001`,
    prefix,
  });

  const employees = await Promise.all([
    createEmployeeFixtureWithOverrides({
      prefix: `${prefix}-EMP-A`,
      firstName: "Tina",
      lastName: `${prefix} Alpha`,
      phone: "0170000001",
      email: `${prefix.toLowerCase()}-alpha@example.test`,
    }),
    createEmployeeFixtureWithOverrides({
      prefix: `${prefix}-EMP-B`,
      firstName: "Jens",
      lastName: `${prefix} Beta`,
      phone: "0170000002",
      email: `${prefix.toLowerCase()}-beta@example.test`,
    }),
  ]);

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(1),
    employeeIds: employees.map((employee) => employee.id),
  });

  await attachCustomerTagFixture(customer.id, systemTag.id);
  await attachProjectTagFixture(project.id, customTag.id);
  await attachAppointmentTagFixture(appointment.id, customTag.id);

  await createNote(admin, `/api/customers/${customer.id}/notes`, `${prefix} Kundennotiz`);
  await createNote(admin, `/api/projects/${project.id}/notes`, `${prefix} Projektnotiz`);
  await createNote(admin, `/api/appointments/${appointment.id}/notes`, `${prefix} Terminnotiz`);

  await admin.post(`/api/customers/${customer.id}/attachments`).attach("file", attachmentFiles.pdf.path).expect(201);
  await admin.post(`/api/projects/${project.id}/attachments`).attach("file", attachmentFiles.docx.path).expect(201);
  await admin.post(`/api/appointments/${appointment.id}/attachments`).attach("file", attachmentFiles.png.path).expect(201);

  return {
    admin,
    customer,
    project,
    appointment,
    employees,
    attachmentFiles,
    customTag,
    systemTag,
  };
}

function findAppointment<T extends { id: number }>(items: T[], appointmentId: number) {
  const match = items.find((item) => item.id === appointmentId);
  expect(match).toBeDefined();
  if (!match) {
    throw new Error(`Appointment ${appointmentId} not found in payload`);
  }
  return match;
}

function normalizeDateOnly(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

describe("FT03/FT24/FT28 integration: appointment entity card payloads", () => {
  it("returns complete payloads for calendar week cards, table previews and edit reopen", async () => {
    const fixture = await buildAppointmentCardFixture("FT03-APPT-CARD");

    const calendarResponse = await fixture.admin
      .get(`/api/calendar/appointments?fromDate=${getRelativeBerlinDate(0)}&toDate=${getRelativeBerlinDate(7)}&detail=full`)
      .expect(200);

    const calendarItem = findAppointment(calendarResponse.body as Array<Record<string, any>>, fixture.appointment.id);
    expect(calendarItem).toMatchObject({
      id: fixture.appointment.id,
      projectId: fixture.project.id,
      projectName: fixture.project.name,
      projectOrderNumber: fixture.project.orderNumber,
      projectDescription: fixture.project.descriptionMd,
      customer: {
        id: fixture.customer.id,
        customerNumber: fixture.customer.customerNumber,
        fullName: fixture.customer.fullName,
        company: fixture.customer.company,
        phone: fixture.customer.phone,
        email: fixture.customer.email,
        addressLine1: fixture.customer.addressLine1,
        postalCode: fixture.customer.postalCode,
        city: fixture.customer.city,
        country: fixture.customer.country,
      },
      customerNotesCount: 1,
      projectNotesCount: 1,
      appointmentNotesCount: 1,
      customerAttachmentsCount: 1,
      projectAttachmentsCount: 1,
      appointmentAttachmentsCount: 1,
      totalAttachmentsCount: 3,
      isCancelled: false,
    });
    expect(calendarItem.projectArticleItems).toHaveLength(9);
    expect(calendarItem.projectArticleItems[0]).toEqual(expect.objectContaining({
      source: "product",
      shortCode: expect.any(String),
    }));
    expect(calendarItem.projectArticleItems.slice(1).every((item: { source?: string }) => item.source === "component")).toBe(true);
    expect(calendarItem.employees.map((employee: { id: number }) => employee.id).sort((a: number, b: number) => a - b)).toEqual(
      fixture.employees.map((employee) => employee.id).sort((a, b) => a - b),
    );
    expect(calendarItem.customerTags.some((tag: { id: number }) => tag.id === fixture.systemTag.id)).toBe(true);
    expect(calendarItem.projectTags.some((tag: { id: number }) => tag.id === fixture.customTag.id)).toBe(true);
    expect(calendarItem.appointmentTags.some((tag: { id: number }) => tag.id === fixture.customTag.id)).toBe(true);

    const detailResponse = await fixture.admin.get(`/api/appointments/${fixture.appointment.id}`).expect(200);
    expect(detailResponse.body.id).toBe(fixture.appointment.id);
    expect(detailResponse.body.projectId).toBe(fixture.project.id);
    expect(detailResponse.body.customerId).toBe(fixture.customer.id);
    expect(detailResponse.body.startDate).toBe(normalizeDateOnly(fixture.appointment.startDate));
    expect(detailResponse.body.appointmentTags).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: fixture.customTag.id })]),
    );
    expect(detailResponse.body.customerTags).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: fixture.systemTag.id })]),
    );
    expect(detailResponse.body.projectTags).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: fixture.customTag.id })]),
    );
    expect((detailResponse.body.employees as Array<{ id: number }>).map((employee) => employee.id).sort((a, b) => a - b)).toEqual(
      fixture.employees.map((employee) => employee.id).sort((a, b) => a - b),
    );

    const listResponse = await fixture.admin
      .get(`/api/appointments/list?projectId=${fixture.project.id}&page=1&pageSize=50`)
      .expect(200);
    const listItem = findAppointment(listResponse.body.items as Array<Record<string, any>>, fixture.appointment.id);
    expect(listItem).toMatchObject({
      id: fixture.appointment.id,
      version: fixture.appointment.version,
      projectName: fixture.project.name,
      projectOrderNumber: fixture.project.orderNumber,
      customer: {
        id: fixture.customer.id,
        fullName: fixture.customer.fullName,
        company: fixture.customer.company,
        phone: fixture.customer.phone,
        email: fixture.customer.email,
        postalCode: fixture.customer.postalCode,
        country: fixture.customer.country,
      },
      customerNotesCount: 1,
      projectNotesCount: 1,
      appointmentNotesCount: 1,
      customerAttachmentsCount: 1,
      projectAttachmentsCount: 1,
      appointmentAttachmentsCount: 1,
      totalAttachmentsCount: 3,
    });
    expect(listItem.projectArticleItems).toHaveLength(9);
    expect(listItem.projectArticleItems[0]).toEqual(expect.objectContaining({ source: "product" }));
  });

  it("reflects parent master-data and relation changes in the next calendar and table payload", async () => {
    const fixture = await buildAppointmentCardFixture("FT03-APPT-FRESH");

    await fixture.admin
      .get(`/api/calendar/appointments?fromDate=${getRelativeBerlinDate(0)}&toDate=${getRelativeBerlinDate(7)}&detail=full`)
      .expect(200);
    await fixture.admin.get(`/api/appointments/list?projectId=${fixture.project.id}&page=1&pageSize=50`).expect(200);

    const customerPatch = await fixture.admin
      .patch(`/api/customers/${fixture.customer.id}`)
      .send({
        version: fixture.customer.version,
        firstName: "Nora",
        lastName: "Frisch",
        company: "Frisch GmbH",
        email: "frisch@example.test",
        phone: "0499988877",
        addressLine1: "Neue Straße 4",
        addressLine2: "Etage 2",
        postalCode: "49377",
        city: "Vechta",
        country: "Luxemburg",
      })
      .expect(200);

    await projectsService.replaceProjectOrderItems(fixture.project.id, []);

    const projectPatch = await fixture.admin
      .patch(`/api/projects/${fixture.project.id}`)
      .send({
        version: fixture.project.version,
        name: "Frisches Projekt",
        orderNumber: "FRESH-ORD-9",
        descriptionMd: "Frische Beschreibung",
        projectOrder: {
          amount: "99999.00",
          plannedDateText: "KW 20 / Freitag",
          plannedWeek: "2099-W20",
        },
      })
      .expect(200);

    const freshOrderData = await createEntityCardMasterDataFixture({
      prefix: "FT03-APPT-FRESH-MUT",
      productCount: 2,
      componentsPerCategory: 3,
    });

    await projectsService.replaceProjectOrderItems(
      fixture.project.id,
      [
        {
          projectId: fixture.project.id,
          orderNumber: "FRESH-ORD-9",
          productId: freshOrderData.products[1]?.id ?? freshOrderData.products[0]?.id ?? null,
          componentId: null,
          quantity: 1,
        },
        ...freshOrderData.componentGroups.map((group) => ({
          projectId: fixture.project.id,
          orderNumber: "FRESH-ORD-9",
          productId: null,
          componentId: group.items[1]?.id ?? group.items[0]?.id ?? null,
          quantity: 1,
        })),
      ].map((item) => ({
        projectId: fixture.project.id,
        orderNumber: "FRESH-ORD-9",
        productId: item.productId ?? null,
        componentId: item.componentId ?? null,
        quantity: item.quantity ?? 1,
      })),
    );

    const extraEmployee = await createEmployeeFixtureWithOverrides({
      prefix: "FT03-APPT-FRESH-EMP-C",
      firstName: "Lena",
      lastName: "Gamma",
      phone: "0170000003",
      email: "gamma@example.test",
    });
    const detailBeforePatch = await fixture.admin.get(`/api/appointments/${fixture.appointment.id}`).expect(200);
    await fixture.admin
      .patch(`/api/appointments/${fixture.appointment.id}`)
      .send({
        version: detailBeforePatch.body.version,
        projectId: fixture.project.id,
        startDate: detailBeforePatch.body.startDate,
        employeeIds: [fixture.employees[0].id, extraEmployee.id],
      })
      .expect(200);

    await createNote(fixture.admin, `/api/projects/${fixture.project.id}/notes`, "Zusatz Projektnotiz");
    await fixture.admin
      .post(`/api/projects/${fixture.project.id}/attachments`)
      .attach("file", fixture.attachmentFiles.pdf.path)
      .expect(201);

    const refreshedCalendar = await fixture.admin
      .get(`/api/calendar/appointments?fromDate=${getRelativeBerlinDate(0)}&toDate=${getRelativeBerlinDate(7)}&detail=full`)
      .expect(200);
    const refreshedCalendarItem = findAppointment(
      refreshedCalendar.body as Array<Record<string, any>>,
      fixture.appointment.id,
    );
    expect(refreshedCalendarItem).toMatchObject({
      projectName: "Frisches Projekt",
      projectOrderNumber: "FRESH-ORD-9",
      projectDescription: "Frische Beschreibung",
      customer: {
        fullName: customerPatch.body.fullName,
        company: "Frisch GmbH",
        phone: "0499988877",
        email: "frisch@example.test",
        addressLine1: "Neue Straße 4",
        postalCode: "49377",
        city: "Vechta",
        country: "Luxemburg",
      },
      projectNotesCount: 2,
      projectAttachmentsCount: 2,
      totalAttachmentsCount: 4,
    });
    expect(refreshedCalendarItem.projectArticleItems).toHaveLength(9);
    expect(refreshedCalendarItem.projectArticleItems[0]).toEqual(expect.objectContaining({ source: "product" }));
    expect(refreshedCalendarItem.employees.map((employee: { id: number }) => employee.id).sort((a: number, b: number) => a - b)).toEqual(
      [fixture.employees[0].id, extraEmployee.id].sort((a, b) => a - b),
    );

    const refreshedList = await fixture.admin
      .get(`/api/appointments/list?projectId=${fixture.project.id}&page=1&pageSize=50`)
      .expect(200);
    const refreshedListItem = findAppointment(refreshedList.body.items as Array<Record<string, any>>, fixture.appointment.id);
    expect(refreshedListItem).toMatchObject({
      projectName: projectPatch.body.name,
      projectOrderNumber: projectPatch.body.orderNumber,
      customer: {
        fullName: customerPatch.body.fullName,
        phone: "0499988877",
        email: "frisch@example.test",
        postalCode: "49377",
        country: "Luxemburg",
      },
      projectNotesCount: 2,
      projectAttachmentsCount: 2,
      totalAttachmentsCount: 4,
    });
  });
});
