/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - PUT /api/projects/:id/order-items ersetzt die gesamte Artikelliste atomar.
 * - Leere Liste löscht alle bestehenden Items ohne Fehler.
 * - Die Operation ist idempotent: zweimal dieselbe Liste liefert dasselbe Ergebnis.
 * - Inaktive Produkt-/Komponentenreferenzen werden blockiert (409 INACTIVE_ENTITY_ASSIGNMENT).
 * - Ungültige Items (productId + componentId beide gesetzt) werden abgelehnt (422 VALIDATION_ERROR).
 * - Anfragen auf nicht existierende Projekte werden mit 404 beantwortet.
 *
 * Fehlerfälle:
 * - Atomarität: Ein ungültiges Item in der Liste verhindert das Schreiben aller Items.
 * - Inaktive Referenzen: kein Item wird geschrieben, ursprünglicher Stand bleibt erhalten.
 *
 * Ziel:
 * Den neuen Replace-Endpunkt integrativ absichern, einschließlich Atomarität und Fehlerverhalten.
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

describe("replace order items endpoint: PUT /api/projects/:id/order-items", () => {
  it("returns 200 with empty list when replacing on a project with no existing items", async () => {
    const admin = await loginAdminAgent();
    const token = `REPLACE-EMPTY-NEW-${sequence++}`;
    const project = await createProjectFixture({ prefix: token });

    const putResponse = await admin
      .put(`/api/projects/${project.id}/order-items`)
      .send({ items: [] })
      .expect(200);

    expect(putResponse.body).toEqual([]);

    const getResponse = await admin
      .get(`/api/projects/${project.id}/order-items`)
      .expect(200);

    expect(getResponse.body).toEqual([]);
  });

  it("replaces empty project with two new items and persists them", async () => {
    const admin = await loginAdminAgent();
    const token = `REPLACE-TWO-ITEMS-${sequence++}`;
    const project = await createProjectFixture({ prefix: token });
    const productCategory = await ensureProductCategory(admin, "Fass Saunen Replace");
    const componentCategory = await ensureComponentCategory(admin, "Öfen Replace");

    const createdProduct = await admin
      .post("/api/admin/master-data/products")
      .send({
        name: `${token}-Product`,
        shortCode: `${token}-P`,
        categoryId: productCategory.id,
        description: "Produkt fuer Replace-Test.",
        isActive: true,
        version: 1,
      })
      .expect(201);

    const createdComponent = await admin
      .post("/api/admin/master-data/components")
      .send({
        name: `${token}-Component`,
        shortCode: `${token}-C`,
        categoryId: componentCategory.id,
        description: "Komponente fuer Replace-Test.",
        isActive: true,
        version: 1,
      })
      .expect(201);

    const putResponse = await admin
      .put(`/api/projects/${project.id}/order-items`)
      .send({
        items: [
          {
            projectId: project.id,
            orderNumber: project.projectOrder!.orderNumber,
            productId: createdProduct.body.id,
            componentId: null,
            quantity: 2,
          },
          {
            projectId: project.id,
            orderNumber: project.projectOrder!.orderNumber,
            productId: null,
            componentId: createdComponent.body.id,
            quantity: 3,
          },
        ],
      })
      .expect(200);

    expect(putResponse.body).toHaveLength(2);

    const getResponse = await admin
      .get(`/api/projects/${project.id}/order-items`)
      .expect(200);

    expect(getResponse.body).toHaveLength(2);
    expect(getResponse.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ productId: createdProduct.body.id, componentId: null }),
      expect.objectContaining({ productId: null, componentId: createdComponent.body.id }),
    ]));
  });

  it("replaces existing items completely – old items are no longer present after replace", async () => {
    const admin = await loginAdminAgent();
    const token = `REPLACE-OVERWRITE-${sequence++}`;
    const project = await createProjectFixture({ prefix: token });
    const productCategory = await ensureProductCategory(admin, "Fass Saunen Replace");

    const oldProduct = await admin
      .post("/api/admin/master-data/products")
      .send({
        name: `${token}-OldProduct`,
        shortCode: `${token}-OP`,
        categoryId: productCategory.id,
        description: "Altes Produkt.",
        isActive: true,
        version: 1,
      })
      .expect(201);

    const newProduct = await admin
      .post("/api/admin/master-data/products")
      .send({
        name: `${token}-NewProduct`,
        shortCode: `${token}-NP`,
        categoryId: productCategory.id,
        description: "Neues Produkt.",
        isActive: true,
        version: 1,
      })
      .expect(201);

    // Erst zwei alte Items anlegen
    await admin
      .put(`/api/projects/${project.id}/order-items`)
      .send({
        items: [
          {
            projectId: project.id,
            orderNumber: project.projectOrder!.orderNumber,
            productId: oldProduct.body.id,
            componentId: null,
            quantity: 1,
          },
        ],
      })
      .expect(200);

    // Jetzt durch neues Item ersetzen
    await admin
      .put(`/api/projects/${project.id}/order-items`)
      .send({
        items: [
          {
            projectId: project.id,
            orderNumber: project.projectOrder!.orderNumber,
            productId: newProduct.body.id,
            componentId: null,
            quantity: 5,
          },
        ],
      })
      .expect(200);

    const getResponse = await admin
      .get(`/api/projects/${project.id}/order-items`)
      .expect(200);

    expect(getResponse.body).toHaveLength(1);
    expect(getResponse.body[0]).toMatchObject({
      productId: newProduct.body.id,
      quantity: 5,
    });
    const oldIds = (getResponse.body as { productId: number }[]).map((i) => i.productId);
    expect(oldIds).not.toContain(oldProduct.body.id);
  });

  it("replaces existing items with empty list – all items are deleted", async () => {
    const admin = await loginAdminAgent();
    const token = `REPLACE-DELETE-ALL-${sequence++}`;
    const project = await createProjectFixture({ prefix: token });
    const productCategory = await ensureProductCategory(admin, "Fass Saunen Replace");

    const product = await admin
      .post("/api/admin/master-data/products")
      .send({
        name: `${token}-Product`,
        shortCode: `${token}-P`,
        categoryId: productCategory.id,
        description: "Produkt fuer Delete-All-Test.",
        isActive: true,
        version: 1,
      })
      .expect(201);

    await admin
      .put(`/api/projects/${project.id}/order-items`)
      .send({
        items: [
          {
            projectId: project.id,
            orderNumber: project.projectOrder!.orderNumber,
            productId: product.body.id,
            componentId: null,
            quantity: 1,
          },
        ],
      })
      .expect(200);

    await admin
      .put(`/api/projects/${project.id}/order-items`)
      .send({ items: [] })
      .expect(200);

    const getResponse = await admin
      .get(`/api/projects/${project.id}/order-items`)
      .expect(200);

    expect(getResponse.body).toEqual([]);
  });

  it("is idempotent: calling replace twice with the same list yields the same result", async () => {
    const admin = await loginAdminAgent();
    const token = `REPLACE-IDEMPOTENT-${sequence++}`;
    const project = await createProjectFixture({ prefix: token });
    const productCategory = await ensureProductCategory(admin, "Fass Saunen Replace");

    const product = await admin
      .post("/api/admin/master-data/products")
      .send({
        name: `${token}-Product`,
        shortCode: `${token}-P`,
        categoryId: productCategory.id,
        description: "Produkt fuer Idempotenz-Test.",
        isActive: true,
        version: 1,
      })
      .expect(201);

    const payload = {
      items: [
        {
          projectId: project.id,
          orderNumber: project.projectOrder!.orderNumber,
          productId: product.body.id,
          componentId: null,
          quantity: 4,
        },
      ],
    };

    const firstResponse = await admin
      .put(`/api/projects/${project.id}/order-items`)
      .send(payload)
      .expect(200);

    const secondResponse = await admin
      .put(`/api/projects/${project.id}/order-items`)
      .send(payload)
      .expect(200);

    expect(secondResponse.body).toHaveLength(firstResponse.body.length);
    expect(secondResponse.body[0]).toMatchObject({
      productId: product.body.id,
      quantity: 4,
    });

    const getResponse = await admin
      .get(`/api/projects/${project.id}/order-items`)
      .expect(200);

    expect(getResponse.body).toHaveLength(1);
    expect(getResponse.body[0]).toMatchObject({ productId: product.body.id, quantity: 4 });
  });

  it("returns 422 and leaves original items unchanged when one item is invalid (productId + componentId both set)", async () => {
    const admin = await loginAdminAgent();
    const token = `REPLACE-ATOMIC-${sequence++}`;
    const project = await createProjectFixture({ prefix: token });
    const productCategory = await ensureProductCategory(admin, "Fass Saunen Replace");
    const componentCategory = await ensureComponentCategory(admin, "Öfen Replace");

    const product = await admin
      .post("/api/admin/master-data/products")
      .send({
        name: `${token}-Product`,
        shortCode: `${token}-P`,
        categoryId: productCategory.id,
        description: "Produkt fuer Atomaritaets-Test.",
        isActive: true,
        version: 1,
      })
      .expect(201);

    const component = await admin
      .post("/api/admin/master-data/components")
      .send({
        name: `${token}-Component`,
        shortCode: `${token}-C`,
        categoryId: componentCategory.id,
        description: "Komponente fuer Atomaritaets-Test.",
        isActive: true,
        version: 1,
      })
      .expect(201);

    // Erst einen gültigen Stand herstellen
    await admin
      .put(`/api/projects/${project.id}/order-items`)
      .send({
        items: [
          {
            projectId: project.id,
            orderNumber: project.projectOrder!.orderNumber,
            productId: product.body.id,
            componentId: null,
            quantity: 1,
          },
        ],
      })
      .expect(200);

    // Replace mit ungültigem Item (productId + componentId beide gesetzt)
    await admin
      .put(`/api/projects/${project.id}/order-items`)
      .send({
        items: [
          {
            projectId: project.id,
            orderNumber: project.projectOrder!.orderNumber,
            productId: product.body.id,
            componentId: null,
            quantity: 1,
          },
          {
            projectId: project.id,
            orderNumber: project.projectOrder!.orderNumber,
            productId: product.body.id,
            componentId: component.body.id,
            quantity: 1,
          },
        ],
      })
      .expect(422);

    // Ursprünglicher Stand muss erhalten sein
    const getResponse = await admin
      .get(`/api/projects/${project.id}/order-items`)
      .expect(200);

    expect(getResponse.body).toHaveLength(1);
    expect(getResponse.body[0]).toMatchObject({ productId: product.body.id });
  });

  it("returns 409 INACTIVE_ENTITY_ASSIGNMENT when replacing with an inactive product", async () => {
    const admin = await loginAdminAgent();
    const token = `REPLACE-INACTIVE-PROD-${sequence++}`;
    const project = await createProjectFixture({ prefix: token });
    const productCategory = await ensureProductCategory(admin, "Fass Saunen Replace");

    const inactiveProduct = await admin
      .post("/api/admin/master-data/products")
      .send({
        name: `${token}-InactiveProduct`,
        shortCode: `${token}-IP`,
        categoryId: productCategory.id,
        description: "Inaktives Produkt.",
        isActive: false,
        version: 1,
      })
      .expect(201);

    const putResponse = await admin
      .put(`/api/projects/${project.id}/order-items`)
      .send({
        items: [
          {
            projectId: project.id,
            orderNumber: project.projectOrder!.orderNumber,
            productId: inactiveProduct.body.id,
            componentId: null,
            quantity: 1,
          },
        ],
      })
      .expect(409);

    expect(putResponse.body).toMatchObject({ code: "INACTIVE_ENTITY_ASSIGNMENT" });

    const getResponse = await admin
      .get(`/api/projects/${project.id}/order-items`)
      .expect(200);

    expect(getResponse.body).toEqual([]);
  });

  it("returns 404 when project does not exist", async () => {
    const admin = await loginAdminAgent();

    await admin
      .put("/api/projects/999999999/order-items")
      .send({ items: [] })
      .expect(404);
  });
});
