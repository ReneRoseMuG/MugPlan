/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Produkt Vorlauf summiert die Mengen pro ausgewaehlter Produkt- und Komponentenkategorie unter Beachtung der bestehenden Ein-Position-pro-Kategorie-Regel je Projekt.
 * - Sondermasse listen nur Projekte im Zeitraum mit passendem Sondermass-Tag und passender Report-Position.
 * - Nur ADMIN und DISPONENT duerfen den Report lesen; LESER wird abgewiesen.
 *
 * Fehlerfaelle:
 * - Nicht ausgewaehlte Kategorien fliessen in Summen ein.
 * - Getaggte Projekte ohne passende Report-Position erscheinen als Sondermass.
 * - Rollenpruefung fehlt oder ist uneinheitlich.
 *
 * Ziel:
 * Den End-to-end-Vertrag des neuen Reports Produkt Vorlauf inklusive Summierung, Sondermass-Logik und Rollen absichern.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { createApiTestApp, loginAdminAgent, loginAgent } from "../../helpers/apiTestHarness";
import {
  attachProjectTagFixture,
  createAppointmentFixture,
  createComponentFixture,
  createCustomerFixtureWithOverrides,
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

  for (const appointmentDate of params.appointmentDates) {
    await createAppointmentFixture({ projectId: project.id, startDate: appointmentDate });
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
  };
}

describe("FT26 integration: report product vorlauf", () => {
  it("sums selected product and component categories by quantity", async () => {
    const admin = await loginAdminAgent(app);
    const specialProject = await createProductVorlaufProjectFixture({
      prefix: "FT26-PV-A",
      appointmentDates: ["2099-09-10"],
      descriptionMd: "<p>Sondermass Alpha</p>",
      tagNames: ["Sondermass"],
      productItems: [
        { categoryName: "Fass Saunen", name: "Sauna A", quantity: 2 },
        { categoryName: "Fass Saunen", name: "Sauna B", quantity: 1 },
      ],
      componentItems: [
        { categoryName: "Fenster", name: "Fenster A", quantity: 4 },
        { categoryName: "Ofen", name: "Ofen A", quantity: 1 },
      ],
    });
    await createProductVorlaufProjectFixture({
      prefix: "FT26-PV-B",
      appointmentDates: ["2099-09-11"],
      productItems: [{ categoryName: "Fass Saunen", name: "Sauna C", quantity: 3 }],
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

    expect(response.body.productCategoryTotals).toEqual([
      expect.objectContaining({ categoryName: "Fass Saunen", totalQuantity: 4 }),
    ]);
    expect(response.body.componentCategoryTotals).toEqual([
      expect.objectContaining({ categoryName: "Fenster", totalQuantity: 6 }),
    ]);
    expect(response.body.specialMeasureProjects).toEqual([
      expect.objectContaining({
        projectId: specialProject.project.id,
        projectDescription: "Sondermass Alpha",
        specialMeasureTag: expect.objectContaining({ id: specialTagId }),
      }),
    ]);
  });

  it("ignores non-selected categories in the totals", async () => {
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

    expect(response.body.productCategoryTotals).toEqual([
      expect.objectContaining({ categoryName: "Fass Saunen", totalQuantity: 5 }),
    ]);
    expect(response.body.componentCategoryTotals).toEqual([
      expect.objectContaining({ categoryName: "Fenster", totalQuantity: 2 }),
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
});
