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
 * - articleValues enthaelt fuer alle aktiven Report-Kategorien stabile Werte oder null.
 * - useShortCodes=true ersetzt Artikel- und Komponentennamen durch Shortcodes.
 * - Projekt-Preview-Tags der Vorlaufliste enthalten ungefiltert alle Projekt-Tags, nicht nur System-Tags.
 *
 * Fehlerfaelle:
 * - Mehrere Termine eines Projekts erzeugen mehrere Zeilen.
 * - Report ignoriert Artikel-Mappings, reportState, Paging oder Rollenpruefung.
 * - Termine ohne Projektzuordnung landen im Report.
 * - Shortcodes werden ignoriert und stattdessen immer die vollen Namen ausgegeben.
 * - Nicht-default Projekt-Tags verschwinden in der Vorlaufliste-Preview.
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
import { productCategories, tags, type Tag } from "../../../shared/schema";
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
  country?: string | null;
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
    country: params.country ?? null,
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

    expect(response.headers["cache-control"]).toContain("no-store");
    expect(response.body.total).toBe(2);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items[0]).toEqual(expect.objectContaining({
      projectId: reportProject.project.id,
      tags: expect.arrayContaining([
        expect.objectContaining({ name: MANAGED_SPECIAL_MEASURE_TAG_NAME, isDefault: true }),
        expect.objectContaining({ name: reportProject.createdTags[0], isDefault: false }),
        expect.objectContaining({ name: reportProject.createdTags[1], isDefault: false }),
      ]),
      highlightTag: expect.objectContaining({ name: MANAGED_SPECIAL_MEASURE_TAG_NAME, isDefault: true }),
      customerFullName: "Mustermann, Max",
      postalCode: "12345",
      city: "Berlin",
      articleValues: expect.arrayContaining([
        expect.objectContaining({ value: "Fasssauna Nord" }),
        expect.objectContaining({ value: "Ganzglas" }),
      ]),
      plannedDateText: "15.05.2099",
      plannedWeek: "KW 20",
      actualDate: "2099-05-10",
      projectDescription: "Alpha & Beta",
    }));
    expect(response.body.productCategories).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Fass Saunen" }),
    ]));
    expect(response.body.componentCategories).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Tuer" }),
      expect.objectContaining({ name: "Fenster" }),
    ]));
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

  it("returns all active categories and keeps empty active category values as null", async () => {
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
    const inactiveProduct = await createProductFixture({
      categoryName: "FT26 Inaktive Kategorie",
      name: "Nicht sichtbar",
    });
    await db
      .update(productCategories)
      .set({ isActive: false })
      .where(eq(productCategories.id, inactiveProduct.categoryId));

    const response = await admin
      .get("/api/reports/vorlaufliste?fromDate=2099-06-01&page=1&pageSize=100")
      .expect(200);

    type AV = { categoryId: number; value: string | null };
    type Item = { projectId: number; articleValues: AV[] };
    const item = (response.body.items as Item[]).find((i) => i.projectId === filteredProject.project.id);
    expect(item).toBeDefined();

    const unrelatedAV = item!.articleValues.find((av) => av.categoryId === unrelatedProduct.categoryId);
    const ovenAV = item!.articleValues.find((av) => av.categoryId === ovenComponent.categoryId);
    expect(unrelatedAV?.value).toBeNull();
    expect(ovenAV?.value).toBe("Ofen Filter");

    expect(response.body.productCategories).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: unrelatedProduct.categoryId, name: "FT26 Fremdkategorie" }),
    ]));
    expect(response.body.productCategories).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: inactiveProduct.categoryId, name: "FT26 Inaktive Kategorie" }),
    ]));
    expect(response.body.componentCategories).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: ovenComponent.categoryId, name: "Ofen" }),
    ]));
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
  }, 60_000);

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
      .get("/api/reports/vorlaufliste?fromDate=2099-11-01&page=1&pageSize=100&useShortCodes=true")
      .expect(200);

    const itemWithSC = (responseWithSC.body.items as Item[]).find((i) => i.projectId === scProject.id);
    expect(itemWithSC).toBeDefined();
    expect(itemWithSC!.articleValues).toContainEqual({ categoryId: scProduct.categoryId, value: "SC-P" });
    expect(itemWithSC!.articleValues).toContainEqual({ categoryId: scComponent.categoryId, value: "SC-K" });

    const responseNoSC = await admin
      .get("/api/reports/vorlaufliste?fromDate=2099-11-01&page=1&pageSize=100&useShortCodes=false")
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

  it("keeps partial and empty article rows stable when all report categories are selected", async () => {
    const admin = await loginAdminAgent(app);

    const partialProject = await createReportProjectFixture({
      prefix: "FT26-PARTIAL",
      appointmentDates: ["2100-02-11"],
      plannedDateText: "11.02.2100",
      plannedWeek: "KW 06",
      customerFirstName: "Paula",
      customerLastName: "Teilweise",
      postalCode: "26135",
      city: "Oldenburg",
      articleValues: {
        door: "Teilglas",
        window: "Panorama",
      },
    });
    const emptyProject = await createReportProjectFixture({
      prefix: "FT26-EMPTY",
      appointmentDates: ["2100-02-12"],
      plannedDateText: "12.02.2100",
      plannedWeek: "KW 06",
      customerFirstName: "Erik",
      customerLastName: "Leer",
      postalCode: "26121",
      city: "Oldenburg",
    });

    const lookupProduct = await createProductFixture({
      categoryName: "Fass Saunen",
      name: "FT26 Lookup Sauna Vollsatz",
    });
    const lookupDoor = await createComponentFixture({
      categoryName: "Tuer",
      name: "FT26 Lookup Tuer Vollsatz",
    });
    const lookupWindow = await createComponentFixture({
      categoryName: "Fenster",
      name: "FT26 Lookup Fenster Vollsatz",
    });
    const lookupOven = await createComponentFixture({
      categoryName: "Ofen",
      name: "FT26 Lookup Ofen Vollsatz",
    });
    const lookupControl = await createComponentFixture({
      categoryName: "Steuerung",
      name: "FT26 Lookup Steuerung Vollsatz",
    });
    const lookupRoof = await createComponentFixture({
      categoryName: "Dachvarianten",
      name: "FT26 Lookup Dach Vollsatz",
    });

    const params = new URLSearchParams({
      fromDate: "2100-02-01",
      toDate: "2100-02-28",
      page: "1",
      pageSize: "100",
    });

    const response = await admin
      .get(`/api/reports/vorlaufliste?${params.toString()}`)
      .expect(200);

    expect(response.body.productCategories).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: lookupProduct.categoryId }),
    ]));
    expect(response.body.componentCategories).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: lookupDoor.categoryId }),
      expect.objectContaining({ id: lookupRoof.categoryId }),
    ]));

    type ArticleValue = { categoryId: number; value: string | null };
    type ReportItem = {
      projectId: number;
      customerFullName: string | null;
      postalCode: string | null;
      city: string | null;
      plannedDateText: string | null;
      plannedWeek: string | null;
      actualDate: string;
      articleValues: ArticleValue[];
    };

    const partialRow = (response.body.items as ReportItem[]).find((item) => item.projectId === partialProject.project.id);
    const emptyRow = (response.body.items as ReportItem[]).find((item) => item.projectId === emptyProject.project.id);

    expect(partialRow).toMatchObject({
      projectId: partialProject.project.id,
      customerFullName: "Teilweise, Paula",
      postalCode: "26135",
      city: "Oldenburg",
      plannedDateText: "11.02.2100",
      plannedWeek: "KW 06",
      actualDate: "2100-02-11",
    });
    expect(emptyRow).toMatchObject({
      projectId: emptyProject.project.id,
      customerFullName: "Leer, Erik",
      postalCode: "26121",
      city: "Oldenburg",
      plannedDateText: "12.02.2100",
      plannedWeek: "KW 06",
      actualDate: "2100-02-12",
    });

    const partialValues = new Map(partialRow?.articleValues.map((entry) => [entry.categoryId, entry.value]));
    const emptyValues = new Map(emptyRow?.articleValues.map((entry) => [entry.categoryId, entry.value]));

    expect(partialValues.get(lookupProduct.categoryId)).toBeNull();
    expect(partialValues.get(lookupDoor.categoryId)).toBe("Teilglas");
    expect(partialValues.get(lookupWindow.categoryId)).toBe("Panorama");
    expect(partialValues.get(lookupOven.categoryId)).toBeNull();
    expect(partialValues.get(lookupControl.categoryId)).toBeNull();
    expect(partialValues.get(lookupRoof.categoryId)).toBeNull();

    expect(emptyValues.get(lookupProduct.categoryId)).toBeNull();
    expect(emptyValues.get(lookupDoor.categoryId)).toBeNull();
    expect(emptyValues.get(lookupWindow.categoryId)).toBeNull();
    expect(emptyValues.get(lookupOven.categoryId)).toBeNull();
    expect(emptyValues.get(lookupControl.categoryId)).toBeNull();
    expect(emptyValues.get(lookupRoof.categoryId)).toBeNull();
  });

  it("excludes projects without appointments in the window and refreshes mutable fields on follow-up fetches", async () => {
    const admin = await loginAdminAgent(app);

    const refreshProject = await createReportProjectFixture({
      prefix: "FT26-REFRESH",
      appointmentDates: ["2100-03-12"],
      descriptionMd: "<p>Beschreibung Alt</p>",
      customerFirstName: "Rita",
      customerLastName: "Refresh",
      postalCode: "26133",
      city: "Oldenburg",
      articleValues: {
        window: "Fenster Alt",
      },
    });
    const outOfWindowProject = await createReportProjectFixture({
      prefix: "FT26-OUTSIDE",
      appointmentDates: ["2100-05-12"],
      descriptionMd: "<p>Ausserhalb</p>",
      articleValues: {
        window: "Fenster Ausserhalb",
      },
    });

    const currentRefreshProject = await projectsService.getProject(refreshProject.project.id);
    if (!currentRefreshProject) {
      throw new Error("Expected refresh project fixture.");
    }

    const initialProject = await projectsService.updateProject(refreshProject.project.id, {
      version: currentRefreshProject.version,
      projectOrder: {
        amount: "1000.00",
      },
    });
    if (!initialProject) {
      throw new Error("Expected initial project update.");
    }

    const lookupWindow = await createComponentFixture({
      categoryName: "Fenster",
      name: "FT26 Lookup Fenster Refresh",
    });
    const reportUrl = `/api/reports/vorlaufliste?${new URLSearchParams({
      fromDate: "2100-03-01",
      toDate: "2100-03-31",
      page: "1",
      pageSize: "100",
    }).toString()}`;

    type ReportItem = {
      projectId: number;
      amount: string | null;
      projectDescription: string | null;
      articleValues: Array<{ categoryId: number; value: string | null }>;
    };

    const firstResponse = await admin.get(reportUrl).expect(200);
    const firstItems = firstResponse.body.items as ReportItem[];
    const initialRow = firstItems.find((item) => item.projectId === refreshProject.project.id);
    const initialWindowValue = initialRow?.articleValues.find((entry) => entry.categoryId === lookupWindow.categoryId)?.value;

    expect(initialRow).toMatchObject({
      projectId: refreshProject.project.id,
      amount: "1000.00",
      projectDescription: "Beschreibung Alt",
    });
    expect(initialWindowValue).toBe("Fenster Alt");
    expect(firstItems.map((item) => item.projectId)).not.toContain(outOfWindowProject.project.id);

    const latestProject = await projectsService.getProject(refreshProject.project.id);
    if (!latestProject) {
      throw new Error("Expected latest refresh project.");
    }

    const updatedProject = await projectsService.updateProject(refreshProject.project.id, {
      version: latestProject.version,
      descriptionMd: "<p>Beschreibung Neu</p>",
      projectOrder: {
        amount: "2222.00",
      },
    });
    if (!updatedProject) {
      throw new Error("Expected updated refresh project.");
    }

    const orderItems = await projectsService.listProjectOrderItems(refreshProject.project.id);
    const windowOrderItem = orderItems.find((item) => item.componentId != null);
    if (!windowOrderItem) {
      throw new Error("Expected window order item.");
    }

    await projectsService.deleteProjectOrderItem(refreshProject.project.id, windowOrderItem.id, windowOrderItem.version);

    const secondResponse = await admin.get(reportUrl).expect(200);
    const secondItems = secondResponse.body.items as ReportItem[];
    const refreshedRow = secondItems.find((item) => item.projectId === refreshProject.project.id);
    const refreshedWindowValue = refreshedRow?.articleValues.find((entry) => entry.categoryId === lookupWindow.categoryId)?.value;

    expect(refreshedRow).toMatchObject({
      projectId: refreshProject.project.id,
      amount: "2222.00",
      projectDescription: "Beschreibung Neu",
    });
    expect(refreshedWindowValue).toBeNull();
    expect(secondItems.map((item) => item.projectId)).not.toContain(outOfWindowProject.project.id);
  });

  it("liefert alle 23 Felder einer Vorlaufliste-Zeile mit exakten Werten", async () => {
    const admin = await loginAdminAgent(app);

    // Lookup-Produkt nur für die categoryId – createReportProjectFixture
    // legt das eigentliche Bestellpositions-Produkt intern über articleValues an.
    const saunaCategoryRef = await createProductFixture({
      categoryName: "Fass Saunen",
      name: "FT26-L5 Sauna Kategorie-Lookup",
    });

    const fixture = await createReportProjectFixture({
      prefix: "FT26-L5-FULL",
      appointmentDates: ["2098-08-01"],
      plannedDateText: "01.08.2098",
      plannedWeek: "KW 31",
      descriptionMd: "<p>Vollfelder Test</p>",
      customerFirstName: "Luise",
      customerLastName: "Mustermann",
      postalCode: "12345",
      city: "Berlin",
      country: "Deutschland",
      articleValues: {
        sauna: "FT26-L5 Sauna Vollfelder",
      },
    });

    const response = await admin
      .get("/api/reports/vorlaufliste?fromDate=2098-08-01&toDate=2098-08-31&page=1&pageSize=100")
      .expect(200);

    const row = (response.body.items as Array<{ projectId: number }>).find(
      (item) => item.projectId === fixture.project.id,
    );
    expect(row).toBeDefined();

    type Category = { id: number };
    const productCats = response.body.productCategories as Category[];
    const componentCats = response.body.componentCategories as Category[];
    const expectedArticleValues = [
      ...productCats.map((cat) => ({
        categoryId: cat.id,
        value: cat.id === saunaCategoryRef.categoryId ? "FT26-L5 Sauna Vollfelder" : null,
      })),
      ...componentCats.map((cat) => ({
        categoryId: cat.id,
        value: null,
      })),
    ];

    expect(row).toEqual({
      projectId: fixture.project.id,
      projectName: "FT26-L5-FULL Projekt",
      isActive: true,
      orderNumber: fixture.orderNumber,
      customerId: fixture.customer.id,
      customerNumber: fixture.customer.customerNumber,
      tags: [],
      highlightTag: null,
      amount: null,
      customerFullName: "Mustermann, Luise",
      postalCode: "12345",
      city: "Berlin",
      country: "Deutschland",
      articleValues: expectedArticleValues,
      plannedDateText: "01.08.2098",
      plannedWeek: "KW 31",
      actualDate: "2098-08-01",
      projectDescription: "Vollfelder Test",
      notesCount: 0,
      plannedAppointmentsCount: 1,
      attachmentsCount: 0,
      reportState: "default",
    });
  });
});
