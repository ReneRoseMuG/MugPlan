/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - `/api/projects/list`, `/api/projects/:id` und `/api/projects/:id/appointments` liefern die fuer Projekt-Boardkarten, Table-Preview und Sidebar-Termine benoetigten Payloads vollstaendig.
 * - Aenderungen an Kundenstammdaten, Projektstammdaten, Artikelliste sowie Projektrelationen erscheinen im naechsten Listen-, Detail- und Sidebar-Abruf.
 *
 * Fehlerfaelle:
 * - Projektkarten verlieren Kundenpanel-, Artikellisten-, Tag- oder Footerdaten.
 * - Nach Kunden-/Projektmutation bleiben Board View, Table View oder Sidebar auf stale Daten.
 *
 * Ziel:
 * Vollstaendigkeit und Freshness der Projekt-Entity-Card- und Sidebar-Payloads end-to-end absichern.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type express from "express";

import * as projectsService from "../../../server/services/projectsService";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import {
  attachCustomerTagFixture,
  attachProjectTagFixture,
  createCustomerFixtureWithOverrides,
  createEntityCardMasterDataFixture,
  createExactTagFixture,
  createFilledProjectArticleListFixture,
  createProjectFixtureWithOverrides,
  createTemporaryAttachmentFilesFixture,
  createAppointmentFixture,
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
      cardColor: "#1d4ed8",
      print: false,
    })
    .expect(201);
}

async function buildProjectCardFixture(prefix: string) {
  const admin = await loginAdminAgent(app);
  const attachmentFiles = await createTemporaryAttachmentFilesFixture(`${prefix.toLowerCase()}-project`);
  const { systemTags } = await ensureSystemTagsFixture();
  const systemTag = systemTags[0];
  const customTag = await createExactTagFixture(`${prefix} Project Tag`, "#7c3aed");

  const customer = await createCustomerFixtureWithOverrides({
    prefix: `${prefix}-CUST`,
    firstName: "Paula",
    lastName: `${prefix} Kunde`,
    fullName: `Paula ${prefix} Kunde`,
    company: `${prefix} Holzbau`,
    email: `${prefix.toLowerCase()}@example.test`,
    phone: "0499111222",
    addressLine1: "Werkstraße 12",
    addressLine2: "Lager",
    postalCode: "49377",
    city: "Vechta",
    country: "Deutschland",
  });

  const project = await createProjectFixtureWithOverrides({
    prefix: `${prefix}-PROJ`,
    customerId: customer.id,
    name: `${prefix} Projekt`,
    orderNumber: `${prefix}-ORD-10`,
    descriptionMd: `${prefix} Projektbeschreibung`,
    amount: "32100.00",
    projectOrder: {
      amount: "32100.00",
      plannedDateText: "KW 17 / Mittwoch",
      plannedWeek: "2099-W17",
    },
  });

  await createFilledProjectArticleListFixture({
    projectId: project.id,
    orderNumber: project.orderNumber ?? `${prefix}-ORD-10`,
    prefix,
  });

  const appointment = await createAppointmentFixture({
    projectId: project.id,
    startDate: getRelativeBerlinDate(2),
  });

  await attachCustomerTagFixture(customer.id, systemTag.id);
  await attachProjectTagFixture(project.id, customTag.id);

  await createNote(admin, `/api/projects/${project.id}/notes`, `${prefix} Projektnotiz`);
  await admin.post(`/api/projects/${project.id}/attachments`).attach("file", attachmentFiles.pdf.path).expect(201);

  return {
    admin,
    customer,
    project,
    appointment,
    attachmentFiles,
    systemTag,
    customTag,
  };
}

