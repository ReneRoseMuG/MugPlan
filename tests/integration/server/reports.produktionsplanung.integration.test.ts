/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Produktionsplanung gruppiert konkrete Produkte und Komponenten je ausgewaehlter Kategorie und liefert die neuen FT26-Projektkarten.
 * - projectRows verwenden den fruehesten Termin im Zeitraum als repraesentativen Termin inklusive Dauer, Mitarbeitern, Notizen, Anhaengen und Tags.
 * - reportCardReasonTags enthalten serverseitig nur "Sondermaß" und "Anmerkungen"; Reklamation und Storno schliessen Projekte weiter hart aus.
 * - Nur ADMIN und DISPONENT duerfen den Report lesen; READER wird abgewiesen.
 *
 * Fehlerfaelle:
 * - Entfernte Sonderblock-Parameter werden weiter akzeptiert.
 * - projectRows verlieren Aggregationen oder den fruehesten Termin.
 * - Reklamations- oder Storno-Projekte bleiben im Report sichtbar.
 * - Rollenpruefung fehlt oder ist uneinheitlich.
 *
 * Ziel:
 * Den FT26-Endpunkt /api/reports/produktionsplanung inklusive neuem Contract und Ausschlussregeln end-to-end absichern.
 */
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../../server/db";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import * as appointmentAttachmentsService from "../../../server/services/appointmentAttachmentsService";
import * as appointmentNotesService from "../../../server/services/appointmentNotesService";
import * as projectAttachmentsService from "../../../server/services/projectAttachmentsService";
import * as projectNotesService from "../../../server/services/projectNotesService";
import { createApiTestApp, loginAdminAgent, loginAgent } from "../../helpers/apiTestHarness";
import {
  attachAppointmentTagFixture,
  attachProjectTagFixture,
  createAppointmentFixture,
  createComponentFixture,
  createCustomerFixtureWithOverrides,
  createEmployeeFixtureWithOverrides,
  createExactTagFixture,
  createProductFixture,
  createProjectFixture,
  createProjectOrderItemFixture,
  createTourFixture,
} from "../../helpers/testDataFactory";
import * as projectsService from "../../../server/services/projectsService";
import {
  MANAGED_REMARKS_TAG_NAME,
  MANAGED_REPORT_EXCLUSION_TAG_NAME,
  MANAGED_SPECIAL_MEASURE_TAG_COLOR,
  MANAGED_SPECIAL_MEASURE_TAG_NAME,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
} from "../../../shared/appointmentCancellation";
import { tags, type Tag } from "../../../shared/schema";

let app: Awaited<ReturnType<typeof createApiTestApp>>;
let authCounter = 1;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function createRoleAgent(roleCode: "DISPATCHER" | "READER") {
  const token = `${roleCode.toLowerCase()}-produktionsplanung-${authCounter}`;
  authCounter += 1;
  const password = `${token}-password`;
  const passwordHash = await hashPassword(password);
  await createUser({
    username: `test-${token}`,
    email: `test-${token}@local.test`,
    firstName: "Test",
    lastName: roleCode,
    passwordHash,
    roleCode,
  });
  return loginAgent(app, { username: `test-${token}`, password });
}

function buildAttachmentPayload(prefix: string) {
  const token = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    filename: `${token}.pdf`,
    originalName: `${token}.pdf`,
    mimeType: "application/pdf",
    fileSize: 128,
    storagePath: `integration-fixtures/${token}.pdf`,
    version: 1,
  };
}

