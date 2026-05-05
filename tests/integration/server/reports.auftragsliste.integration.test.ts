/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Auftragsliste liefert projekteweise Kartenbasis mit repraesentativem Termin, Kategorien und kumulierten Metadaten.
 * - Reklamation und Storniert schliessen Projekte aus.
 * - Kategorienfilter und Shortcode-Substitution wirken serverseitig in `articleValues`.
 * - ADMIN, DISPONENT und LESER dürfen den Report lesen.
 *
 * Fehlerfaelle:
 * - Reklamationsprojekte erscheinen trotz Ausschluss weiter im Report.
 * - Storno-Ausschluss oder Shortcode-Ersatz greifen nicht.
 * - Rollenpruefung fehlt oder liefert uneinheitliche Statuscodes.
 *
 * Ziel:
 * Den Endpunkt `/api/reports/auftragsliste` end-to-end gegen die wichtigsten Fachregeln absichern.
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
  createTourFixture,
} from "../../helpers/testDataFactory";
import * as projectsService from "../../../server/services/projectsService";
import {
  MANAGED_COMPLAINT_TAG_NAME,
  MANAGED_MESSE_TAG_NAME,
  MANAGED_MIRRORED_TAG_NAME,
  MANAGED_REMARKS_TAG_NAME,
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
  const token = `${roleCode.toLowerCase()}-auftragsliste-${authCounter}`;
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

async function ensureExactTag(name: string, color = "#2563eb") {
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

  if (existing) return existing;
  return createExactTagFixture(name, color);
}

async function createAuftragslisteProjectFixture(params: {
  prefix: string;
  appointmentDates: Array<{ startDate: string; employeeIds?: number[]; tourId?: number | null }>;
  descriptionMd?: string | null;
  productItems?: Array<{ categoryName: string; name: string; shortCode?: string | null; productId?: number; quantity?: number }>;
  componentItems?: Array<{ categoryName: string; name: string; shortCode?: string | null; quantity?: number }>;
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
    const product = item.productId
      ? { id: item.productId }
      : await createProductFixture({ categoryName: item.categoryName, name: item.name, shortCode: item.shortCode ?? null });
    await createProjectOrderItemFixture({
      projectId: project.id,
      orderNumber,
      productId: product.id,
      quantity: item.quantity ?? 1,
    });
  }

  for (const item of params.componentItems ?? []) {
    const component = await createComponentFixture({ categoryName: item.categoryName, name: item.name, shortCode: item.shortCode ?? null });
    await createProjectOrderItemFixture({
      projectId: project.id,
      orderNumber,
      componentId: component.id,
      quantity: item.quantity ?? 1,
    });
  }

  return {
    customer,
    project: updatedProject,
  };
}

describe("integration: report auftragsliste", () => {
  it("returns filtered product and component categories and substitutes shortcodes", async () => {
    const admin = await loginAdminAgent(app);
    const dispatcher = await createRoleAgent("DISPATCHER");
    const tour = await createTourFixture("#0f766e");
    const shortCodeProject = await createAuftragslisteProjectFixture({
      prefix: "AL-SHORT",
      appointmentDates: [{ startDate: "2099-09-10", tourId: tour.id }],
      descriptionMd: "<p>Sichtbares Projekt</p>",
      productItems: [
        { categoryName: "Fass Saunen", name: "Sauna Alpha", shortCode: "SAU-A" },
        { categoryName: "Wellness", name: "Wellness Alpha", shortCode: "WELL-A" },
      ],
      componentItems: [
        { categoryName: "Fenster", name: "Fenster Alpha", shortCode: "WIN-A" },
        { categoryName: "Tueren", name: "Tuer Beta", shortCode: "DOOR-B" },
      ],
    });

    const productCategoryId = (await createProductFixture({ categoryName: "Fass Saunen", name: "Lookup Sauna AL" })).categoryId;
    const windowCategoryId = (await createComponentFixture({ categoryName: "Fenster", name: "Lookup Fenster AL" })).categoryId;

    const response = await dispatcher
      .get(`/api/reports/auftragsliste?fromDate=2099-09-01&toDate=2099-09-30&productCategoryIds=${productCategoryId}&componentCategoryIds=${windowCategoryId}&useShortCodes=true`)
      .expect(200);

    expect(response.body.productCategories).toEqual([
      {
        id: productCategoryId,
        name: "Fass Saunen",
      },
    ]);
    expect(response.body.componentCategories).toEqual([
      {
        id: windowCategoryId,
        name: "Fenster",
      },
    ]);
    expect(response.body.items).toEqual([
      expect.objectContaining({
        projectId: shortCodeProject.project.id,
        orderNumber: expect.stringContaining("ORD-AL-SHORT-PROJ"),
        customerFullName: shortCodeProject.customer.fullName,
        tourName: tour.name,
        projectDescription: "Sichtbares Projekt",
        articleValues: [
          { categoryId: productCategoryId, value: "SAU-A" },
          { categoryId: windowCategoryId, value: "WIN-A" },
        ],
      }),
    ]);
  });

  it("excludes reklamation on project and appointment level and excludes cancelled appointments", async () => {
    const admin = await loginAdminAgent(app);
    const exclusionTag = await ensureExactTag(MANAGED_COMPLAINT_TAG_NAME, "#FF011B");
    const cancelledTag = await ensureExactTag(RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME, "#ef4444");
    const includedProject = await createAuftragslisteProjectFixture({
      prefix: "AL-INCLUDED",
      appointmentDates: [{ startDate: "2099-10-01" }],
      componentItems: [{ categoryName: "Fenster", name: "Fenster Gueltig" }],
    });
    const excludedProject = await createAuftragslisteProjectFixture({
      prefix: "AL-EXCLUDED",
      appointmentDates: [{ startDate: "2099-10-02" }],
      componentItems: [{ categoryName: "Fenster", name: "Fenster Reklamation" }],
      projectTags: [exclusionTag],
    });
    const excludedAppointment = await createAuftragslisteProjectFixture({
      prefix: "AL-EXCLUDED-APPT",
      appointmentDates: [{ startDate: "2099-10-04" }],
      componentItems: [{ categoryName: "Fenster", name: "Fenster Termin Reklamation" }],
      appointmentTagsByIndex: [[exclusionTag]],
    });
    const cancelledProject = await createAuftragslisteProjectFixture({
      prefix: "AL-CANCELLED",
      appointmentDates: [{ startDate: "2099-10-03" }, { startDate: "2099-10-05" }],
      componentItems: [{ categoryName: "Fenster", name: "Fenster Storno" }],
      appointmentTagsByIndex: [[cancelledTag], [cancelledTag]],
    });

    const response = await admin
      .get("/api/reports/auftragsliste?fromDate=2099-10-01&toDate=2099-10-31")
      .expect(200);

    const projectIds = response.body.items.map((item: { projectId: number }) => item.projectId);
    expect(projectIds).toContain(includedProject.project.id);
    expect(projectIds).not.toContain(excludedProject.project.id);
    expect(projectIds).not.toContain(excludedAppointment.project.id);
    expect(projectIds).not.toContain(cancelledProject.project.id);
  });

  it("filters by report tags and Sauna Modell values and sorts by tour before date", async () => {
    const admin = await loginAdminAgent(app);
    const specialMeasureTag = await ensureExactTag(MANAGED_SPECIAL_MEASURE_TAG_NAME, "#BA7517");
    const remarksTag = await ensureExactTag(MANAGED_REMARKS_TAG_NAME, "#888780");
    const tourOne = await createTourFixture("#0f766e");
    const tourTwo = await createTourFixture("#1d4ed8");
    const modelAlpha = await createProductFixture({ categoryName: "Fass Saunen", name: "Modell Alpha" });
    const modelBeta = await createProductFixture({ categoryName: "Fass Saunen", name: "Modell Beta" });

    const tourOneLater = await createAuftragslisteProjectFixture({
      prefix: "AL-FILTER-T1-LATE",
      appointmentDates: [{ startDate: "2099-12-12", tourId: tourOne.id }],
      productItems: [
        { categoryName: "Fass Saunen", name: "Modell Alpha", productId: modelAlpha.id },
        { categoryName: "Zubehör", name: "Filter Sauna Tour Eins Spaet" },
      ],
      projectTags: [specialMeasureTag],
    });
    const tourOneEarlier = await createAuftragslisteProjectFixture({
      prefix: "AL-FILTER-T1-EARLY",
      appointmentDates: [{ startDate: "2099-12-10", tourId: tourOne.id }],
      productItems: [
        { categoryName: "Fass Saunen", name: "Modell Alpha", productId: modelAlpha.id },
        { categoryName: "Zubehör", name: "Filter Sauna Tour Eins Frueh" },
      ],
      projectTags: [specialMeasureTag],
    });
    const tourTwoEarlier = await createAuftragslisteProjectFixture({
      prefix: "AL-FILTER-T2-EARLY",
      appointmentDates: [{ startDate: "2099-12-01", tourId: tourTwo.id }],
      productItems: [
        { categoryName: "Fass Saunen", name: "Modell Alpha", productId: modelAlpha.id },
        { categoryName: "Zubehör", name: "Filter Sauna Tour Zwei" },
      ],
      projectTags: [specialMeasureTag],
    });
    const remarksOnlyProject = await createAuftragslisteProjectFixture({
      prefix: "AL-FILTER-REMARKS",
      appointmentDates: [{ startDate: "2099-12-11", tourId: tourOne.id }],
      productItems: [
        { categoryName: "Fass Saunen", name: "Modell Alpha", productId: modelAlpha.id },
        { categoryName: "Zubehör", name: "Filter Sauna Anmerkung" },
      ],
      projectTags: [remarksTag],
    });
    const betaModelProject = await createAuftragslisteProjectFixture({
      prefix: "AL-FILTER-BETA",
      appointmentDates: [{ startDate: "2099-12-09", tourId: tourOne.id }],
      productItems: [
        { categoryName: "Fass Saunen", name: "Modell Beta", productId: modelBeta.id },
        { categoryName: "Zubehör", name: "Filter Sauna Beta" },
      ],
      projectTags: [specialMeasureTag],
    });

    const response = await admin
      .get(`/api/reports/auftragsliste?fromDate=2099-12-01&toDate=2099-12-31&tagIds=${specialMeasureTag.id}&saunaModels=Modell%20Alpha`)
      .expect(200);

    expect(response.body.availableSaunaModels).toEqual(["Modell Alpha", "Modell Beta"]);
    expect(response.body.items.map((item: { projectId: number }) => item.projectId)).toEqual([
      tourOneEarlier.project.id,
      tourOneLater.project.id,
      tourTwoEarlier.project.id,
    ]);
    expect(response.body.items[0]).toEqual(expect.objectContaining({
      tourName: tourOne.name,
      tourColor: tourOne.color,
      articleValues: expect.arrayContaining([
        expect.objectContaining({ value: expect.stringContaining("Modell Alpha") }),
      ]),
    }));
    expect(response.body.items.map((item: { projectId: number }) => item.projectId)).not.toContain(remarksOnlyProject.project.id);
    expect(response.body.items.map((item: { projectId: number }) => item.projectId)).not.toContain(betaModelProject.project.id);

    const remarksResponse = await admin
      .get(`/api/reports/auftragsliste?fromDate=2099-12-01&toDate=2099-12-31&tagIds=${remarksTag.id}&saunaModels=Modell%20Alpha`)
      .expect(200);
    expect(remarksResponse.body.items.map((item: { projectId: number }) => item.projectId)).toEqual([remarksOnlyProject.project.id]);
  });

  it("allows readers", async () => {
    const reader = await createRoleAgent("READER");

    await reader
      .get("/api/reports/auftragsliste?fromDate=2099-11-01&toDate=2099-11-30")
      .expect(200);
  });

  it("returns project and appointment highlight tags so the client can resolve the dominant card style", async () => {
    const admin = await loginAdminAgent(app);
    const mirroredTag = await ensureExactTag(MANAGED_MIRRORED_TAG_NAME, "#0891b2");
    const messeTag = await ensureExactTag(MANAGED_MESSE_TAG_NAME, "#3465A4");
    const remarksTag = await ensureExactTag(MANAGED_REMARKS_TAG_NAME, "#888780");

    const fixture = await createAuftragslisteProjectFixture({
      prefix: "AL-HIGHLIGHT-TAGS",
      appointmentDates: [{ startDate: "2100-01-07" }],
      productItems: [{ categoryName: "Fass Saunen", name: "Highlight Sauna" }],
      projectTags: [mirroredTag, remarksTag],
      appointmentTagsByIndex: [[messeTag]],
    });

    const response = await admin
      .get("/api/reports/auftragsliste?fromDate=2100-01-01&toDate=2100-01-31")
      .expect(200);

    expect(response.body.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        projectId: fixture.project.id,
        tags: expect.arrayContaining([
          expect.objectContaining({ id: mirroredTag.id, name: MANAGED_MIRRORED_TAG_NAME }),
          expect.objectContaining({ id: remarksTag.id, name: MANAGED_REMARKS_TAG_NAME }),
          expect.objectContaining({ id: messeTag.id, name: MANAGED_MESSE_TAG_NAME }),
        ]),
      }),
    ]));
  });
});
