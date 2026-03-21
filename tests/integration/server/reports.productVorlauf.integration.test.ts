/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Produkt Vorlauf gruppiert konkrete Produkte und Komponenten je ausgewaehlter Kategorie und summiert deren Mengen.
 * - Sondermasse listen nur Projekte im Zeitraum mit passendem Sondermass-Tag und passender Report-Position.
 * - Stornierte Projekte sollen im Produkt Vorlauf weder Mengen noch Sondermass-Treffer beitragen.
 * - Projekte oder Termine mit dem managed Reklamation-Tag sollen aus Mengen und Sondermass-Treffern ausgeschlossen werden.
 * - Nur ADMIN und DISPONENT duerfen den Report lesen; LESER wird abgewiesen.
 *
 * Fehlerfaelle:
 * - Nicht ausgewaehlte Kategorien fliessen in Summen ein.
 * - Getaggte Projekte ohne passende Report-Position erscheinen als Sondermass.
 * - Stornierte Projekte bleiben trotz Soll-Regel in Summen oder Sondermasslisten sichtbar.
 * - Reklamations-Tags auf Projekt oder Termin werden im Produkt Vorlauf ignoriert.
 * - Rollenpruefung fehlt oder ist uneinheitlich.
 *
 * Ziel:
 * Den End-to-end-Vertrag des Reports Produkt Vorlauf inklusive Summierung, Ausschlussregeln, Sondermass-Logik und Rollen absichern.
 */
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../../server/db";
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
import {
  MANAGED_REPORT_EXCLUSION_TAG_NAME,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
} from "../../../shared/appointmentCancellation";
import { tags } from "../../../shared/schema";