async function createProduktionsplanungProjectFixture(params: {
  prefix: string;
  appointmentDates: Array<{ startDate: string; endDate?: string | null; employeeIds?: number[]; tourId?: number | null }>;
  descriptionMd?: string | null;
  productItems?: Array<{ categoryName: string; name: string; quantity: number; shortCode?: string | null }>;
  componentItems?: Array<{ categoryName: string; name: string; quantity: number; shortCode?: string | null }>;
  projectTags?: Tag[];
  appointmentTagsByIndex?: Tag[][];
}) {
  const customer = await createCustomerFixtureWithOverrides({
    prefix: `${params.prefix}-CUST`,
    fullName: `${params.prefix} Kunde`,
  });
  const project = await createProjectFixture({
    prefix: `${params.prefix}-PROJ`,
    customerId: customer.id,
    name: `${params.prefix} Projekt`,
  });
  const updatedProject = await projectsService.updateProject(project.id, {
    version: project.version,
    descriptionMd: params.descriptionMd ?? null,
  });
  if (!updatedProject) throw new Error("Expected updated project fixture.");

  const orderNumber = updatedProject.projectOrder?.orderNumber ?? updatedProject.orderNumber;
  if (!orderNumber) throw new Error("Expected order number.");

  const appointments = [];
  for (const appointmentDate of params.appointmentDates) {
    appointments.push(await createAppointmentFixture({
      projectId: project.id,
      startDate: appointmentDate.startDate,
      endDate: appointmentDate.endDate ?? null,
      employeeIds: appointmentDate.employeeIds ?? [],
      tourId: appointmentDate.tourId ?? null,
    }));
  }

  for (const tag of params.projectTags ?? []) {
    await attachProjectTagFixture(project.id, tag.id);
  }

  for (const [appointmentIndex, tagsForAppointment] of (params.appointmentTagsByIndex ?? []).entries()) {
    const appointment = appointments[appointmentIndex];
    if (!appointment) continue;
    for (const tag of tagsForAppointment ?? []) {
      await attachAppointmentTagFixture(appointment.id, tag.id);
    }
  }

  for (const item of params.productItems ?? []) {
    const product = await createProductFixture({ categoryName: item.categoryName, name: item.name, shortCode: item.shortCode ?? null });
    await createProjectOrderItemFixture({
      projectId: project.id,
      orderNumber,
      productId: product.id,
      quantity: item.quantity,
    });
  }

  for (const item of params.componentItems ?? []) {
    const component = await createComponentFixture({ categoryName: item.categoryName, name: item.name, shortCode: item.shortCode ?? null });
    await createProjectOrderItemFixture({
      projectId: project.id,
      orderNumber,
      componentId: component.id,
      quantity: item.quantity,
    });
  }

  return {
    customer,
    project: updatedProject,
    appointments,
  };
}

async function ensureExactTag(name: string, color?: string) {
  const [existing] = await db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      isDefault: tags.isDefault,
      version: tags.version,
    })
    .from(tags)
    .where(eq(tags.name, name))
    .limit(1);

  if (existing) {
    return existing;
  }

  return createExactTagFixture(name, color);
}

async function ensureManagedSpecialMeasureTag() {
  return ensureExactTag(MANAGED_SPECIAL_MEASURE_TAG_NAME, MANAGED_SPECIAL_MEASURE_TAG_COLOR);
}

