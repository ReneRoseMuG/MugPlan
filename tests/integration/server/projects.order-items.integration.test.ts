/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Projekt-Auftragspositionen sind ueber die bestehenden Projekt-Endpunkte lesbar und schreibbar.
 * - Eine neue Komponentenposition ersetzt bestehende Komponenten derselben Kategorie im Projekt.
 * - Neu angelegte Produkt- und Komponentenreferenzen bleiben sowohl fuer neue als auch fuer bestehende Projekte persistent und wieder abrufbar.
 * - Auftragspositionen duerfen nur noch als Produkt- oder Komponentenreferenz existieren.
 * - Loeschen respektiert die Version des zuletzt gespeicherten Eintrags.
 * - Neue Auftragspositionen mit inaktiven Produkt-/Komponentenreferenzen werden blockiert.
 *
 * Fehlerfälle:
 * - Mehrere Komponenten derselben Kategorie bleiben parallel im Projekt bestehen.
 * - Freitext-, Leer- oder Mischpositionen werden akzeptiert.
 * - Delete ignoriert die Versionspruefung oder den Projektbezug.
 *
 * Ziel:
 * Die neue serverseitige Verdrahtung fuer `project_order_items` integrativ absichern.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { createProjectFixture } from "../../helpers/testDataFactory";

let app: express.Express;
let sequence = 1;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

async function loginAdminAgent(): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ username: "test-admin", password: "test-admin-password" })
    .expect(200);
  return agent;
}

type MasterDataCategoryPayload = {
  id: number;
  name: string;
  isActive: boolean;
  version: number;
  isDefault?: boolean;
};

async function ensureProductCategory(
  admin: SuperAgentTest,
  categoryName: string,
): Promise<MasterDataCategoryPayload> {
  const listed = await admin
    .get("/api/admin/master-data/product-categories?active=all")
    .expect(200);

  const existing = (listed.body as MasterDataCategoryPayload[])
    .find((entry) => entry.name === categoryName);
  if (existing) return existing;

  const created = await admin
    .post("/api/admin/master-data/product-categories")
    .send({ name: categoryName, isDefault: true, isActive: true, version: 1 })
    .expect(201);

  return created.body as MasterDataCategoryPayload;
}

async function ensureComponentCategory(
  admin: SuperAgentTest,
  categoryName: string,
): Promise<MasterDataCategoryPayload> {
  const listed = await admin
    .get("/api/admin/master-data/component-categories?active=all")
    .expect(200);

  const existing = (listed.body as MasterDataCategoryPayload[])
    .find((entry) => entry.name === categoryName);
  if (existing) return existing;

  const created = await admin
    .post("/api/admin/master-data/component-categories")
    .send({ name: categoryName, isDefault: true, isActive: true, version: 1 })
    .expect(201);

  return created.body as MasterDataCategoryPayload;
}

