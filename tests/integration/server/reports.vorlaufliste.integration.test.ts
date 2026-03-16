/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Vorlaufliste liefert pro Projekt genau eine Zeile mit dem fruehesten passenden Termin.
 * - Ohne Bis-Datum werden alle Termine ab Von-Datum beruecksichtigt.
 * - Paging greift serverseitig projektbasiert mit 100er-Seiten.
 * - Nur ADMIN und DISPONENT duerfen den Report lesen; LESER wird abgewiesen.
 *
 * Fehlerfaelle:
 * - Mehrere Termine eines Projekts erzeugen mehrere Zeilen.
 * - Report ignoriert Artikel-Mappings, Paging oder Rollenpruefung.
 * - Termine ohne Projektzuordnung landen im Report.
 *
 * Ziel:
 * Den End-to-end-Vertrag der neuen Reports-Vorlaufliste inklusive Rollen- und Pagingverhalten absichern.
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

  for (const appointmentDate of params.appointmentDates) {
    await createAppointmentFixture({
      projectId: project.id,
      startDate: appointmentDate,
    });
  }

  const createdTags: string[] = [];
  for (const tagName of params.tagNames ?? []) {
    const tag = await createTagFixture(`${params.prefix}-${tagName}`);
    await attachProjectTagFixture(project.id, tag.id);
    createdTags.push(tag.name);
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

  return { customer, project: updatedProject, createdTags };
}

describe("FT26 integration: report vorlaufliste", () => {
  it("returns one row per project with earliest matching appointment and mapped article columns", async () => {
    const admin = await loginAdminAgent(app);
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
      tags: expect.arrayContaining(
        reportProject.createdTags.map((name) => expect.objectContaining({ name })),
      ),
      customerFullName: "Mustermann, Max",
      postalCode: "12345",
      city: "Berlin",
      sauna: "Fasssauna Nord",
      door: "Ganzglas",
      window: "Panorama",
      oven: "Ofen XL",
      control: "Digital",
      roof: "Anthrazit",
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

  it("filters report article columns by selected product and component category ids", async () => {
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

    expect(response.body.items).toEqual([
      expect.objectContaining({
        projectId: filteredProject.project.id,
        sauna: null,
        oven: "Ofen Filter",
      }),
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
});