function findProjectItem(items: Array<Record<string, any>>, projectId: number) {
  const match = items.find((item) => item.id === projectId);
  expect(match).toBeDefined();
  if (!match) {
    throw new Error(`Project ${projectId} not found in payload`);
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

describe("FT02/FT03 integration: project entity card payloads", () => {
  it("returns complete project board, detail and sidebar appointment payloads", async () => {
    const fixture = await buildProjectCardFixture("FT02-PROJ-CARD");

    const listResponse = await fixture.admin
      .get("/api/projects/list?scope=upcoming&page=1&pageSize=50")
      .expect(200);
    const listItem = findProjectItem(listResponse.body.items as Array<Record<string, any>>, fixture.project.id);
    expect(listItem).toMatchObject({
      id: fixture.project.id,
      name: fixture.project.name,
      orderNumber: fixture.project.orderNumber,
      descriptionMd: fixture.project.descriptionMd,
      notesCount: 1,
      appointmentsCount: 1,
      attachmentsCount: 1,
      customer: {
        id: fixture.customer.id,
        customerNumber: fixture.customer.customerNumber,
        fullName: fixture.customer.fullName,
        phone: fixture.customer.phone,
        email: fixture.customer.email,
        addressLine1: fixture.customer.addressLine1,
        postalCode: fixture.customer.postalCode,
        city: fixture.customer.city,
        country: fixture.customer.country,
      },
    });
    expect(listItem.projectArticleItems).toHaveLength(9);
    expect(listItem.tags.some((tag: { id: number }) => tag.id === fixture.customTag.id)).toBe(true);

    const detailResponse = await fixture.admin.get(`/api/projects/${fixture.project.id}`).expect(200);
    expect(detailResponse.body).toMatchObject({
      project: {
        id: fixture.project.id,
        name: fixture.project.name,
        orderNumber: fixture.project.orderNumber,
      },
      customer: {
        id: fixture.customer.id,
        fullName: fixture.customer.fullName,
      },
      projectOrder: {
        orderNumber: fixture.project.orderNumber,
      },
    });
    expect(detailResponse.body.tags).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: fixture.customTag.id })]),
    );
    expect(detailResponse.body.projectNotes).toHaveLength(1);
    expect(detailResponse.body.projectAttachments).toHaveLength(1);
    expect(detailResponse.body.projectAppointments).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: fixture.appointment.id })]),
    );

    const sidebarResponse = await fixture.admin
      .get(`/api/projects/${fixture.project.id}/appointments?fromDate=${getRelativeBerlinDate(0)}`)
      .expect(200);
    const sidebarItem = findAppointment(sidebarResponse.body as Array<Record<string, any>>, fixture.appointment.id);
    expect(sidebarItem).toMatchObject({
      projectName: fixture.project.name,
      projectOrderNumber: fixture.project.orderNumber,
      customer: {
        id: fixture.customer.id,
        fullName: fixture.customer.fullName,
        phone: fixture.customer.phone,
        email: fixture.customer.email,
        postalCode: fixture.customer.postalCode,
      },
      customerAttachmentsCount: 0,
      projectAttachmentsCount: 1,
      appointmentAttachmentsCount: 0,
      totalAttachmentsCount: 1,
    });
    expect(sidebarItem.projectArticleItems).toHaveLength(9);
  });

  it("reflects customer, project and relation changes in the next board, detail and sidebar payload", async () => {
    const fixture = await buildProjectCardFixture("FT02-PROJ-FRESH");

    const customerPatch = await fixture.admin
      .patch(`/api/customers/${fixture.customer.id}`)
      .send({
        version: fixture.customer.version,
        firstName: "Inga",
        lastName: "Neu",
        company: "Neu Holzbau",
        email: "inga.neu@example.test",
        phone: "0481555444",
        addressLine1: "Am Markt 3",
        addressLine2: "Büro",
        postalCode: "28195",
        city: "Bremen",
        country: "Luxemburg",
      })
      .expect(200);

    await projectsService.replaceProjectOrderItems(fixture.project.id, []);

    await fixture.admin
      .patch(`/api/projects/${fixture.project.id}`)
      .send({
        version: fixture.project.version,
        name: "Projekt Neu",
        orderNumber: "PROJ-NEU-44",
        descriptionMd: "Projektbeschreibung Neu",
        projectOrder: {
          amount: "999.00",
          plannedDateText: "KW 21 / Freitag",
          plannedWeek: "2099-W21",
        },
      })
      .expect(200);

    const freshMasterData = await createEntityCardMasterDataFixture({
      prefix: "FT02-PROJ-FRESH-MUT",
      productCount: 2,
      componentsPerCategory: 3,
    });
    await projectsService.replaceProjectOrderItems(
      fixture.project.id,
      [
        {
          projectId: fixture.project.id,
          orderNumber: "PROJ-NEU-44",
          productId: freshMasterData.products[1]?.id ?? freshMasterData.products[0]?.id ?? null,
          componentId: null,
          quantity: 1,
        },
        ...freshMasterData.componentGroups.map((group) => ({
          projectId: fixture.project.id,
          orderNumber: "PROJ-NEU-44",
          productId: null,
          componentId: group.items[1]?.id ?? group.items[0]?.id ?? null,
          quantity: 1,
        })),
      ],
    );

    const extraAppointment = await createAppointmentFixture({
      projectId: fixture.project.id,
      startDate: getRelativeBerlinDate(4),
    });
    await createNote(fixture.admin, `/api/projects/${fixture.project.id}/notes`, "Zweite Projektnotiz");
    await fixture.admin.post(`/api/projects/${fixture.project.id}/attachments`).attach("file", fixture.attachmentFiles.docx.path).expect(201);

    const refreshedList = await fixture.admin
      .get("/api/projects/list?scope=upcoming&page=1&pageSize=50")
      .expect(200);
    const refreshedListItem = findProjectItem(refreshedList.body.items as Array<Record<string, any>>, fixture.project.id);
    expect(refreshedListItem).toMatchObject({
      name: "Projekt Neu",
      orderNumber: "PROJ-NEU-44",
      descriptionMd: "Projektbeschreibung Neu",
      notesCount: 2,
      appointmentsCount: 2,
      attachmentsCount: 2,
      customer: {
        fullName: customerPatch.body.fullName,
        phone: "0481555444",
        email: "inga.neu@example.test",
        postalCode: "28195",
        country: "Luxemburg",
      },
    });
    expect(refreshedListItem.projectArticleItems).toHaveLength(9);

    const refreshedDetail = await fixture.admin.get(`/api/projects/${fixture.project.id}`).expect(200);
    expect(refreshedDetail.body).toMatchObject({
      project: {
        name: "Projekt Neu",
        orderNumber: "PROJ-NEU-44",
      },
      customer: {
        fullName: customerPatch.body.fullName,
      },
      projectOrder: {
        orderNumber: "PROJ-NEU-44",
      },
    });
    expect(refreshedDetail.body.projectNotes).toHaveLength(2);
    expect(refreshedDetail.body.projectAttachments).toHaveLength(2);
    expect(refreshedDetail.body.projectAppointments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: fixture.appointment.id }),
        expect.objectContaining({ id: extraAppointment.id }),
      ]),
    );

    const refreshedSidebar = await fixture.admin
      .get(`/api/projects/${fixture.project.id}/appointments?fromDate=${getRelativeBerlinDate(0)}`)
      .expect(200);
    const refreshedSidebarItem = findAppointment(refreshedSidebar.body as Array<Record<string, any>>, fixture.appointment.id);
    expect(refreshedSidebarItem).toMatchObject({
      projectName: "Projekt Neu",
      projectOrderNumber: "PROJ-NEU-44",
      customer: {
        fullName: customerPatch.body.fullName,
        phone: "0481555444",
        email: "inga.neu@example.test",
        postalCode: "28195",
        country: "Luxemburg",
      },
      projectNotesCount: 2,
      projectAttachmentsCount: 2,
      totalAttachmentsCount: 2,
    });
  });
});