describe("FT02/FT27 integration: project order items endpoints", () => {
  it("persists newly added product and component items for a newly created project", async () => {
    const admin = await loginAdminAgent();
    const token = `FT27-ORDER-NEW-PROJECT-${sequence++}`;
    const project = await createProjectFixture({ prefix: token, name: `${token}-Project` });
    const productCategory = await ensureProductCategory(admin, "Fass Saunen");
    const componentCategory = await ensureComponentCategory(admin, "\u00d6fen");

    const createdProduct = await admin
      .post("/api/admin/master-data/products")
      .send({
        name: `${token}-Dialog-Product`,
        shortCode: `${token}-P`,
        categoryId: productCategory.id,
        description: "Neu angelegtes Produkt fuer den Neuprojekt-Pfad.",
        isActive: true,
        version: 1,
      })
      .expect(201);

    const createdComponent = await admin
      .post("/api/admin/master-data/components")
      .send({
        name: `${token}-Dialog-Component`,
        shortCode: `${token}-C`,
        categoryId: componentCategory.id,
        description: "Neu angelegte Komponente fuer den Neuprojekt-Pfad.",
        isActive: true,
        version: 1,
      })
      .expect(201);

    await admin
      .post(`/api/projects/${project.id}/order-items`)
      .send({
        projectId: project.id,
        orderNumber: project.projectOrder!.orderNumber,
        productId: createdProduct.body.id,
        componentId: null,
        quantity: 1,
      })
      .expect(201);

    await admin
      .post(`/api/projects/${project.id}/order-items`)
      .send({
        projectId: project.id,
        orderNumber: project.projectOrder!.orderNumber,
        productId: null,
        componentId: createdComponent.body.id,
        quantity: 1,
      })
      .expect(201);

    const listResponse = await admin
      .get(`/api/projects/${project.id}/order-items`)
      .expect(200);

    expect(listResponse.body).toHaveLength(2);
    expect(listResponse.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        productId: createdProduct.body.id,
        componentId: null,
      }),
      expect.objectContaining({
        productId: null,
        componentId: createdComponent.body.id,
      }),
    ]));
  });

  it("replaces existing product-based sauna model items in the same project", async () => {
    const admin = await loginAdminAgent();
    const token = `FT27-ORDER-PRODUCT-${sequence++}`;
    const project = await createProjectFixture({ prefix: token, name: `${token}-Project` });

    const productCategory = await admin
      .post("/api/admin/master-data/product-categories")
      .send({ name: `${token}-Category`, isActive: true, version: 1 })
      .expect(201);

    const firstProduct = await admin
      .post("/api/admin/master-data/products")
      .send({
        name: `${token}-Model-A`,
        categoryId: productCategory.body.id,
        description: null,
        isActive: true,
        version: 1,
      })
      .expect(201);

    const secondProduct = await admin
      .post("/api/admin/master-data/products")
      .send({
        name: `${token}-Model-B`,
        categoryId: productCategory.body.id,
        description: null,
        isActive: true,
        version: 1,
      })
      .expect(201);

    await admin
      .post(`/api/projects/${project.id}/order-items`)
      .send({
        projectId: project.id,
        orderNumber: project.projectOrder!.orderNumber,
        productId: firstProduct.body.id,
        componentId: null,
        quantity: 1,
      })
      .expect(201);

    await admin
      .post(`/api/projects/${project.id}/order-items`)
      .send({
        projectId: project.id,
        orderNumber: project.projectOrder!.orderNumber,
        productId: secondProduct.body.id,
        componentId: null,
        quantity: 1,
      })
      .expect(201);

    await admin
      .get(`/api/projects/${project.id}/order-items`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveLength(1);
        expect(res.body[0].productId).toBe(secondProduct.body.id);
        expect(res.body[0].componentId).toBeNull();
      });
  });

  it("replaces items in the same component category and supports list/delete", async () => {
    const admin = await loginAdminAgent();
    const token = `FT27-ORDER-${sequence++}`;
    const project = await createProjectFixture({ prefix: token, name: `${token}-Project` });

    const categoryResponse = await admin
      .post("/api/admin/master-data/component-categories")
      .send({ name: `${token}-Category`, isActive: true, version: 1 })
      .expect(201);

    const firstComponent = await admin
      .post("/api/admin/master-data/components")
      .send({
        name: `${token}-Component-A`,
        categoryId: categoryResponse.body.id,
        description: null,
        isActive: true,
        version: 1,
      })
      .expect(201);

    const secondComponent = await admin
      .post("/api/admin/master-data/components")
      .send({
        name: `${token}-Component-B`,
        categoryId: categoryResponse.body.id,
        description: null,
        isActive: true,
        version: 1,
      })
      .expect(201);

    const created = await admin
      .post(`/api/projects/${project.id}/order-items`)
      .send({
        projectId: project.id,
        orderNumber: project.projectOrder!.orderNumber,
        productId: null,
        componentId: firstComponent.body.id,
        quantity: 1,
      })
      .expect(201);

    expect(created.body.componentId).toBe(firstComponent.body.id);

    const replaced = await admin
      .post(`/api/projects/${project.id}/order-items`)
      .send({
        projectId: project.id,
        orderNumber: project.projectOrder!.orderNumber,
        productId: null,
        componentId: secondComponent.body.id,
        quantity: 1,
      })
      .expect(201);

    const listResponse = await admin
      .get(`/api/projects/${project.id}/order-items`)
      .expect(200);

    expect(listResponse.body).toHaveLength(1);
    expect(listResponse.body[0].componentId).toBe(secondComponent.body.id);

    await admin
      .delete(`/api/projects/${project.id}/order-items/${replaced.body.id}`)
      .send({ version: replaced.body.version })
      .expect(204);

    await admin
      .get(`/api/projects/${project.id}/order-items`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveLength(0);
      });
  });

  it("replaces persisted product and component items when editing an existing project", async () => {
    const admin = await loginAdminAgent();
    const token = `FT27-ORDER-EDIT-PROJECT-${sequence++}`;
    const project = await createProjectFixture({ prefix: token, name: `${token}-Project` });
    const productCategory = await ensureProductCategory(admin, "Fass Saunen");
    const componentCategory = await ensureComponentCategory(admin, "\u00d6fen");

    const initialProduct = await admin
      .post("/api/admin/master-data/products")
      .send({
        name: `${token}-Initial-Product`,
        shortCode: `${token}-P0`,
        categoryId: productCategory.id,
        description: "Bestehendes Produkt vor der Bearbeitung.",
        isActive: true,
        version: 1,
      })
      .expect(201);

    const replacementProduct = await admin
      .post("/api/admin/master-data/products")
      .send({
        name: `${token}-Replacement-Product`,
        shortCode: `${token}-P1`,
        categoryId: productCategory.id,
        description: "Neu angelegtes Produkt fuer den Bearbeitungspfad.",
        isActive: true,
        version: 1,
      })
      .expect(201);

    const initialComponent = await admin
      .post("/api/admin/master-data/components")
      .send({
        name: `${token}-Initial-Component`,
        shortCode: `${token}-C0`,
        categoryId: componentCategory.id,
        description: "Bestehende Komponente vor der Bearbeitung.",
        isActive: true,
        version: 1,
      })
      .expect(201);

    const replacementComponent = await admin
      .post("/api/admin/master-data/components")
      .send({
        name: `${token}-Replacement-Component`,
        shortCode: `${token}-C1`,
        categoryId: componentCategory.id,
        description: "Neu angelegte Komponente fuer den Bearbeitungspfad.",
        isActive: true,
        version: 1,
      })
      .expect(201);

    await admin
      .post(`/api/projects/${project.id}/order-items`)
      .send({
        projectId: project.id,
        orderNumber: project.projectOrder!.orderNumber,
        productId: initialProduct.body.id,
        componentId: null,
        quantity: 1,
      })
      .expect(201);

    await admin
      .post(`/api/projects/${project.id}/order-items`)
      .send({
        projectId: project.id,
        orderNumber: project.projectOrder!.orderNumber,
        productId: null,
        componentId: initialComponent.body.id,
        quantity: 1,
      })
      .expect(201);

    await admin
      .post(`/api/projects/${project.id}/order-items`)
      .send({
        projectId: project.id,
        orderNumber: project.projectOrder!.orderNumber,
        productId: replacementProduct.body.id,
        componentId: null,
        quantity: 1,
      })
      .expect(201);

    await admin
      .post(`/api/projects/${project.id}/order-items`)
      .send({
        projectId: project.id,
        orderNumber: project.projectOrder!.orderNumber,
        productId: null,
        componentId: replacementComponent.body.id,
        quantity: 1,
      })
      .expect(201);

    const listResponse = await admin
      .get(`/api/projects/${project.id}/order-items`)
      .expect(200);

    expect(listResponse.body).toHaveLength(2);
    expect(listResponse.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        productId: replacementProduct.body.id,
        componentId: null,
      }),
      expect.objectContaining({
        productId: null,
        componentId: replacementComponent.body.id,
      }),
    ]));
    expect(listResponse.body.some((item: { productId: number | null }) => item.productId === initialProduct.body.id)).toBe(false);
    expect(listResponse.body.some((item: { componentId: number | null }) => item.componentId === initialComponent.body.id)).toBe(false);
  });

  it("rejects creating a new order item with an inactive product", async () => {
    const admin = await loginAdminAgent();
    const token = `FT27-ORDER-INACTIVE-PRODUCT-${sequence++}`;
    const project = await createProjectFixture({ prefix: token, name: `${token}-Project` });

    const productCategory = await admin
      .post("/api/admin/master-data/product-categories")
      .send({ name: `${token}-Category`, isActive: true, version: 1 })
      .expect(201);

    const inactiveProduct = await admin
      .post("/api/admin/master-data/products")
      .send({
        name: `${token}-Model-Inactive`,
        categoryId: productCategory.body.id,
        description: null,
        isActive: false,
        version: 1,
      })
      .expect(201);

    await admin
      .post(`/api/projects/${project.id}/order-items`)
      .send({
        projectId: project.id,
        orderNumber: project.projectOrder!.orderNumber,
        productId: inactiveProduct.body.id,
        componentId: null,
        quantity: 1,
      })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("INACTIVE_ENTITY_ASSIGNMENT");
      });
  });

  it("rejects creating a new order item with an inactive component", async () => {
    const admin = await loginAdminAgent();
    const token = `FT27-ORDER-INACTIVE-COMPONENT-${sequence++}`;
    const project = await createProjectFixture({ prefix: token, name: `${token}-Project` });

    const categoryResponse = await admin
      .post("/api/admin/master-data/component-categories")
      .send({ name: `${token}-Category`, isActive: true, version: 1 })
      .expect(201);

    const inactiveComponent = await admin
      .post("/api/admin/master-data/components")
      .send({
        name: `${token}-Component-Inactive`,
        categoryId: categoryResponse.body.id,
        description: null,
        isActive: false,
        version: 1,
      })
      .expect(201);

    await admin
      .post(`/api/projects/${project.id}/order-items`)
      .send({
        projectId: project.id,
        orderNumber: project.projectOrder!.orderNumber,
        productId: null,
        componentId: inactiveComponent.body.id,
        quantity: 1,
      })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe("INACTIVE_ENTITY_ASSIGNMENT");
      });
  });

  it("rejects order items without a single valid product-or-component reference", async () => {
    const admin = await loginAdminAgent();
    const token = `FT27-ORDER-INVALID-${sequence++}`;
    const project = await createProjectFixture({ prefix: token, name: `${token}-Project` });

    const productCategory = await admin
      .post("/api/admin/master-data/product-categories")
      .send({ name: `${token}-PROD-CAT`, isActive: true, version: 1 })
      .expect(201);

    const componentCategory = await admin
      .post("/api/admin/master-data/component-categories")
      .send({ name: `${token}-COMP-CAT`, isActive: true, version: 1 })
      .expect(201);

    const product = await admin
      .post("/api/admin/master-data/products")
      .send({
        name: `${token}-Product`,
        categoryId: productCategory.body.id,
        description: null,
        isActive: true,
        version: 1,
      })
      .expect(201);

    const component = await admin
      .post("/api/admin/master-data/components")
      .send({
        name: `${token}-Component`,
        categoryId: componentCategory.body.id,
        description: null,
        isActive: true,
        version: 1,
      })
      .expect(201);

    await admin
      .post(`/api/projects/${project.id}/order-items`)
      .send({
        projectId: project.id,
        orderNumber: project.projectOrder!.orderNumber,
        productId: null,
        componentId: null,
        quantity: 1,
      })
      .expect(422)
      .expect((res) => {
        expect(res.body.code).toBe("VALIDATION_ERROR");
      });

    await admin
      .post(`/api/projects/${project.id}/order-items`)
      .send({
        projectId: project.id,
        orderNumber: project.projectOrder!.orderNumber,
        productId: product.body.id,
        componentId: component.body.id,
        quantity: 1,
      })
      .expect(422)
      .expect((res) => {
        expect(res.body.code).toBe("VALIDATION_ERROR");
      });

    await admin
      .post(`/api/projects/${project.id}/order-items`)
      .send({
        projectId: project.id,
        orderNumber: project.projectOrder!.orderNumber,
        productId: null,
        componentId: null,
        quantity: 1,
      })
      .expect(422)
      .expect((res) => {
        expect(res.body.code).toBe("VALIDATION_ERROR");
      });

    await admin
      .post(`/api/projects/${project.id}/order-items`)
      .send({
        projectId: project.id + 1,
        orderNumber: project.projectOrder!.orderNumber,
        productId: product.body.id,
        componentId: null,
        quantity: 1,
      })
      .expect(422)
      .expect((res) => {
        expect(res.body.code).toBe("VALIDATION_ERROR");
      });
  });
});
