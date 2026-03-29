/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - `/api/employees`, `/api/employees/:id` und `/api/employees/:id/appointments` liefern die fuer Mitarbeiter-Boardkarten, Table-Preview und Termin-Hover benoetigten Payloads vollstaendig.
 * - Aenderungen an Mitarbeiterstammdaten, Notizen, Anhaengen und Terminrelationen erscheinen im naechsten Listen-, Detail- und Sidebar-Abruf.
 *
 * Fehlerfaelle:
 * - Mitarbeiterkarten verlieren Header-, Tag- oder Aggregatdaten.
 * - Nach Termin- oder Stammdatenmutationen bleiben Liste oder Preview auf stale Payloads.
 *
 * Ziel:
 * Vollstaendigkeit und Freshness der Mitarbeiter-Entity-Card- und Termin-Preview-Payloads end-to-end absichern.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type express from "express";

import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import {
  attachEmployeeTagFixture,
  createAppointmentFixture,
  createCustomerFixtureWithOverrides,
  createEmployeeFixtureWithOverrides,
  createExactTagFixture,
  createFilledProjectArticleListFixture,
  createProjectFixtureWithOverrides,
  createTemporaryAttachmentFilesFixture,
  ensureSystemTagsFixture,
  getRelativeBerlinDate,
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
      cardColor: "#0ea5e9",
      print: false,
    })
    .expect(201);
}

async function buildEmployeeCardFixture(prefix: string) {
  const admin = await loginAdminAgent(app);
  const attachmentFiles = await createTemporaryAttachmentFilesFixture(`${prefix.toLowerCase()}-employee`);
  const { systemTags } = await ensureSystemTagsFixture();
  const customTag = await createExactTagFixture(`${prefix} Employee Tag`, "#db2777");

  const employee = await createEmployeeFixtureWithOverrides({
    prefix: `${prefix}-EMP`,
    firstName: "Lara",
    lastName: `${prefix} Team`,
    phone: "0151000001",
    email: `${prefix.toLowerCase()}@example.test`,
  });

  const customer = await createCustomerFixtureWithOverrides({
    prefix: `${prefix}-CUST`,
    firstName: "Enno",
    lastName: `${prefix} Kunde`,
    fullName: `Enno ${prefix} Kunde`,
    company: `${prefix} GmbH`,
    email: `${prefix.toLowerCase()}-customer@example.test`,
    phone: "0441999000",
    addressLine1: "Ring 5",
    addressLine2: null,
    postalCode: "26121",
    city: "Oldenburg",
  });

  const project = await createProjectFixtureWithOverrides({
    prefix: `${prefix}-PROJ`,
    customerId: customer.id,
    name: `${prefix} Projekt`,
    orderNumber: `${prefix}-ORD-5`,
    descriptionMd: `${prefix} Projektbeschreibung`,
    projectOrder: {
      amount: "18000.00",
      plannedDateText: "KW 18 / Freitag",
      plannedWeek: "2099-W18",
    },
  });
  await createFilledProjectArticleListFixture({
    projectId: project.id,
    orderNumber: project.orderNumber ?? `${prefix}-ORD-5`,
    prefix,
  });

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(2),
    employeeIds: [employee.id],
  });

  await attachEmployeeTagFixture(employee.id, systemTags[0].id);
  await attachEmployeeTagFixture(employee.id, customTag.id);
  await createNote(admin, `/api/employees/${employee.id}/notes`, `${prefix} Mitarbeiternotiz`);
  await admin.post(`/api/employees/${employee.id}/attachments`).attach("file", attachmentFiles.pdf.path).expect(201);

  return {
    admin,
    employee,
    customer,
    project,
    appointment,
    attachmentFiles,
    customTag,
    systemTag: systemTags[0],
  };
}

function findEmployee(items: Array<Record<string, any>>, employeeId: number) {
  const match = items.find((item) => item.id === employeeId);
  expect(match).toBeDefined();
  if (!match) {
    throw new Error(`Employee ${employeeId} not found in payload`);
  }
  return match;
}

function findAppointment(items: Array<Record<string, any>>, appointmentId: number) {
  const match = items.find((item) => item.id === appointmentId);
  expect(match).toBeDefined();
  if (!match) {
    throw new Error(`Appointment ${appointmentId} not found in payload`);
  }
  return match;
}

