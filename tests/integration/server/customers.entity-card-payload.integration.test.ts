/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - `/api/customers/list`, `/api/customers/:id` und `/api/customers/:id/appointments` liefern die fuer Kunden-Boardkarten, Table-Preview und Termin-Hover benoetigten Payloads vollstaendig.
 * - Aenderungen an Kundenstammdaten sowie an verknuepften Projekt-/Terminrelationen erscheinen im naechsten Listen-, Detail- und Sidebar-Abruf.
 *
 * Fehlerfaelle:
 * - Kundenkarten verlieren Adress-, Tag- oder Zaehlerdaten.
 * - Nach neuen Projekt-/Terminrelationen bleiben Liste oder Termin-Sidebar auf stale Daten.
 *
 * Ziel:
 * Vollstaendigkeit und Freshness der Kunden-Entity-Card-Payloads end-to-end absichern.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type express from "express";

import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import {
  attachCustomerTagFixture,
  createAppointmentFixture,
  createCustomerFixtureWithOverrides,
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
      cardColor: "#ea580c",
      print: false,
    })
    .expect(201);
}

async function buildCustomerCardFixture(prefix: string) {
  const admin = await loginAdminAgent(app);
  const attachmentFiles = await createTemporaryAttachmentFilesFixture(`${prefix.toLowerCase()}-customer`);
  const { systemTags } = await ensureSystemTagsFixture();
  const systemTag = systemTags[0];
  const customTag = await createExactTagFixture(`${prefix} Customer Tag`, "#0f766e");

  const customer = await createCustomerFixtureWithOverrides({
    prefix: `${prefix}-CUST`,
    firstName: "Karla",
    lastName: `${prefix} Kunde`,
    fullName: `Karla ${prefix} Kunde`,
    company: `${prefix} GmbH`,
    email: `${prefix.toLowerCase()}@example.test`,
    phone: "0421123123",
    addressLine1: "Mühlenweg 9",
    addressLine2: "Haus C",
    postalCode: "26122",
    city: "Oldenburg",
    country: "Deutschland",
  });

  const project = await createProjectFixtureWithOverrides({
    prefix: `${prefix}-PROJ`,
    customerId: customer.id,
    name: `${prefix} Projekt`,
    orderNumber: `${prefix}-ORD-7`,
    descriptionMd: `${prefix} Projektbeschreibung`,
    projectOrder: {
      amount: "17999.00",
      plannedDateText: "KW 19 / Dienstag",
      plannedWeek: "2099-W19",
    },
  });
  await createFilledProjectArticleListFixture({
    projectId: project.id,
    orderNumber: project.orderNumber ?? `${prefix}-ORD-7`,
    prefix,
  });

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(2),
  });

  await attachCustomerTagFixture(customer.id, systemTag.id);
  await attachCustomerTagFixture(customer.id, customTag.id);
  await createNote(admin, `/api/customers/${customer.id}/notes`, `${prefix} Kundennotiz`);
  await admin.post(`/api/customers/${customer.id}/attachments`).attach("file", attachmentFiles.pdf.path).expect(201);

  return {
    admin,
    customer,
    project,
    appointment,
    systemTag,
    customTag,
  };
}

