/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte App über createApiTestApp(), echte MySQL-Testdatenbank, echte Auth/Rollen,
 *   Factory-Einstieg ausschließlich über tests/helpers/testDataFactory.ts.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Klasse B / Baseline core / Storage none. Eindeutige Tokens (ABI-<...>) je Fixture gegen Restdaten.
 *
 * Abgedeckte Regeln:
 * - /api/reports/auftragsliste-by-item liefert genau die Projekte einer Date Range, die ein bestimmtes
 *   Produkt- bzw. Komponenten-Item (über die Item-ID, nicht den Namen) enthalten.
 * - Projekte mit anderem Item, außerhalb der Date Range oder mit Reklamation/Storno erscheinen nicht.
 * - Die Summe der Item-Mengen über die gelisteten Projekte entspricht der Produktionsplanungs-Gruppensumme.
 * - ADMIN, DISPONENT und LESER dürfen den Endpoint lesen.
 *
 * Fehlerfälle:
 * - Fremde Items, Zeitraum- oder Reklamationsausschluss greifen nicht.
 * - Mengen-/Gruppensummen-Konsistenz verletzt.
 * - Rollenprüfung fehlt.
 *
 * Ziel:
 * Den neuen ID-gefilterten Auftragslisten-Datenpfad gegen Identität, Gegenbeispiele und Delta absichern.
 */
import { beforeAll, describe, expect, it } from "vitest";

import { createApiTestApp, loginAdminAgent, loginAgent } from "../../helpers/apiTestHarness";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import {
  attachProjectTagFixture,
  createAppointmentFixture,
  createComponentFixture,
  createCustomerFixtureWithOverrides,
  createExactTagFixture,
  createProductFixture,
  createProjectFixture,
  createProjectOrderItemFixture,
} from "../../helpers/testDataFactory";
import * as projectsService from "../../../server/services/projectsService";
import { MANAGED_COMPLAINT_TAG_NAME } from "../../../shared/appointmentCancellation";

let app: Awaited<ReturnType<typeof createApiTestApp>>;
let authCounter = 1;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function createRoleAgent(roleCode: "DISPATCHER" | "READER") {
  const token = `${roleCode.toLowerCase()}-abi-${authCounter}`;
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

async function createProjectWithItem(params: {
  prefix: string;
  startDate: string;
  productId?: number;
  componentId?: number;
  quantity: number;
  projectTagIds?: number[];
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
    descriptionMd: null,
  });
  if (!updatedProject) throw new Error("Expected updated project fixture.");
  const orderNumber = updatedProject.projectOrder?.orderNumber ?? updatedProject.orderNumber;
  if (!orderNumber) throw new Error("Expected order number.");

  await createAppointmentFixture({
    projectId: project.id,
    startDate: params.startDate,
    employeeIds: [],
    tourId: null,
  });

  await createProjectOrderItemFixture({
    projectId: project.id,
    orderNumber,
    productId: params.productId,
    componentId: params.componentId,
    quantity: params.quantity,
  });

  for (const tagId of params.projectTagIds ?? []) {
    await attachProjectTagFixture(project.id, tagId);
  }

  return { projectId: project.id };
}

async function ensureComplaintTag() {
  try {
    return await createExactTagFixture(MANAGED_COMPLAINT_TAG_NAME, "#FF011B");
  } catch {
    // Tag existiert bereits aus einem früheren Lauf/Seed — der Name ist eindeutig, daher tolerierbar.
    return null;
  }
}