describe("FT05+/FT03 integration: employee entity card payloads", () => {
  it("returns complete employee board, detail and appointment preview payloads", async () => {
    const fixture = await buildEmployeeCardFixture("FT05-EMP-CARD");

    const listResponse = await fixture.admin.get("/api/employees?scope=active").expect(200);
    const listItem = findEmployee(listResponse.body as Array<Record<string, any>>, fixture.employee.id);
    expect(listItem).toMatchObject({
      id: fixture.employee.id,
      fullName: fixture.employee.fullName,
      phone: fixture.employee.phone,
      email: fixture.employee.email,
      isActive: true,
      notesCount: 1,
      attachmentsCount: 1,
    });
    expect(listItem.tags.map((tag: { id: number }) => tag.id).sort((a: number, b: number) => a - b)).toEqual(
      [fixture.systemTag.id, fixture.customTag.id].sort((a, b) => a - b),
    );

    const detailResponse = await fixture.admin.get(`/api/employees/${fixture.employee.id}`).expect(200);
    expect(detailResponse.body).toMatchObject({
      employee: {
        id: fixture.employee.id,
        fullName: fixture.employee.fullName,
        phone: fixture.employee.phone,
        email: fixture.employee.email,
      },
      team: null,
      tour: null,
    });

    const appointmentsResponse = await fixture.admin
      .get(`/api/employees/${fixture.employee.id}/appointments?scope=all&fromDate=${getRelativeBerlinDate(0)}`)
      .expect(200);
    const appointmentItem = findAppointment(appointmentsResponse.body as Array<Record<string, any>>, fixture.appointment.id);
    expect(appointmentItem).toMatchObject({
      projectId: fixture.project.id,
      projectName: fixture.project.name,
      projectOrderNumber: fixture.project.orderNumber,
      customer: {
        id: fixture.customer.id,
        fullName: fixture.customer.fullName,
        phone: fixture.customer.phone,
        email: fixture.customer.email,
        postalCode: fixture.customer.postalCode,
      },
      employees: [expect.objectContaining({ id: fixture.employee.id })],
    });
    expect(appointmentItem.projectArticleItems).toHaveLength(9);
  });

  it("reflects employee master-data, counts and appointment relation changes in the next payload", async () => {
    const fixture = await buildEmployeeCardFixture("FT05-EMP-FRESH");

    const updateResponse = await fixture.admin
      .put(`/api/employees/${fixture.employee.id}`)
      .send({
        version: fixture.employee.version,
        firstName: "Lina",
        lastName: "Aktuell",
        phone: "0151999888",
        email: "lina.aktuell@example.test",
      })
      .expect(200);

    const secondAppointment = await createAppointmentFixture({
      projectId: fixture.project.id,
      startDate: getRelativeBerlinDate(4),
      employeeIds: [fixture.employee.id],
    });
    await createNote(fixture.admin, `/api/employees/${fixture.employee.id}/notes`, "Zweite Mitarbeiternotiz");
    await fixture.admin.post(`/api/employees/${fixture.employee.id}/attachments`).attach("file", fixture.attachmentFiles.png.path).expect(201);

    const refreshedList = await fixture.admin.get("/api/employees?scope=active").expect(200);
    const refreshedListItem = findEmployee(refreshedList.body as Array<Record<string, any>>, fixture.employee.id);
    expect(refreshedListItem).toMatchObject({
      fullName: updateResponse.body.fullName,
      phone: "0151999888",
      email: "lina.aktuell@example.test",
      notesCount: 2,
      attachmentsCount: 2,
    });

    const refreshedDetail = await fixture.admin.get(`/api/employees/${fixture.employee.id}`).expect(200);
    expect(refreshedDetail.body).toMatchObject({
      employee: {
        fullName: updateResponse.body.fullName,
        phone: "0151999888",
        email: "lina.aktuell@example.test",
      },
    });

    const refreshedAppointments = await fixture.admin
      .get(`/api/employees/${fixture.employee.id}/appointments?scope=all&fromDate=${getRelativeBerlinDate(0)}`)
      .expect(200);
    const refreshedIds = (refreshedAppointments.body as Array<{ id: number }>).map((item) => item.id);
    expect(refreshedIds).toEqual(expect.arrayContaining([fixture.appointment.id, secondAppointment.id]));
    const refreshedAppointmentItem = findAppointment(
      refreshedAppointments.body as Array<Record<string, any>>,
      fixture.appointment.id,
    );
    expect(refreshedAppointmentItem).toMatchObject({
      employees: [expect.objectContaining({ id: fixture.employee.id })],
      customer: {
        fullName: fixture.customer.fullName,
      },
    });
  });
});
