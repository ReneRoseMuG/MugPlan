/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Vorlaufliste liefert pro Projekt genau eine Zeile mit dem fruehesten passenden Termin.
 * - Die Zeile leitet reportState und actualDate korrekt aus aktiven/stornierten Terminen ab.
 * - Der systemverwaltete Tag "Reklamation" schliesst Projekt- oder Termin-Treffer aus der Vorlaufliste aus.
 * - Ohne Bis-Datum werden alle Termine ab Von-Datum beruecksichtigt.
 * - Paging greift serverseitig projektbasiert mit 100er-Seiten.
 * - Nur ADMIN und DISPONENT duerfen den Report lesen; LESER wird abgewiesen.
 * - articleValues enthaelt genau die per Kategorie-ID gefilterten Artikelwerte.
 * - useShortCodes=true ersetzt Artikel- und Komponentennamen durch Shortcodes.
 *
 * Fehlerfaelle:
 * - Mehrere Termine eines Projekts erzeugen mehrere Zeilen.
 * - Report ignoriert Artikel-Mappings, reportState, Paging oder Rollenpruefung.
 * - Termine ohne Projektzuordnung landen im Report.
 * - Shortcodes werden ignoriert und stattdessen immer die vollen Namen ausgegeben.
 *
 * Ziel:
 * Den End-to-end-Vertrag der neuen Reports-Vorlaufliste inklusive Rollen- und Pagingverhalten absichern.
 */
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../../server/db";
import {
  MANAGED_REPORT_EXCLUSION_TAG_NAME,
  MANAGED_SPECIAL_MEASURE_TAG_NAME,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
} from "../../../shared/appointmentCancellation";
import { tags, type Tag } from "../../../shared/schema";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { createApiTestApp, loginAdminAgent, loginAgent } from "../../helpers/apiTestHarness";
import {
  attachAppointmentTagFixture,
  attachProjectTagFixture,
  createAppointmentFixture,
  createComponentFixture,
  createCustomerFixtureWithOverrides,
  createExactTagFixture,
  createProductFixture,
  createProjectFixture,
  createProjectOrderItemFixture,
  createTagFixture,
} from "../../helpers/testDataFactory";
import * as projectsService from "../../../server/services/projectsService";

let app: Awaited<ReturnType<typeof createApiTestApp>>;
let authCounter = 1;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function createRoleAgent(roleCode: "DISPATCHER" | "READER") {
  const token = `${roleCode.toLowerCase()}-${authCounter}`;
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
  return loginAgent(app, {
    username: `test-${token}`,
    password,
  });
}