function findCustomerItem(items: Array<Record<string, any>>, customerId: number) {
  const match = items.find((item) => item.id === customerId);
  expect(match).toBeDefined();
  if (!match) {
    throw new Error(`Customer ${customerId} not found in payload`);
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

describe("FT05+/FT03 integration: customer entity card payloads", () => {
  it("returns complete customer board, detail and appointment preview payloads", async () => {
    const fixture = await buildCustomerCardFixture("FT05-CUST-CARD");

    const listResponse = await fixture.admin
      .get("/api/customers/list?scope=active&page=1&pageSize=50")
      .expect(200);
    const listItem = findCustomerItem(listResponse.body.items as Array<Record<string, any>>, fixture.customer.id);
    expect(listItem).toMatchObject({
      id: fixture.customer.id,
      customerNumber: fixture.customer.customerNumber,
      fullName: fixture.customer.fullName,
      company: fixture.customer.company,
      email: fixture.customer.email,
      phone: fixture.customer.phone,
      addressLine1: fixture.customer.addressLine1,
      addressLine2: fixture.customer.addressLine2,
      postalCode: fixture.customer.postalCode,
      city: fixture.customer.city,
      country: fixture.customer.country,
      notesCount: 1,
      appointmentsCount: 1,
      attachmentsCount: 1,
    });
    expect(listItem.tags.map((tag: { id: number }) => tag.id).sort((a: number, b: number) => a - b)).toEqual(
      [fixture.systemTag.id, fixture.customTag.id].sort((a, b) => a - b),
    );

    const detailResponse = await fixture.admin.get(`/api/customers/${fixture.customer.id}`).expect(200);
    expect(detailResponse.body).toMatchObject({
      id: fixture.customer.id,
      fullName: fixture.customer.fullName,
      phone: fixture.customer.phone,
      email: fixture.customer.email,
      postalCode: fixture.customer.postalCode,
      country: fixture.customer.country,
    });
    expect(detailResponse.body.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: fixture.systemTag.id }),
        expect.objectContaining({ id: fixture.customTag.id }),
      ]),
    );

    const appointmentsResponse = await fixture.admin
      .get(`/api/customers/${fixture.customer.id}/appointments?scope=all&fromDate=${getRelativeBerlinDate(0)}`)
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
        country: fixture.customer.country,
      },
      customerNotesCount: 1,
      customerAttachmentsCount: 1,
      totalAttachmentsCount: 1,
    });
    expect(appointmentItem.projectArticleItems).toHaveLength(9);
  });

  it("reflects customer master-data and new project/appointment relations in the next payload", async () => {
    const fixture = await buildCustomerCardFixture("FT05-CUST-FRESH");

    const customerPatch = await fixture.admin
      .patch(`/api/customers/${fixture.customer.id}`)
      .send({
        version: fixture.customer.version,
        firstName: "Nele",
        lastName: "Aktuell",
        company: "Aktuell GmbH",
        email: "nele.aktuell@example.test",
        phone: "0421888999",
      })
      .expect(200);

    // MS-68: Rechnungsadresse über die Adress-API ändern (wie im echten Client); die Änderung
    // muss in der nächsten Board-/Detail-/Sidebar-Projektion (wirksame Lieferadresse) erscheinen.
    const billingAddress = ((await fixture.admin
      .get(`/api/customers/${fixture.customer.id}/addresses`)
      .expect(200)).body as Array<{ id: number; roleKey: string | null; version: number }>)
      .find((address) => address.roleKey === "BILLING")!;
    await fixture.admin
      .patch(`/api/customers/${fixture.customer.id}/addresses/${billingAddress.id}`)
      .send({
        addressLine1: "Hauptstraße 1",
        addressLine2: "Seite B",
        postalCode: "28203",
        city: "Bremen",
        country: "Luxemburg",
        version: billingAddress.version,
      })
      .expect(200);

    const secondProject = await createProjectFixtureWithOverrides({
      prefix: "FT05-CUST-FRESH-PROJ2",
      customerId: fixture.customer.id,
      name: "Zweites Kundenprojekt",
      orderNumber: "CUST-REL-2",
      descriptionMd: "Zweites Projekt fuer Kundenrelation",
      projectOrder: {
        amount: "5000.00",
        plannedDateText: "KW 22 / Montag",
        plannedWeek: "2099-W22",
      },
    });
    await createFilledProjectArticleListFixture({
      projectId: secondProject.id,
      orderNumber: secondProject.orderNumber ?? "CUST-REL-2",
      prefix: "FT05-CUST-FRESH-PROJ2",
    });
    const secondAppointment = await createAppointmentFixture({
      projectId: secondProject.id,
      startDate: getRelativeBerlinDate(4),
    });
    await createNote(fixture.admin, `/api/customers/${fixture.customer.id}/notes`, "Zweite Kundennotiz");

    const refreshedList = await fixture.admin
      .get("/api/customers/list?scope=active&page=1&pageSize=50")
      .expect(200);
    const refreshedListItem = findCustomerItem(refreshedList.body.items as Array<Record<string, any>>, fixture.customer.id);
    expect(refreshedListItem).toMatchObject({
      fullName: customerPatch.body.fullName,
      company: "Aktuell GmbH",
      email: "nele.aktuell@example.test",
      phone: "0421888999",
      postalCode: "28203",
      country: "Luxemburg",
      notesCount: 2,
      appointmentsCount: 2,
      attachmentsCount: 1,
    });

    const refreshedDetail = await fixture.admin.get(`/api/customers/${fixture.customer.id}`).expect(200);
    expect(refreshedDetail.body).toMatchObject({
      fullName: customerPatch.body.fullName,
      phone: "0421888999",
      email: "nele.aktuell@example.test",
      postalCode: "28203",
      city: "Bremen",
      country: "Luxemburg",
    });

    const refreshedAppointments = await fixture.admin
      .get(`/api/customers/${fixture.customer.id}/appointments?scope=all&fromDate=${getRelativeBerlinDate(0)}`)
      .expect(200);
    const appointmentIds = (refreshedAppointments.body as Array<{ id: number }>).map((item) => item.id);
    expect(appointmentIds).toEqual(expect.arrayContaining([fixture.appointment.id, secondAppointment.id]));
    const refreshedAppointmentItem = findAppointment(
      refreshedAppointments.body as Array<Record<string, any>>,
      fixture.appointment.id,
    );
    expect(refreshedAppointmentItem).toMatchObject({
      customer: {
        fullName: customerPatch.body.fullName,
        phone: "0421888999",
        email: "nele.aktuell@example.test",
        postalCode: "28203",
        country: "Luxemburg",
      },
      customerNotesCount: 2,
      customerAttachmentsCount: 1,
      totalAttachmentsCount: 1,
    });
  }, 15000);
});
