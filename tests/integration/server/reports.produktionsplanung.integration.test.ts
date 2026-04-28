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
import * as customerAttachmentsService from "../../../server/services/customerAttachmentsService";
import * as customerNotesService from "../../../server/services/customerNotesService";
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
  MANAGED_MIRRORED_TAG_NAME,
  MANAGED_REMARKS_TAG_NAME,
  MANAGED_COMPLAINT_TAG_NAME,
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
    const mirroredTag = await ensureExactTag(MANAGED_MIRRORED_TAG_NAME, "#0891b2");
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
      projectTags: [specialMeasureTag, infoTag, mirroredTag],
      appointmentTagsByIndex: [[remarksTag], []],
      productItems: [{ categoryName: "Fass Saunen", name: "Sauna Lang", shortCode: "SL", quantity: 2 }],
      componentItems: [{ categoryName: "Fenster", name: "Fenster Breit", shortCode: "FB", quantity: 1 }],
    });

    await projectNotesService.createProjectNote(fixture.project.id, {
      title: "Projektnotiz",
      body: "Projektnotiz Body",
      print: true,
    });
    await customerNotesService.createCustomerNote(fixture.customer.id, {
      title: "Kundennotiz",
      body: "Kundennotiz Body",
      print: true,
    });
    await appointmentNotesService.createAppointmentNote(fixture.appointments[0]!.id, {
      title: "Terminnotiz",
      body: "Terminnotiz Body",
      print: true,
    });
    await customerAttachmentsService.createCustomerAttachment({
      customerId: fixture.customer.id,
      ...buildAttachmentPayload("ft26-customer-attachment"),
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
        customerId: fixture.customer.id,
        appointmentId: fixture.appointments[0]!.id,
        projectName: "FT26-PV-CARD Projekt",
        orderNumber: expect.stringContaining("ORD-FT26-PV-CARD-PROJ"),
        customerNumber: expect.stringContaining("FT26-PV-CARD-CUST"),
        customerFullName: expect.stringContaining("FT26-PV-CARD-CUST"),
        actualDate: "2100-01-10",
        durationDays: 3,
        tourName: tour.name,
        employees: [{ id: employee.id, fullName: "Mitarbeiter, Mara" }],
        customerNotesCount: 1,
        projectNotesCount: 1,
        appointmentNotesCount: 1,
        notesCount: 3,
        customerAttachmentsCount: 1,
        projectAttachmentsCount: 1,
        appointmentAttachmentsCount: 1,
        attachmentsCount: 3,
        tags: expect.arrayContaining([
          expect.objectContaining({ id: infoTag.id, name: "Info FT26" }),
          expect.objectContaining({ id: mirroredTag.id, name: MANAGED_MIRRORED_TAG_NAME }),
          expect.objectContaining({ id: remarksTag.id, name: MANAGED_REMARKS_TAG_NAME }),
          expect.objectContaining({ id: specialMeasureTag.id, name: MANAGED_SPECIAL_MEASURE_TAG_NAME }),
        ]),
        reportCardReasonTags: [
          expect.objectContaining({ id: remarksTag.id, name: MANAGED_REMARKS_TAG_NAME }),
          expect.objectContaining({ id: mirroredTag.id, name: MANAGED_MIRRORED_TAG_NAME }),
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
    const reportExclusionTag = await ensureExactTag(MANAGED_COMPLAINT_TAG_NAME, "#FF011B");
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

  it("treats Gespiegelt as an additional project card trigger", async () => {
    const admin = await loginAdminAgent(app);
    const mirroredTag = await ensureExactTag(MANAGED_MIRRORED_TAG_NAME, "#0891b2");

    const mirroredOnlyProject = await createProduktionsplanungProjectFixture({
      prefix: "FT26-PV-MIRRORED-ONLY",
      appointmentDates: [{ startDate: "2100-03-10" }],
      projectTags: [mirroredTag],
      productItems: [{ categoryName: "Fass Saunen", name: "Mirrored Sauna", quantity: 2 }],
    });
    await createProduktionsplanungProjectFixture({
      prefix: "FT26-PV-MIRRORED-NO-REASON",
      appointmentDates: [{ startDate: "2100-03-11" }],
      productItems: [{ categoryName: "Fass Saunen", name: "No Reason Sauna", quantity: 1 }],
    });

    const saunaCategoryId = (await createProductFixture({ categoryName: "Fass Saunen", name: "Lookup Sauna Mirrored Trigger" })).categoryId;

    const response = await admin
      .get(`/api/reports/produktionsplanung?fromDate=2100-03-01&toDate=2100-03-31&productCategoryIds=${saunaCategoryId}`)
      .expect(200);

    expect(response.body.projectRows).toEqual([
      expect.objectContaining({
        projectId: mirroredOnlyProject.project.id,
        reportCardReasonTags: [
          expect.objectContaining({ id: mirroredTag.id, name: MANAGED_MIRRORED_TAG_NAME }),
        ],
      }),
    ]);
  });

  it("allows dispatcher and reader access", async () => {
    const dispatcher = await createRoleAgent("DISPATCHER");
    const reader = await createRoleAgent("READER");

    await dispatcher.get("/api/reports/produktionsplanung?fromDate=2099-12-01").expect(200);
    await reader
      .get("/api/reports/produktionsplanung?fromDate=2099-12-01")
      .expect(200);
  });

  it("fuegt Artikel mit identischem Shortcode bei useShortCodes=true zusammen und trennt sie bei false", async () => {
    const admin = await loginAdminAgent(app);
    const sondermaßTag = await ensureManagedSpecialMeasureTag();

    await createProduktionsplanungProjectFixture({
      prefix: "FT26-SC-MERGE-A",
      appointmentDates: [{ startDate: "2098-06-10" }],
      appointmentTagsByIndex: [[sondermaßTag]],
      productItems: [{ categoryName: "Fass Saunen", name: "Sauna Alpha", quantity: 2, shortCode: "SC-MERGE" }],
    });
    await createProduktionsplanungProjectFixture({
      prefix: "FT26-SC-MERGE-B",
      appointmentDates: [{ startDate: "2098-06-11" }],
      appointmentTagsByIndex: [[sondermaßTag]],
      productItems: [{ categoryName: "Fass Saunen", name: "Sauna Beta", quantity: 3, shortCode: "SC-MERGE" }],
    });
    await createProduktionsplanungProjectFixture({
      prefix: "FT26-SC-MERGE-C",
      appointmentDates: [{ startDate: "2098-06-12" }],
      appointmentTagsByIndex: [[sondermaßTag]],
      productItems: [{ categoryName: "Fass Saunen", name: "Sauna Gamma", quantity: 1 }],
    });

    const saunaCategoryId = (await createProductFixture({ categoryName: "Fass Saunen", name: "Lookup SC-Merge Sauna" })).categoryId;

    type CategoryGroup = {
      categoryId: number;
      categoryName: string;
      items: Array<{ itemName: string; totalQuantity: number }>;
    };

    const responseWithSC = await admin
      .get(`/api/reports/produktionsplanung?fromDate=2098-06-01&toDate=2098-06-30&productCategoryIds=${saunaCategoryId}&useShortCodes=true`)
      .expect(200);

    const withSCGroups = responseWithSC.body.productCategoryGroups as CategoryGroup[];
    expect(withSCGroups).toHaveLength(1);
    expect(withSCGroups[0]?.categoryId).toBe(saunaCategoryId);

    const withSCItems = withSCGroups[0]!.items;
    expect(withSCItems).toHaveLength(2);
    expect(withSCItems).toContainEqual({ itemName: "SC-MERGE", totalQuantity: 5 });
    expect(withSCItems).toContainEqual({ itemName: "Sauna Gamma", totalQuantity: 1 });

    const responseNoSC = await admin
      .get(`/api/reports/produktionsplanung?fromDate=2098-06-01&toDate=2098-06-30&productCategoryIds=${saunaCategoryId}&useShortCodes=false`)
      .expect(200);

    const noSCGroups = responseNoSC.body.productCategoryGroups as CategoryGroup[];
    expect(noSCGroups).toHaveLength(1);

    const noSCItems = noSCGroups[0]!.items;
    expect(noSCItems).toHaveLength(3);
    expect(noSCItems).toContainEqual({ itemName: "Sauna Alpha", totalQuantity: 2 });
    expect(noSCItems).toContainEqual({ itemName: "Sauna Beta", totalQuantity: 3 });
    expect(noSCItems).toContainEqual({ itemName: "Sauna Gamma", totalQuantity: 1 });
  });

  /**
   * @Test Scope:
   * - Gleichlautende Shortcodes duerfen nur innerhalb derselben Kategorie aggregiert werden.
   */
  it("trennt gleiche Shortcodes strikt nach Kategorie und fuehrt sie nicht kategorie-uebergreifend zusammen", async () => {
    const admin = await loginAdminAgent(app);
    const sondermassTag = await ensureManagedSpecialMeasureTag();

    await createProduktionsplanungProjectFixture({
      prefix: "FT26-SC-CROSS-A",
      appointmentDates: [{ startDate: "2097-05-10" }],
      appointmentTagsByIndex: [[sondermassTag]],
      productItems: [{ categoryName: "Fass Saunen", name: "Sauna Cross", quantity: 3, shortCode: "X" }],
      componentItems: [{ categoryName: "Fenster", name: "Fenster Cross", quantity: 5, shortCode: "X" }],
    });
    await createProduktionsplanungProjectFixture({
      prefix: "FT26-SC-CROSS-B",
      appointmentDates: [{ startDate: "2097-05-11" }],
      appointmentTagsByIndex: [[sondermassTag]],
      productItems: [{ categoryName: "Fass Saunen", name: "Sauna Cross 2", quantity: 2, shortCode: "X" }],
      componentItems: [{ categoryName: "Fenster", name: "Fenster Cross 2", quantity: 4, shortCode: "X" }],
    });

    const saunaCategoryId = (await createProductFixture({ categoryName: "Fass Saunen", name: "Lookup SC-Cross Sauna" })).categoryId;
    const windowCategoryId = (await createComponentFixture({ categoryName: "Fenster", name: "Lookup SC-Cross Fenster" })).categoryId;

    const response = await admin
      .get(`/api/reports/produktionsplanung?fromDate=2097-05-01&toDate=2097-05-31&productCategoryIds=${saunaCategoryId}&componentCategoryIds=${windowCategoryId}&useShortCodes=true`)
      .expect(200);

    expect(response.body.productCategoryGroups).toEqual([
      {
        categoryId: saunaCategoryId,
        categoryName: "Fass Saunen",
        items: [{ itemName: "X", totalQuantity: 5 }],
      },
    ]);
    expect(response.body.componentCategoryGroups).toEqual([
      {
        categoryId: windowCategoryId,
        categoryName: "Fenster",
        items: [{ itemName: "X", totalQuantity: 9 }],
      },
    ]);
  });

  /**
   * @Test Scope:
   * - Produktionsplanung summiert Shortcode-Mengen auch ueber groessere Projektmengen exakt und ohne Duplikate.
   */
  it("summiert Mengen ueber 10 Projekte mit identischem Shortcode korrekt zur Gesamtmenge", async () => {
    const admin = await loginAdminAgent(app);
    const sondermassTag = await ensureManagedSpecialMeasureTag();

    for (let index = 1; index <= 10; index += 1) {
      const day = String(10 + index).padStart(2, "0");
      await createProduktionsplanungProjectFixture({
        prefix: `FT26-VOL-${index}`,
        appointmentDates: [{ startDate: `2097-06-${day}` }],
        appointmentTagsByIndex: [[sondermassTag]],
        productItems: [{
          categoryName: "Fass Saunen",
          name: `Sauna Vol ${index}`,
          quantity: index,
          shortCode: "VOL",
        }],
      });
    }

    const saunaCategoryId = (await createProductFixture({ categoryName: "Fass Saunen", name: "Lookup SC-Vol Sauna" })).categoryId;

    const response = await admin
      .get(`/api/reports/produktionsplanung?fromDate=2097-06-01&toDate=2097-06-30&productCategoryIds=${saunaCategoryId}&useShortCodes=true`)
      .expect(200);

    expect(response.body.productCategoryGroups).toEqual([
      {
        categoryId: saunaCategoryId,
        categoryName: "Fass Saunen",
        items: [{ itemName: "VOL", totalQuantity: 55 }],
      },
    ]);
  });
});
