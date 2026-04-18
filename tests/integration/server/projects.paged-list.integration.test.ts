/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die paginierte Projektliste liefert nur den angeforderten Seitenausschnitt.
 * - Projektfilter (Titel, Auftragsnummer) wirken vor dem Paging auf die Grundmenge.
 * - Die Listenaggregation liefert Termin- und Artikellistenfelder fuer die Kartenansicht.
 * - Der ungepaginierte `/api/projects`-Pfad liefert `projectArticleItems` konsistent fuer Slot- und Detailnutzer.
 * - Der Detailpfad `/api/projects/:id` liefert `projectArticleItems` fuer Terminformular-Fallbacks stabil mit.
 * - Die Listenaggregation liefert `attachmentsCount` als korrekte Anzahl vorhandener Projektanhaenge.
 *
 * Fehlerfaelle:
 * - Paging liefert Vollmengen oder falsche Seiten.
 * - Filter greifen nur auf den Seitenausschnitt statt auf die Gesamtmenge.
 * - Terminaggregation oder Projekt-Artikelliste fehlt in der Listenantwort.
 * - Der Detailpfad `/api/projects/:id` verliert `projectArticleItems` oder liefert leere Listen nicht als `[]`.
 * - `/api/projects` verliert `projectArticleItems`, liefert `null` statt `[]` oder veraendert die Slot-Reihenfolge.
 * - `attachmentsCount` fehlt oder wird nicht pro Projekt aggregiert.
 *
 * Ziel:
 * Den API-Vertrag der paginierten und ungepaginierte Projektliste inklusive Kartenaggregation regressionssicher absichern.
 */
import express from "express";
import { createServer } from "http";
import { beforeAll, describe, expect, it } from "vitest";

import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { loginAdminAgent } from "../../helpers/appointmentOverlapFixtures";
import {
  createAppointmentFixture,
  createComponentFixture,
  createProductFixture,
  createProjectFixture,
  createProjectOrderItemFixture,
} from "../../helpers/testDataFactory";
import { db } from "../../../server/db";
import { projectAttachments } from "../../../shared/schema";
let app: express.Express;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