describe("FT26 integration: report produktionsplanung", () => {
  it("groups selected categories and rejects the removed sonderblockTagIds parameter", async () => {
    const admin = await loginAdminAgent(app);
    const specialMeasureTag = await ensureManagedSpecialMeasureTag();
    const remarksTag = await ensureExactTag(MANAGED_REMARKS_TAG_NAME, "#2563eb");
    const visibleProject = await createProduktionsplanungProjectFixture({
      prefix: "FT26-PV-GROUPS",
      appointmentDates: [{ startDate: "2099-09-10" }],
      descriptionMd: "<p>Sichtbares Projekt</p>",
      projectTags: [specialMeasureTag],
      appointmentTagsByIndex: [[remarksTag]],
      productItems: [{ categoryName: "Fass Saunen", name: "Sauna A", quantity: 2 }],
      componentItems: [{ categoryName: "Fenster", name: "Fenster A", quantity: 4 }],
    });
    await createProduktionsplanungProjectFixture({
      prefix: "FT26-PV-NO-REASON",
      appointmentDates: [{ startDate: "2099-09-11" }],
      productItems: [{ categoryName: "Fass Saunen", name: "Sauna B", quantity: 3 }],
      componentItems: [{ categoryName: "Fenster", name: "Fenster B", quantity: 2 }],
    });

    const saunaCategoryId = (await createProductFixture({ categoryName: "Fass Saunen", name: "Lookup Sauna FT26" })).categoryId;
    const windowCategoryId = (await createComponentFixture({ categoryName: "Fenster", name: "Lookup Fenster FT26" })).categoryId;

    await admin
      .get(`/api/reports/produktionsplanung?fromDate=2099-09-01&toDate=2099-09-30&productCategoryIds=${saunaCategoryId}&componentCategoryIds=${windowCategoryId}&sonderblockTagIds=7`)
      .expect(422);

    const response = await admin
      .get(`/api/reports/produktionsplanung?fromDate=2099-09-01&toDate=2099-09-30&productCategoryIds=${saunaCategoryId}&componentCategoryIds=${windowCategoryId}`)
      .expect(200);

    expect(response.body.productCategoryGroups).toEqual([
      {
        categoryId: saunaCategoryId,
        categoryName: "Fass Saunen",
        items: [
          { itemName: "Sauna A", totalQuantity: 2 },
          { itemName: "Sauna B", totalQuantity: 3 },
        ],
      },
    ]);
    expect(response.body.componentCategoryGroups).toEqual([
      {
        categoryId: windowCategoryId,
        categoryName: "Fenster",
        items: [
          { itemName: "Fenster A", totalQuantity: 4 },
          { itemName: "Fenster B", totalQuantity: 2 },
        ],
      },
    ]);
    expect(response.body.projectRows).toEqual([
      expect.objectContaining({
        projectId: visibleProject.project.id,
        orderNumber: expect.stringContaining("ORD-FT26-PV-GROUPS-PROJ"),
        customerFullName: `${visibleProject.customer.fullName}`,
        customerNumber: expect.stringContaining("FT26-PV-GROUPS-CUST"),
      }),
    ]);
  });

  it("uses the earliest appointment in range as representative and aggregates card data", async () => {
    const admin = await loginAdminAgent(app);
    const specialMeasureTag = await ensureManagedSpecialMeasureTag();
    const remarksTag = await ensureExactTag(MANAGED_REMARKS_TAG_NAME, "#2563eb");
    const infoTag = await ensureExactTag("Info FT26", "#0f766e");
    const employee = await createEmployeeFixtureWithOverrides({
      prefix: "FT26-PV-EMP",
      firstName: "Mara",
      lastName: "Mitarbeiter",
    });
    const tour = await createTourFixture("#0f766e");

    const fixture = await createProduktionsplanungProjectFixture({
      prefix: "FT26-PV-CARD",
      appointmentDates: [
        { startDate: "2100-01-10", endDate: "2100-01-12", employeeIds: [employee.id], tourId: tour.id },
        { startDate: "2100-01-15", employeeIds: [], tourId: tour.id },
      ],
      descriptionMd: "<p>Kartenbeschreibung</p>",
      projectTags: [specialMeasureTag, infoTag],
      appointmentTagsByIndex: [[remarksTag], []],
      productItems: [{ categoryName: "Fass Saunen", name: "Sauna Lang", shortCode: "SL", quantity: 2 }],
      componentItems: [{ categoryName: "Fenster", name: "Fenster Breit", shortCode: "FB", quantity: 1 }],
    });

    await projectNotesService.createProjectNote(fixture.project.id, {
      title: "Projektnotiz",
      body: "Projektnotiz Body",
      print: true,
    });
    await appointmentNotesService.createAppointmentNote(fixture.appointments[0]!.id, {
      title: "Terminnotiz",
      body: "Terminnotiz Body",
      print: true,
    });
    await projectAttachmentsService.createProjectAttachment({
      projectId: fixture.project.id,
      ...buildAttachmentPayload("ft26-project-attachment"),
    });
    await appointmentAttachmentsService.createAppointmentAttachment({
      appointmentId: fixture.appointments[0]!.id,
      ...buildAttachmentPayload("ft26-appointment-attachment"),
    });

    const saunaCategoryId = (await createProductFixture({ categoryName: "Fass Saunen", name: "Lookup Sauna Rows" })).categoryId;
    const windowCategoryId = (await createComponentFixture({ categoryName: "Fenster", name: "Lookup Fenster Rows" })).categoryId;

    const response = await admin
      .get(`/api/reports/produktionsplanung?fromDate=2100-01-01&toDate=2100-01-31&productCategoryIds=${saunaCategoryId}&componentCategoryIds=${windowCategoryId}&useShortCodes=true`)
      .expect(200);

    expect(response.body.projectRows).toEqual([
      expect.objectContaining({
        projectId: fixture.project.id,
        projectName: "FT26-PV-CARD Projekt",
        orderNumber: expect.stringContaining("ORD-FT26-PV-CARD-PROJ"),
        customerNumber: expect.stringContaining("FT26-PV-CARD-CUST"),
        customerFullName: expect.stringContaining("FT26-PV-CARD-CUST"),
        actualDate: "2100-01-10",
        durationDays: 3,
        tourName: tour.name,
        employees: [{ id: employee.id, fullName: "Mitarbeiter, Mara" }],
        notesCount: 2,
        attachmentsCount: 2,
        tags: expect.arrayContaining([
          expect.objectContaining({ id: infoTag.id, name: "Info FT26" }),
          expect.objectContaining({ id: remarksTag.id, name: MANAGED_REMARKS_TAG_NAME }),
          expect.objectContaining({ id: specialMeasureTag.id, name: MANAGED_SPECIAL_MEASURE_TAG_NAME }),
        ]),
        reportCardReasonTags: [
          expect.objectContaining({ id: remarksTag.id, name: MANAGED_REMARKS_TAG_NAME }),
          expect.objectContaining({ id: specialMeasureTag.id, name: MANAGED_SPECIAL_MEASURE_TAG_NAME }),
        ],
        articleValues: expect.arrayContaining([
          { categoryId: saunaCategoryId, value: "SL" },
          { categoryId: windowCategoryId, value: "FB" },
        ]),
        projectDescription: "Kartenbeschreibung",
      }),
    ]);
  });

  it("excludes cancelled and reklamation projects from groups and projectRows", async () => {
    const admin = await loginAdminAgent(app);
    const reportExclusionTag = await ensureExactTag(MANAGED_REPORT_EXCLUSION_TAG_NAME, "#f97316");
    const cancellationTag = await ensureExactTag(RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME, "#ef4444");
    const specialMeasureTag = await ensureManagedSpecialMeasureTag();
    const remarksTag = await ensureExactTag(MANAGED_REMARKS_TAG_NAME, "#2563eb");

    const visibleProject = await createProduktionsplanungProjectFixture({
      prefix: "FT26-PV-VISIBLE",
      appointmentDates: [{ startDate: "2100-02-10" }],
      projectTags: [specialMeasureTag],
      appointmentTagsByIndex: [[remarksTag]],
      productItems: [{ categoryName: "Fass Saunen", name: "Visible Sauna", quantity: 3 }],
      componentItems: [{ categoryName: "Fenster", name: "Visible Fenster", quantity: 2 }],
    });
    const cancelledProject = await createProduktionsplanungProjectFixture({
      prefix: "FT26-PV-CANCELLED",
      appointmentDates: [{ startDate: "2100-02-11" }],
      projectTags: [specialMeasureTag],
      appointmentTagsByIndex: [[cancellationTag]],
      productItems: [{ categoryName: "Fass Saunen", name: "Cancelled Sauna", quantity: 1 }],
    });
    await createProduktionsplanungProjectFixture({
      prefix: "FT26-PV-REKL",
      appointmentDates: [{ startDate: "2100-02-12" }],
      projectTags: [reportExclusionTag, specialMeasureTag],
      productItems: [{ categoryName: "Fass Saunen", name: "Excluded Sauna", quantity: 4 }],
    });

    const saunaCategoryId = (await createProductFixture({ categoryName: "Fass Saunen", name: "Lookup Sauna Exclusion" })).categoryId;
    const windowCategoryId = (await createComponentFixture({ categoryName: "Fenster", name: "Lookup Fenster Exclusion" })).categoryId;

    const response = await admin
      .get(`/api/reports/produktionsplanung?fromDate=2100-02-01&toDate=2100-02-28&productCategoryIds=${saunaCategoryId}&componentCategoryIds=${windowCategoryId}`)
      .expect(200);

    expect(response.body.productCategoryGroups).toEqual([
      {
        categoryId: saunaCategoryId,
        categoryName: "Fass Saunen",
        items: [{ itemName: "Visible Sauna", totalQuantity: 3 }],
      },
    ]);
    expect(response.body.componentCategoryGroups).toEqual([
      {
        categoryId: windowCategoryId,
        categoryName: "Fenster",
        items: [{ itemName: "Visible Fenster", totalQuantity: 2 }],
      },
    ]);
    expect(response.body.projectRows).toEqual([
      expect.objectContaining({
        projectId: visibleProject.project.id,
      }),
    ]);
    expect(response.body.projectRows[0]?.projectId).not.toBe(cancelledProject.project.id);
  });

  it("allows dispatcher access and rejects reader access", async () => {
    const dispatcher = await createRoleAgent("DISPATCHER");
    const reader = await createRoleAgent("READER");

    await dispatcher.get("/api/reports/produktionsplanung?fromDate=2099-12-01").expect(200);
    await reader
      .get("/api/reports/produktionsplanung?fromDate=2099-12-01")
      .expect(403)
      .expect(({ body }) => {
        expect(body.code).toBe("FORBIDDEN");
      });
  });
});