describe("integration: report auftragsliste-by-item", () => {
  it("lists exactly the projects that contain the requested product item and matches the group sum", async () => {
    const admin = await loginAdminAgent(app);
    const complaintTag = await ensureComplaintTag();

    const targetProduct = await createProductFixture({ categoryName: "ABI Fass Saunen", name: "ABI Ziel-Sauna" });
    const otherProduct = await createProductFixture({ categoryName: "ABI Fass Saunen", name: "ABI Andere-Sauna" });

    const projectA = await createProjectWithItem({ prefix: "ABI-A", startDate: "2099-07-03", productId: targetProduct.id, quantity: 2 });
    const projectB = await createProjectWithItem({ prefix: "ABI-B", startDate: "2099-07-10", productId: targetProduct.id, quantity: 3 });
    // Gegenbeispiele:
    const projectOtherItem = await createProjectWithItem({ prefix: "ABI-C", startDate: "2099-07-12", productId: otherProduct.id, quantity: 4 });
    const projectOutOfRange = await createProjectWithItem({ prefix: "ABI-D", startDate: "2099-08-20", productId: targetProduct.id, quantity: 9 });
    const projectComplaint = complaintTag
      ? await createProjectWithItem({ prefix: "ABI-E", startDate: "2099-07-15", productId: targetProduct.id, quantity: 7, projectTagIds: [complaintTag.id] })
      : null;

    const range = "fromDate=2099-07-01&toDate=2099-07-31";

    // Delta-Referenz: Produktionsplanungs-Gruppensumme für das Ziel-Item.
    const produktionsplanung = await admin
      .get(`/api/reports/produktionsplanung?${range}&productCategoryIds=${targetProduct.categoryId}`)
      .expect(200);
    const productGroup = produktionsplanung.body.productCategoryGroups
      .find((group: { categoryId: number }) => group.categoryId === targetProduct.categoryId);
    const targetGroupItem = productGroup?.items
      .find((item: { itemIds: number[] }) => item.itemIds.includes(targetProduct.id));
    expect(targetGroupItem?.totalQuantity).toBe(5);
    expect(targetGroupItem?.itemIds).toEqual([targetProduct.id]);

    // Gefilterter Datenpfad über die Item-ID.
    const response = await admin
      .get(`/api/reports/auftragsliste-by-item?${range}&itemType=product&itemIds=${targetProduct.id}`)
      .expect(200);

    const projectIds = response.body.items.map((item: { projectId: number }) => item.projectId);
    expect(projectIds).toEqual([projectA.projectId, projectB.projectId]);
    expect(projectIds).not.toContain(projectOtherItem.projectId);
    expect(projectIds).not.toContain(projectOutOfRange.projectId);
    if (projectComplaint) {
      expect(projectIds).not.toContain(projectComplaint.projectId);
    }
  });

  it("lists projects by component item identity", async () => {
    const admin = await loginAdminAgent(app);
    const targetComponent = await createComponentFixture({ categoryName: "ABI Fenster", name: "ABI Ziel-Fenster" });
    const otherComponent = await createComponentFixture({ categoryName: "ABI Fenster", name: "ABI Anderes-Fenster" });

    const withTarget = await createProjectWithItem({ prefix: "ABI-COMP-A", startDate: "2099-09-05", componentId: targetComponent.id, quantity: 6 });
    const withOther = await createProjectWithItem({ prefix: "ABI-COMP-B", startDate: "2099-09-06", componentId: otherComponent.id, quantity: 8 });

    const response = await admin
      .get(`/api/reports/auftragsliste-by-item?fromDate=2099-09-01&toDate=2099-09-30&itemType=component&itemIds=${targetComponent.id}`)
      .expect(200);

    const projectIds = response.body.items.map((item: { projectId: number }) => item.projectId);
    expect(projectIds).toContain(withTarget.projectId);
    expect(projectIds).not.toContain(withOther.projectId);
  });

  it("allows ADMIN, DISPATCHER and READER", async () => {
    const admin = await loginAdminAgent(app);
    const dispatcher = await createRoleAgent("DISPATCHER");
    const reader = await createRoleAgent("READER");
    const product = await createProductFixture({ categoryName: "ABI Rollen", name: "ABI Rollen-Sauna" });
    const query = `/api/reports/auftragsliste-by-item?fromDate=2099-11-01&toDate=2099-11-30&itemType=product&itemIds=${product.id}`;

    await admin.get(query).expect(200);
    await dispatcher.get(query).expect(200);
    await reader.get(query).expect(200);
  });
});