let app: Awaited<ReturnType<typeof createApiTestApp>>;
let authCounter = 1;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function createRoleAgent(roleCode: "DISPATCHER" | "READER") {
  const token = `${roleCode.toLowerCase()}-product-vorlauf-${authCounter}`;
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

async function createProductVorlaufProjectFixture(params: {
  prefix: string;
  appointmentDates: string[];
  descriptionMd?: string | null;
  productItems?: Array<{ categoryName: string; name: string; quantity: number }>;
  componentItems?: Array<{ categoryName: string; name: string; quantity: number }>;
  tagNames?: string[];
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
    appointments.push(await createAppointmentFixture({ projectId: project.id, startDate: appointmentDate }));
  }

  const createdTags = [];
  for (const tagName of params.tagNames ?? []) {
    const tag = await createTagFixture(`${params.prefix}-${tagName}`);
    await attachProjectTagFixture(project.id, tag.id);
    createdTags.push(tag);
  }

  for (const item of params.productItems ?? []) {
    const product = await createProductFixture({ categoryName: item.categoryName, name: item.name });
    await createProjectOrderItemFixture({
      projectId: project.id,
      orderNumber,
      productId: product.id,
      quantity: item.quantity,
    });
  }

  for (const item of params.componentItems ?? []) {
    const component = await createComponentFixture({ categoryName: item.categoryName, name: item.name });
    await createProjectOrderItemFixture({
      projectId: project.id,
      orderNumber,
      componentId: component.id,
      quantity: item.quantity,
    });
  }

  return {
    project: updatedProject,
    tags: createdTags,
    appointments,
  };
}

async function ensureExactTag(name: string, color?: string) {
  const [existing] = await db
    .select({
      id: tags.id,
      name: tags.name,
    })
    .from(tags)
    .where(eq(tags.name, name))
    .limit(1);

  if (existing) {
    return existing;
  }

  return createExactTagFixture(name, color);
}

describe("FT26 integration: report product vorlauf", () => {
  it("groups concrete products and components by category and sums their quantities", async () => {
    const admin = await loginAdminAgent(app);
    const specialProject = await createProductVorlaufProjectFixture({
      prefix: "FT26-PV-A",
      appointmentDates: ["2099-09-10"],
      descriptionMd: "<p>Sondermass Alpha</p>",
      tagNames: ["Sondermass"],
      productItems: [{ categoryName: "Fass Saunen", name: "Sauna A", quantity: 2 }],
      componentItems: [
        { categoryName: "Fenster", name: "Fenster A", quantity: 4 },
        { categoryName: "Ofen", name: "Ofen A", quantity: 1 },
      ],
    });
    await createProductVorlaufProjectFixture({
      prefix: "FT26-PV-B",
      appointmentDates: ["2099-09-11"],
      productItems: [{ categoryName: "Fass Saunen", name: "Sauna B", quantity: 3 }],
      componentItems: [{ categoryName: "Fenster", name: "Fenster B", quantity: 2 }],
    });

    const saunaCategoryId = specialProject.project.id > 0
      ? (await createProductFixture({ categoryName: "Fass Saunen", name: "Lookup Sauna" })).categoryId
      : 0;
    const windowCategoryId = (await createComponentFixture({ categoryName: "Fenster", name: "Lookup Fenster" })).categoryId;
    const specialTagId = specialProject.tags[0]?.id;

    const response = await admin
      .get(`/api/reports/product-vorlauf?fromDate=2099-09-01&toDate=2099-09-30&productCategoryIds=${saunaCategoryId}&componentCategoryIds=${windowCategoryId}&specialMeasureTagId=${specialTagId}`)
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
    expect(response.body.specialMeasureProjects).toEqual([
      expect.objectContaining({
        projectId: specialProject.project.id,
        orderNumber: expect.stringContaining("ORD-FT26-PV-A-PROJ"),
        customerFullName: expect.any(String),
        customerNumber: expect.stringContaining("FT26-PV-A-CUST"),
        actualDate: "2099-09-10",
        projectDescription: "Sondermass Alpha",
        specialMeasureTag: expect.objectContaining({ id: specialTagId }),
      }),
    ]);
  });

  it("ignores non-selected categories in the grouped totals", async () => {
    const admin = await loginAdminAgent(app);
    await createProductVorlaufProjectFixture({
      prefix: "FT26-PV-FILTER",
      appointmentDates: ["2099-10-01"],
      productItems: [
        { categoryName: "Fass Saunen", name: "Sauna Filter", quantity: 5 },
        { categoryName: "FT26 Nicht gewaehlt", name: "Nicht gewaehlt", quantity: 9 },
      ],
      componentItems: [
        { categoryName: "Fenster", name: "Fenster Filter", quantity: 2 },
        { categoryName: "FT26 Nicht gewaehlt Komponente", name: "Komponente Nicht", quantity: 8 },
      ],
    });

    const saunaCategoryId = (await createProductFixture({ categoryName: "Fass Saunen", name: "Lookup Sauna Filter" })).categoryId;
    const windowCategoryId = (await createComponentFixture({ categoryName: "Fenster", name: "Lookup Fenster Filter" })).categoryId;

    const response = await admin
      .get(`/api/reports/product-vorlauf?fromDate=2099-10-01&productCategoryIds=${saunaCategoryId}&componentCategoryIds=${windowCategoryId}`)
      .expect(200);

    expect(response.body.productCategoryGroups).toEqual([
      {
        categoryId: saunaCategoryId,
        categoryName: "Fass Saunen",
        items: [{ itemName: "Sauna Filter", totalQuantity: 5 }],
      },
    ]);
    expect(response.body.componentCategoryGroups).toEqual([
      {
        categoryId: windowCategoryId,
        categoryName: "Fenster",
        items: [{ itemName: "Fenster Filter", totalQuantity: 2 }],
      },
    ]);
  });

  it("lists only tagged projects that also contribute matching report positions", async () => {
    const admin = await loginAdminAgent(app);
    const taggedWithoutMatch = await createProductVorlaufProjectFixture({
      prefix: "FT26-PV-TAG-ONLY",
      appointmentDates: ["2099-11-01"],
      tagNames: ["Sondermass"],
      productItems: [{ categoryName: "Nicht im Report", name: "Ignored", quantity: 4 }],
    });
    const taggedWithMatch = await createProductVorlaufProjectFixture({
      prefix: "FT26-PV-TAG-MATCH",
      appointmentDates: ["2099-11-02"],
      descriptionMd: "<p>Mit Treffer</p>",
      tagNames: ["Sondermass"],
      componentItems: [{ categoryName: "Fenster", name: "Fenster Treffer", quantity: 2 }],
    });

    const windowCategoryId = (await createComponentFixture({ categoryName: "Fenster", name: "Lookup Fenster Sondermass" })).categoryId;
    const specialTagId = taggedWithMatch.tags[0]?.id ?? taggedWithoutMatch.tags[0]?.id;

    const response = await admin
      .get(`/api/reports/product-vorlauf?fromDate=2099-11-01&componentCategoryIds=${windowCategoryId}&specialMeasureTagId=${specialTagId}`)
      .expect(200);

    expect(response.body.specialMeasureProjects).toEqual([
      expect.objectContaining({
        projectId: taggedWithMatch.project.id,
        orderNumber: expect.stringContaining("ORD-FT26-PV-TAG-MATCH-PROJ"),
        customerFullName: expect.any(String),
        customerNumber: expect.stringContaining("FT26-PV-TAG-MATCH-CUST"),
        actualDate: "2099-11-02",
        projectDescription: "Mit Treffer",
      }),
    ]);
  });

  it("allows dispatcher access and rejects reader access", async () => {
    const dispatcher = await createRoleAgent("DISPATCHER");
    const reader = await createRoleAgent("READER");

    await dispatcher.get("/api/reports/product-vorlauf?fromDate=2099-12-01").expect(200);
    await reader
      .get("/api/reports/product-vorlauf?fromDate=2099-12-01")
      .expect(403)
      .expect(({ body }) => {
        expect(body.code).toBe("FORBIDDEN");
      });
  });

  it("excludes cancelled projects from grouped totals and special-measure hits", async () => {
    const admin = await loginAdminAgent(app);
    const cancellationTag = await ensureExactTag(RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME, "#ef4444");
    const specialMeasureTag = await createTagFixture("FT26-PV-CANCEL-SPECIAL");

    const cancelledProject = await createProductVorlaufProjectFixture({
      prefix: "FT26-PV-CANCELLED",
      appointmentDates: ["2099-12-05"],
      descriptionMd: "<p>Storniert soll verschwinden</p>",
      productItems: [{ categoryName: "Fass Saunen", name: "Cancelled Sauna", quantity: 2 }],
      componentItems: [{ categoryName: "Fenster", name: "Cancelled Fenster", quantity: 1 }],
    });
    const activeProject = await createProductVorlaufProjectFixture({
      prefix: "FT26-PV-ACTIVE",
      appointmentDates: ["2099-12-06"],
      descriptionMd: "<p>Aktiv bleibt sichtbar</p>",
      productItems: [{ categoryName: "Fass Saunen", name: "Active Sauna", quantity: 3 }],
      componentItems: [{ categoryName: "Fenster", name: "Active Fenster", quantity: 2 }],
    });

    await attachAppointmentTagFixture(cancelledProject.appointments[0].id, cancellationTag.id);
    await attachProjectTagFixture(cancelledProject.project.id, specialMeasureTag.id);
    await attachProjectTagFixture(activeProject.project.id, specialMeasureTag.id);

    const saunaCategoryId = (await createProductFixture({ categoryName: "Fass Saunen", name: "Lookup Sauna Cancel" })).categoryId;
    const windowCategoryId = (await createComponentFixture({ categoryName: "Fenster", name: "Lookup Fenster Cancel" })).categoryId;

    const response = await admin
      .get(`/api/reports/product-vorlauf?fromDate=2099-12-01&toDate=2099-12-31&productCategoryIds=${saunaCategoryId}&componentCategoryIds=${windowCategoryId}&specialMeasureTagId=${specialMeasureTag.id}`)
      .expect(200);

    expect(response.body.productCategoryGroups).toEqual([
      {
        categoryId: saunaCategoryId,
        categoryName: "Fass Saunen",
        items: [{ itemName: "Active Sauna", totalQuantity: 3 }],
      },
    ]);
    expect(response.body.componentCategoryGroups).toEqual([
      {
        categoryId: windowCategoryId,
        categoryName: "Fenster",
        items: [{ itemName: "Active Fenster", totalQuantity: 2 }],
      },
    ]);
    expect(response.body.specialMeasureProjects).toEqual([
      expect.objectContaining({
        projectId: activeProject.project.id,
        orderNumber: expect.stringContaining("ORD-FT26-PV-ACTIVE-PROJ"),
      }),
    ]);
  });

  it("excludes projects and appointments tagged with Reklamation from grouped totals and special-measure hits", async () => {
    const admin = await loginAdminAgent(app);
    const reportExclusionTag = await ensureExactTag(MANAGED_REPORT_EXCLUSION_TAG_NAME, "#f97316");
    const specialMeasureTag = await createTagFixture("FT26-PV-REKL-SPECIAL");

    const projectExcludedByProjectTag = await createProductVorlaufProjectFixture({
      prefix: "FT26-PV-REKL-PROJECT",
      appointmentDates: ["2100-01-03"],
      descriptionMd: "<p>Projekt-Tag Exclude</p>",
      productItems: [{ categoryName: "Fass Saunen", name: "Project Reklamation Sauna", quantity: 4 }],
      componentItems: [{ categoryName: "Fenster", name: "Project Reklamation Fenster", quantity: 2 }],
    });
    const projectExcludedByAppointmentTag = await createProductVorlaufProjectFixture({
      prefix: "FT26-PV-REKL-APPOINTMENT",
      appointmentDates: ["2100-01-04"],
      descriptionMd: "<p>Appointment-Tag Exclude</p>",
      productItems: [{ categoryName: "Fass Saunen", name: "Appointment Reklamation Sauna", quantity: 5 }],
      componentItems: [{ categoryName: "Fenster", name: "Appointment Reklamation Fenster", quantity: 3 }],
    });
    const visibleControlProject = await createProductVorlaufProjectFixture({
      prefix: "FT26-PV-REKL-VISIBLE",
      appointmentDates: ["2100-01-05"],
      descriptionMd: "<p>Kontrollprojekt</p>",
      productItems: [{ categoryName: "Fass Saunen", name: "Visible Sauna", quantity: 6 }],
      componentItems: [{ categoryName: "Fenster", name: "Visible Fenster", quantity: 4 }],
    });

    await attachProjectTagFixture(projectExcludedByProjectTag.project.id, reportExclusionTag.id);
    await attachAppointmentTagFixture(projectExcludedByAppointmentTag.appointments[0].id, reportExclusionTag.id);
    await attachProjectTagFixture(projectExcludedByProjectTag.project.id, specialMeasureTag.id);
    await attachProjectTagFixture(projectExcludedByAppointmentTag.project.id, specialMeasureTag.id);
    await attachProjectTagFixture(visibleControlProject.project.id, specialMeasureTag.id);

    const saunaCategoryId = (await createProductFixture({ categoryName: "Fass Saunen", name: "Lookup Sauna Rekl" })).categoryId;
    const windowCategoryId = (await createComponentFixture({ categoryName: "Fenster", name: "Lookup Fenster Rekl" })).categoryId;

    const response = await admin
      .get(`/api/reports/product-vorlauf?fromDate=2100-01-01&toDate=2100-01-31&productCategoryIds=${saunaCategoryId}&componentCategoryIds=${windowCategoryId}&specialMeasureTagId=${specialMeasureTag.id}`)
      .expect(200);

    expect(response.body.productCategoryGroups).toEqual([
      {
        categoryId: saunaCategoryId,
        categoryName: "Fass Saunen",
        items: [{ itemName: "Visible Sauna", totalQuantity: 6 }],
      },
    ]);
    expect(response.body.componentCategoryGroups).toEqual([
      {
        categoryId: windowCategoryId,
        categoryName: "Fenster",
        items: [{ itemName: "Visible Fenster", totalQuantity: 4 }],
      },
    ]);
    expect(response.body.specialMeasureProjects).toEqual([
      expect.objectContaining({
        projectId: visibleControlProject.project.id,
        orderNumber: expect.stringContaining("ORD-FT26-PV-REKL-VISIBLE-PROJ"),
      }),
    ]);
  });
});