describe("FT30 integration: paged projects list", () => {
  it("returns only one board page from a larger upcoming result set", async () => {
    const agent = await loginAdminAgent(app);
    const pagingToken = "FT30-PAGING";

    for (let index = 0; index < 55; index += 1) {
      const project = await createProjectFixture({
        prefix: `${pagingToken}-${String(index).padStart(3, "0")}`,
        name: `${pagingToken} Project ${String(index).padStart(3, "0")}`,
      });
      await createAppointmentFixture({
        projectId: project.id,
        startDate: `2099-10-${String((index % 20) + 1).padStart(2, "0")}`,
      });
    }

    const response = await agent
      .get(`/api/projects/list?scope=upcoming&title=${encodeURIComponent(pagingToken)}&page=2&pageSize=50`)
      .expect(200);

    expect(response.body.total).toBe(55);
    expect(response.body.totalPages).toBe(2);
    expect(response.body.page).toBe(2);
    expect(response.body.items).toHaveLength(5);
    expect(response.body.items.every((item: { name?: string }) => item.name?.includes(pagingToken))).toBe(true);
  });

  it("filters before paging and returns board appointment summary fields", async () => {
    const agent = await loginAdminAgent(app);
    const project = await createProjectFixture({
      prefix: "FT30-PROJ-FILTER",
      name: "FT30 Target Project",
    });
    const saunaProduct = await createProductFixture({
      categoryName: "Fass Saunen",
      name: "FT30 Sauna Modell",
    });
    const windowComponent = await createComponentFixture({
      categoryName: "Fenster",
      name: "FT30 Rundfenster",
    });
    await createProjectOrderItemFixture({
      projectId: project.id,
      orderNumber: project.orderNumber ?? "",
      productId: saunaProduct.id,
    });
    await createProjectOrderItemFixture({
      projectId: project.id,
      orderNumber: project.orderNumber ?? "",
      componentId: windowComponent.id,
    });
    await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-12-20",
    });

    const response = await agent
      .get("/api/projects/list?scope=upcoming&title=Target&page=1&pageSize=50")
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]?.name).toBe("FT30 Target Project");
    expect(response.body.items[0]?.appointmentsCount).toBe(1);
    expect(response.body.items[0]?.nextAppointmentStartDate).toBe("2099-12-20");
    expect(response.body.items[0]?.projectArticleItems).toEqual([
      { label: "Sauna", value: "FT30 Sauna Modell", source: "product", shortCode: null },
      { label: "Fenster", value: "FT30 Rundfenster", source: "component", shortCode: null },
    ]);
  });

  it("returns projectArticleItems on GET /api/projects with stable item ordering and empty arrays", async () => {
    const agent = await loginAdminAgent(app);
    const projectWithItems = await createProjectFixture({
      prefix: "FT30-PROJ-SLOT",
      name: "FT30 Slot Projekt",
    });
    const projectWithoutItems = await createProjectFixture({
      prefix: "FT30-PROJ-EMPTY",
      name: "FT30 Leeres Projekt",
      descriptionMd: null,
    });
    const saunaProduct = await createProductFixture({
      categoryName: "Fass Saunen",
      name: "FT30 Slot Sauna",
    });
    const ovenComponent = await createComponentFixture({
      categoryName: "Oefen",
      name: "FT30 Slot Ofen",
    });

    await createProjectOrderItemFixture({
      projectId: projectWithItems.id,
      orderNumber: projectWithItems.orderNumber ?? "",
      productId: saunaProduct.id,
    });
    await createProjectOrderItemFixture({
      projectId: projectWithItems.id,
      orderNumber: projectWithItems.orderNumber ?? "",
      componentId: ovenComponent.id,
    });
    await createAppointmentFixture({
      projectId: projectWithItems.id,
      startDate: "2099-12-21",
    });
    await createAppointmentFixture({
      projectId: projectWithoutItems.id,
      startDate: "2099-12-22",
    });

    const response = await agent
      .get("/api/projects?filter=all&scope=all")
      .expect(200);

    const slotProject = response.body.find((entry: { id: number }) => entry.id === projectWithItems.id);
    const emptyProject = response.body.find((entry: { id: number }) => entry.id === projectWithoutItems.id);

    expect(slotProject).toMatchObject({
      id: projectWithItems.id,
      projectArticleItems: [
        { label: "Sauna", value: "FT30 Slot Sauna", source: "product", shortCode: null },
        { label: "Ofen", value: "FT30 Slot Ofen", source: "component", shortCode: null },
      ],
    });
    expect(emptyProject).toMatchObject({
      id: projectWithoutItems.id,
      projectArticleItems: [],
    });
  });

  it("returns projectArticleItems on GET /api/projects/:id with stable item ordering", async () => {
    const agent = await loginAdminAgent(app);
    const project = await createProjectFixture({
      prefix: "FT30-PROJ-DETAIL",
      name: "FT30 Detail Projekt",
    });
    const saunaProduct = await createProductFixture({
      categoryName: "Fass Saunen",
      name: "FT30 Detail Sauna",
    });
    const ovenComponent = await createComponentFixture({
      categoryName: "Oefen",
      name: "FT30 Detail Ofen",
    });

    await createProjectOrderItemFixture({
      projectId: project.id,
      orderNumber: project.orderNumber ?? "",
      productId: saunaProduct.id,
    });
    await createProjectOrderItemFixture({
      projectId: project.id,
      orderNumber: project.orderNumber ?? "",
      componentId: ovenComponent.id,
    });

    const response = await agent
      .get(`/api/projects/${project.id}`)
      .expect(200);

    expect(response.body.project).toMatchObject({
      id: project.id,
      projectArticleItems: [
        { label: "Sauna", value: "FT30 Detail Sauna", source: "product", shortCode: null },
        { label: "Ofen", value: "FT30 Detail Ofen", source: "component", shortCode: null },
      ],
    });
  });

  it("adds optional source and shortcode metadata to projectArticleItems without changing ordering", async () => {
    const agent = await loginAdminAgent(app);
    const project = await createProjectFixture({
      prefix: "FT30-PROJ-META",
      name: "FT30 Meta Projekt",
    });
    const saunaProduct = await createProductFixture({
      categoryName: "Fass Saunen",
      name: "FT30 Meta Sauna",
      shortCode: "FT30-SP",
    });
    const ovenComponent = await createComponentFixture({
      categoryName: "Oefen",
      name: "FT30 Meta Ofen",
      shortCode: "FT30-OC",
    });

    await createProjectOrderItemFixture({
      projectId: project.id,
      orderNumber: project.orderNumber ?? "",
      productId: saunaProduct.id,
    });
    await createProjectOrderItemFixture({
      projectId: project.id,
      orderNumber: project.orderNumber ?? "",
      componentId: ovenComponent.id,
    });
    await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-12-23",
    });

    const response = await agent
      .get(`/api/projects/${project.id}`)
      .expect(200);

    expect(response.body.project.projectArticleItems).toEqual([
      { label: "Sauna", value: "FT30 Meta Sauna", source: "product", shortCode: "FT30-SP" },
      { label: "Ofen", value: "FT30 Meta Ofen", source: "component", shortCode: "FT30-OC" },
    ]);
  });

  it("returns empty projectArticleItems arrays on GET /api/projects/:id", async () => {
    const agent = await loginAdminAgent(app);
    const project = await createProjectFixture({
      prefix: "FT30-PROJ-DETAIL-EMPTY",
      name: "FT30 Detail Leer",
      descriptionMd: null,
    });

    const response = await agent
      .get(`/api/projects/${project.id}`)
      .expect(200);

    expect(response.body.project).toMatchObject({
      id: project.id,
      projectArticleItems: [],
    });
  });

  it("returns correct attachmentsCount per project in paged list", async () => {
    const agent = await loginAdminAgent(app);
    const projectWithAttachment = await createProjectFixture({
      prefix: "FT30-ATTACH-WITH",
      name: "FT30 Projekt Mit Anhang",
    });
    const projectWithoutAttachment = await createProjectFixture({
      prefix: "FT30-ATTACH-WITHOUT",
      name: "FT30 Projekt Ohne Anhang",
    });
    await createAppointmentFixture({ projectId: projectWithAttachment.id, startDate: "2099-09-01" });
    await createAppointmentFixture({ projectId: projectWithoutAttachment.id, startDate: "2099-09-02" });

    await db.insert(projectAttachments).values({
      projectId: projectWithAttachment.id,
      filename: "ft30-test.pdf",
      originalName: "FT30 Test Anhang.pdf",
      mimeType: "application/pdf",
      fileSize: 1024,
      storagePath: "/tmp/ft30-test.pdf",
    });

    const response = await agent
      .get("/api/projects/list?scope=upcoming&title=FT30+Projekt&page=1&pageSize=50")
      .expect(200);

    const withItem = response.body.items.find((item: { id: number }) => item.id === projectWithAttachment.id);
    const withoutItem = response.body.items.find((item: { id: number }) => item.id === projectWithoutAttachment.id);

    expect(withItem?.attachmentsCount).toBe(1);
    expect(withoutItem?.attachmentsCount).toBe(0);
  });
});