async function createReportProjectFixture(params: {
  prefix: string;
  appointmentDates: string[];
  plannedDateText?: string | null;
  plannedWeek?: string | null;
  descriptionMd?: string | null;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  postalCode?: string | null;
  city?: string | null;
  articleValues?: Partial<{
    sauna: string;
    door: string;
    window: string;
    oven: string;
    control: string;
    roof: string;
  }>;
  tagNames?: string[];
  projectTags?: Tag[];
  appointmentTagsByIndex?: Tag[][];
}) {
  const customer = await createCustomerFixtureWithOverrides({
    prefix: `${params.prefix}-CUST`,
    firstName: params.customerFirstName ?? "Fixture",
    lastName: params.customerLastName ?? `${params.prefix} Kunde`,
    postalCode: params.postalCode ?? null,
    city: params.city ?? null,
  });

  const project = await createProjectFixture({
    prefix: `${params.prefix}-PROJ`,
    customerId: customer.id,
    name: `${params.prefix} Projekt`,
  });

  const updatedProject = await projectsService.updateProject(project.id, {
    version: project.version,
    descriptionMd: params.descriptionMd ?? null,
    projectOrder: {
      plannedDateText: params.plannedDateText ?? null,
      plannedWeek: params.plannedWeek ?? null,
    },
  });

  if (!updatedProject) {
    throw new Error("Expected updated project fixture.");
  }

  const orderNumber = updatedProject.projectOrder?.orderNumber ?? updatedProject.orderNumber;
  if (!orderNumber) {
    throw new Error("Expected project order number for report fixture.");
  }

  const appointments: Array<{ id: number }> = [];
  for (const appointmentDate of params.appointmentDates) {
    appointments.push(await createAppointmentFixture({
      projectId: project.id,
      startDate: appointmentDate,
    }));
  }

  const createdTags: string[] = [];
  for (const tagName of params.tagNames ?? []) {
    const tag = await createTagFixture(`${params.prefix}-${tagName}`);
    await attachProjectTagFixture(project.id, tag.id);
    createdTags.push(tag.name);
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

  if (params.articleValues?.sauna) {
    const product = await createProductFixture({
      categoryName: "Fass Saunen",
      name: params.articleValues.sauna,
    });
    await createProjectOrderItemFixture({
      projectId: project.id,
      orderNumber,
      productId: product.id,
    });
  }

  const componentFixtures = [
    { key: "door", categoryName: "Tuer" },
    { key: "window", categoryName: "Fenster" },
    { key: "oven", categoryName: "Ofen" },
    { key: "control", categoryName: "Steuerung" },
    { key: "roof", categoryName: "Dachvarianten" },
  ] as const;

  for (const componentFixture of componentFixtures) {
    const componentName = params.articleValues?.[componentFixture.key];
    if (!componentName) continue;
    const component = await createComponentFixture({
      categoryName: componentFixture.categoryName,
      name: componentName,
    });
    await createProjectOrderItemFixture({
      projectId: project.id,
      orderNumber,
      componentId: component.id,
    });
  }

  return { customer, project: updatedProject, orderNumber, createdTags, appointments };
}

async function ensureReservedCancellationTag() {
  const [existing] = await db
    .select({
      id: tags.id,
      name: tags.name,
    })
    .from(tags)
    .where(eq(tags.name, RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME))
    .limit(1);

  if (existing) {
    return existing;
  }

  return createExactTagFixture(RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME);
}

async function ensureManagedReportExclusionTag() {
  const [existing] = await db
    .select({
      id: tags.id,
      name: tags.name,
    })
    .from(tags)
    .where(eq(tags.name, MANAGED_REPORT_EXCLUSION_TAG_NAME))
    .limit(1);

  if (existing) {
    return existing;
  }

  return createExactTagFixture(MANAGED_REPORT_EXCLUSION_TAG_NAME, "#f97316");
}

async function ensureManagedSpecialMeasureTag() {
  const [existing] = await db
    .select({
      id: tags.id,
      name: tags.name,
    })
    .from(tags)
    .where(eq(tags.name, MANAGED_SPECIAL_MEASURE_TAG_NAME))
    .limit(1);

  if (existing) {
    return existing;
  }

  await db.insert(tags).values({
    name: MANAGED_SPECIAL_MEASURE_TAG_NAME,
    color: "#1e3a8a",
    isDefault: true,
    version: 1,
  });

  const [created] = await db
    .select({
      id: tags.id,
      name: tags.name,
    })
    .from(tags)
    .where(eq(tags.name, MANAGED_SPECIAL_MEASURE_TAG_NAME))
    .limit(1);

  if (!created) {
    throw new Error("Expected Sondermaß system tag.");
  }

  return created;
}

describe("FT26 integration: report vorlaufliste", () => {
  it("returns one row per project with earliest matching appointment and project metadata", async () => {
    const admin = await loginAdminAgent(app);
    const specialMeasureTag = await ensureManagedSpecialMeasureTag();
    const reportProject = await createReportProjectFixture({
      prefix: "FT26-A",
      appointmentDates: ["2099-05-12", "2099-05-10"],
      plannedDateText: "15.05.2099",
      plannedWeek: "KW 20",
      descriptionMd: "<p>Alpha &amp; <strong>Beta</strong></p>",
      customerFirstName: "Max",
      customerLastName: "Mustermann",
      postalCode: "12345",
      city: "Berlin",
      tagNames: ["Tag B", "Tag A"],
      articleValues: {
        sauna: "Fasssauna Nord",
        door: "Ganzglas",
        window: "Panorama",
        oven: "Ofen XL",
        control: "Digital",
        roof: "Anthrazit",
      },
    });
    await attachProjectTagFixture(reportProject.project.id, specialMeasureTag.id);

    await createReportProjectFixture({
      prefix: "FT26-B",
      appointmentDates: ["2099-05-20"],
      plannedDateText: "21.05.2099",
      plannedWeek: "KW 21",
    });

    const orphanCustomer = await createCustomerFixtureWithOverrides({
      prefix: "FT26-ORPHAN",
      fullName: "Ohne Projekt",
    });
    await createAppointmentFixture({
      projectId: null,
      customerId: orphanCustomer.id,
      startDate: "2099-05-11",
    });

    const response = await admin
      .get("/api/reports/vorlaufliste?fromDate=2099-05-01&toDate=2099-05-31&page=1&pageSize=100")
      .expect(200);

    expect(response.body.total).toBe(2);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items[0]).toEqual(expect.objectContaining({
      projectId: reportProject.project.id,
      tags: [expect.objectContaining({ name: MANAGED_SPECIAL_MEASURE_TAG_NAME, isDefault: true })],
      highlightTag: expect.objectContaining({ name: MANAGED_SPECIAL_MEASURE_TAG_NAME, isDefault: true }),
      customerFullName: "Mustermann, Max",
      postalCode: "12345",
      city: "Berlin",
      articleValues: [],
      plannedDateText: "15.05.2099",
      plannedWeek: "KW 20",
      actualDate: "2099-05-10",
      projectDescription: "Alpha & Beta",
    }));
  });

  it("allows dispatcher access and includes appointments after fromDate when toDate is omitted", async () => {
    const dispatcher = await createRoleAgent("DISPATCHER");
    const project = await createReportProjectFixture({
      prefix: "FT26-C",
      appointmentDates: ["2099-06-01", "2099-06-15"],
      plannedDateText: "02.06.2099",
      plannedWeek: "KW 22",
    });

    const response = await dispatcher
      .get("/api/reports/vorlaufliste?fromDate=2099-06-10&page=1&pageSize=100")
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.items).toEqual([
      expect.objectContaining({
        projectId: project.project.id,
        actualDate: "2099-06-15",
      }),
    ]);
  });

  it("filters articleValues by selected category ids and returns category metadata in response", async () => {
    const admin = await loginAdminAgent(app);
    const filteredProject = await createReportProjectFixture({
      prefix: "FT26-FILTER",
      appointmentDates: ["2099-06-20"],
      articleValues: {
        sauna: "Fasssauna Filter",
        oven: "Ofen Filter",
      },
    });
    const unrelatedProduct = await createProductFixture({
      categoryName: "FT26 Fremdkategorie",
      name: "Nicht fuer Sauna-Spalte",
    });
    const ovenComponent = await createComponentFixture({
      categoryName: "Ofen",
      name: "Ofen Filter 2",
    });

    const response = await admin
      .get(`/api/reports/vorlaufliste?fromDate=2099-06-01&page=1&pageSize=100&productCategoryIds=${unrelatedProduct.categoryId}&componentCategoryIds=${ovenComponent.categoryId}`)
      .expect(200);

    type AV = { categoryId: number; value: string | null };
    type Item = { projectId: number; articleValues: AV[] };
    const item = (response.body.items as Item[]).find((i) => i.projectId === filteredProject.project.id);
    expect(item).toBeDefined();

    const unrelatedAV = item!.articleValues.find((av) => av.categoryId === unrelatedProduct.categoryId);
    const ovenAV = item!.articleValues.find((av) => av.categoryId === ovenComponent.categoryId);
    expect(unrelatedAV?.value).toBeNull();
    expect(ovenAV?.value).toBe("Ofen Filter");

    // Response envelope contains only the queried component category (no match for unrelated product)
    expect(response.body.productCategories).toEqual([]);
    expect(response.body.componentCategories).toEqual([
      expect.objectContaining({ id: ovenComponent.categoryId, name: "Ofen" }),
    ]);
  });

  it("rejects reader access with forbidden", async () => {
    const reader = await createRoleAgent("READER");

    await reader
      .get("/api/reports/vorlaufliste?fromDate=2099-07-01&page=1&pageSize=100")
      .expect(403)
      .expect(({ body }) => {
        expect(body.code).toBe("FORBIDDEN");
      });
  });

  it("pages server-side in chunks of 100 projects", async () => {
    const admin = await loginAdminAgent(app);

    for (let index = 0; index < 105; index += 1) {
      await createReportProjectFixture({
        prefix: `FT26-PAGE-${String(index).padStart(3, "0")}`,
        appointmentDates: ["2099-08-01"],
      });
    }

    const response = await admin
      .get("/api/reports/vorlaufliste?fromDate=2099-08-01&page=2&pageSize=100")
      .expect(200);

    expect(response.body.total).toBe(105);
    expect(response.body.totalPages).toBe(2);
    expect(response.body.page).toBe(2);
    expect(response.body.pageSize).toBe(100);
    expect(response.body.items).toHaveLength(5);
  });

  it("derives reportState and actualDate from active and cancelled appointments", async () => {
    const admin = await loginAdminAgent(app);
    const reservedTag = await ensureReservedCancellationTag();
    const specialMeasureTag = await ensureManagedSpecialMeasureTag();

    const mixedProject = await createReportProjectFixture({
      prefix: "FT26-CANCEL-MIXED",
      appointmentDates: ["2099-09-05", "2099-09-08"],
      projectTags: [specialMeasureTag],
    });
    const cancelledOnlyProject = await createReportProjectFixture({
      prefix: "FT26-CANCEL-ONLY",
      appointmentDates: ["2099-09-03", "2099-09-07"],
    });

    await attachAppointmentTagFixture(mixedProject.appointments[1].id, reservedTag.id);
    await attachAppointmentTagFixture(cancelledOnlyProject.appointments[0].id, reservedTag.id);
    await attachAppointmentTagFixture(cancelledOnlyProject.appointments[1].id, reservedTag.id);

    const response = await admin
      .get("/api/reports/vorlaufliste?fromDate=2099-09-01&toDate=2099-09-30&page=1&pageSize=100")
      .expect(200);

    const mixedRow = (response.body.items as Array<{ projectId: number; actualDate: string; reportState: string; highlightTag: { name: string } | null }>)
      .find((item) => item.projectId === mixedProject.project.id);
    const cancelledOnlyRow = (response.body.items as Array<{ projectId: number; actualDate: string; reportState: string; highlightTag: { name: string } | null }>)
      .find((item) => item.projectId === cancelledOnlyProject.project.id);

    expect(mixedRow).toMatchObject({
      projectId: mixedProject.project.id,
      actualDate: "2099-09-05",
      reportState: "contains_cancelled",
      highlightTag: { name: RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME },
    });
    expect(cancelledOnlyRow).toMatchObject({
      projectId: cancelledOnlyProject.project.id,
      actualDate: "2099-09-03",
      reportState: "cancelled_only",
      highlightTag: { name: RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME },
    });
  });

  it("marks rows with Sondermaß when the system tag is attached to an appointment", async () => {
    const admin = await loginAdminAgent(app);
    const specialMeasureTag = await ensureManagedSpecialMeasureTag();

    const appointmentTaggedProject = await createReportProjectFixture({
      prefix: "FT26-SM-APPOINTMENT",
      appointmentDates: ["2099-09-20"],
      appointmentTagsByIndex: [[specialMeasureTag]],
    });

    const response = await admin
      .get("/api/reports/vorlaufliste?fromDate=2099-09-01&toDate=2099-09-30&page=1&pageSize=100")
      .expect(200);

    const appointmentTaggedRow = (response.body.items as Array<{ projectId: number; highlightTag: { name: string } | null }>)
      .find((item) => item.projectId === appointmentTaggedProject.project.id);

    expect(appointmentTaggedRow).toMatchObject({
      projectId: appointmentTaggedProject.project.id,
      highlightTag: { name: MANAGED_SPECIAL_MEASURE_TAG_NAME },
    });
  });

  it("substitutes shortcodes for article names when useShortCodes is true", async () => {
    const admin = await loginAdminAgent(app);

    const scProduct = await createProductFixture({
      categoryName: "FT26 SC Produkte",
      name: "Voller Produktname ohne Kuerzung",
      shortCode: "SC-P",
    });
    const scComponent = await createComponentFixture({
      categoryName: "FT26 SC Komponenten",
      name: "Voller Komponentenname ohne Kuerzung",
      shortCode: "SC-K",
    });

    const { project: scProject, orderNumber: scOrderNumber } = await createReportProjectFixture({
      prefix: "FT26-SC",
      appointmentDates: ["2099-11-05"],
    });

    await createProjectOrderItemFixture({ projectId: scProject.id, orderNumber: scOrderNumber, productId: scProduct.id });
    await createProjectOrderItemFixture({ projectId: scProject.id, orderNumber: scOrderNumber, componentId: scComponent.id });

    type AV = { categoryId: number; value: string | null };
    type Item = { projectId: number; articleValues: AV[] };

    const responseWithSC = await admin
      .get(`/api/reports/vorlaufliste?fromDate=2099-11-01&page=1&pageSize=100&productCategoryIds=${scProduct.categoryId}&componentCategoryIds=${scComponent.categoryId}&useShortCodes=true`)
      .expect(200);

    const itemWithSC = (responseWithSC.body.items as Item[]).find((i) => i.projectId === scProject.id);
    expect(itemWithSC).toBeDefined();
    expect(itemWithSC!.articleValues).toContainEqual({ categoryId: scProduct.categoryId, value: "SC-P" });
    expect(itemWithSC!.articleValues).toContainEqual({ categoryId: scComponent.categoryId, value: "SC-K" });

    const responseNoSC = await admin
      .get(`/api/reports/vorlaufliste?fromDate=2099-11-01&page=1&pageSize=100&productCategoryIds=${scProduct.categoryId}&componentCategoryIds=${scComponent.categoryId}&useShortCodes=false`)
      .expect(200);

    const itemNoSC = (responseNoSC.body.items as Item[]).find((i) => i.projectId === scProject.id);
    expect(itemNoSC).toBeDefined();
    expect(itemNoSC!.articleValues).toContainEqual({ categoryId: scProduct.categoryId, value: "Voller Produktname ohne Kuerzung" });
    expect(itemNoSC!.articleValues).toContainEqual({ categoryId: scComponent.categoryId, value: "Voller Komponentenname ohne Kuerzung" });
  });

  it("excludes projects tagged with Reklamation on project or appointment level from the report", async () => {
    const admin = await loginAdminAgent(app);
    const managedReportTag = await ensureManagedReportExclusionTag();

    const projectExcludedByProjectTag = await createReportProjectFixture({
      prefix: "FT26-REKL-PROJECT",
      appointmentDates: ["2099-10-03"],
    });
    const mixedAppointmentProject = await createReportProjectFixture({
      prefix: "FT26-REKL-APPOINTMENT",
      appointmentDates: ["2099-10-02", "2099-10-07"],
    });
    const appointmentOnlyExcludedProject = await createReportProjectFixture({
      prefix: "FT26-REKL-ONLY",
      appointmentDates: ["2099-10-01"],
    });

    await attachProjectTagFixture(projectExcludedByProjectTag.project.id, managedReportTag.id);
    await attachAppointmentTagFixture(mixedAppointmentProject.appointments[0].id, managedReportTag.id);
    await attachAppointmentTagFixture(appointmentOnlyExcludedProject.appointments[0].id, managedReportTag.id);

    const response = await admin
      .get("/api/reports/vorlaufliste?fromDate=2099-10-01&toDate=2099-10-31&page=1&pageSize=100")
      .expect(200);

    const projectIds = (response.body.items as Array<{ projectId: number }>).map((item) => item.projectId);
    expect(projectIds).not.toContain(projectExcludedByProjectTag.project.id);
    expect(projectIds).not.toContain(mixedAppointmentProject.project.id);
    expect(projectIds).not.toContain(appointmentOnlyExcludedProject.project.id);
  });
});
