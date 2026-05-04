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
import * as appointmentsService from "../../../server/services/appointmentsService";
import { loginAdminAgent } from "../../helpers/appointmentOverlapFixtures";
import {
  attachProjectTagFixture,
  createAppointmentFixture,
  createComponentFixture,
  createProductFixture,
  createProjectFixture,
  createProjectOrderItemFixture,
  createTagFixture,
  createTourFixture,
  getRelativeBerlinDate,
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
    const tour = await createTourFixture("#336699");
    const nextAppointmentDate = getRelativeBerlinDate(2);
    const laterAppointmentDate = getRelativeBerlinDate(5);
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
    await appointmentsService.createAppointment({
      projectId: project.id,
      startDate: getRelativeBerlinDate(-3),
      startTime: "07:00:00",
    }, "ADMIN");
    await createAppointmentFixture({
      projectId: project.id,
      startDate: laterAppointmentDate,
      startTime: "08:00:00",
    });
    await createAppointmentFixture({
      projectId: project.id,
      startDate: nextAppointmentDate,
      startTime: "10:00:00",
      tourId: tour.id,
    });

    const response = await agent
      .get("/api/projects/list?scope=upcoming&title=Target&page=1&pageSize=50")
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]?.name).toBe("FT30 Target Project");
    expect(response.body.items[0]?.appointmentsCount).toBe(3);
    expect(response.body.items[0]?.nextAppointmentStartDate).toBe(nextAppointmentDate);
    expect(response.body.items[0]?.nextAppointmentStartTimeHour).toBe(10);
    expect(response.body.items[0]?.nextAppointmentTourName).toBe(tour.name);
    expect(response.body.items[0]?.nextAppointmentTourColor).toBe(tour.color);
    expect(response.body.items[0]?.projectArticleItems).toEqual([
      { label: "Sauna", value: "FT30 Sauna Modell", source: "product", shortCode: null },
      { label: "Fenster", value: "FT30 Rundfenster", source: "component", shortCode: null },
    ]);
  });

  it("filters by project article products and component categories before paging", async () => {
    const agent = await loginAdminAgent(app);
    const token = "FT30-ARTICLE-FILTER";
    const articleTag = await createTagFixture(`${token}-TAG`);
    const saunaNord = await createProductFixture({
      categoryName: "Fass Saunen",
      name: `${token} Sauna Nord`,
    });
    const saunaSued = await createProductFixture({
      categoryName: "Fass Saunen",
      name: `${token} Sauna Süd`,
    });
    const ovenCompact = await createComponentFixture({
      categoryName: "Ofen",
      name: `${token} Ofen Kompakt`,
    });
    const ovenClassic = await createComponentFixture({
      categoryName: "Ofen",
      name: `${token} Ofen Klassik`,
    });
    const windowPanorama = await createComponentFixture({
      categoryName: "Fenster",
      name: `${token} Fenster Panorama`,
    });
    const windowSmall = await createComponentFixture({
      categoryName: "Fenster",
      name: `${token} Fenster Klein`,
    });

    const projectNordCompactPanorama = await createProjectFixture({
      prefix: `${token}-NORD-KOMPAKT`,
      name: `${token} Nord Kompakt Panorama`,
    });
    const projectNordClassicSmall = await createProjectFixture({
      prefix: `${token}-NORD-KLASSIK`,
      name: `${token} Nord Klassik Klein`,
    });
    const projectSuedCompactSmall = await createProjectFixture({
      prefix: `${token}-SUED-KOMPAKT`,
      name: `${token} Süd Kompakt Klein`,
    });

    await createProjectOrderItemFixture({
      projectId: projectNordCompactPanorama.id,
      orderNumber: projectNordCompactPanorama.orderNumber ?? "",
      productId: saunaNord.id,
    });
    await createProjectOrderItemFixture({
      projectId: projectNordCompactPanorama.id,
      orderNumber: projectNordCompactPanorama.orderNumber ?? "",
      componentId: ovenCompact.id,
    });
    await createProjectOrderItemFixture({
      projectId: projectNordCompactPanorama.id,
      orderNumber: projectNordCompactPanorama.orderNumber ?? "",
      componentId: windowPanorama.id,
    });
    await attachProjectTagFixture(projectNordCompactPanorama.id, articleTag.id);

    await createProjectOrderItemFixture({
      projectId: projectNordClassicSmall.id,
      orderNumber: projectNordClassicSmall.orderNumber ?? "",
      productId: saunaNord.id,
    });
    await createProjectOrderItemFixture({
      projectId: projectNordClassicSmall.id,
      orderNumber: projectNordClassicSmall.orderNumber ?? "",
      componentId: ovenClassic.id,
    });
    await createProjectOrderItemFixture({
      projectId: projectNordClassicSmall.id,
      orderNumber: projectNordClassicSmall.orderNumber ?? "",
      componentId: windowSmall.id,
    });

    await createProjectOrderItemFixture({
      projectId: projectSuedCompactSmall.id,
      orderNumber: projectSuedCompactSmall.orderNumber ?? "",
      productId: saunaSued.id,
    });
    await createProjectOrderItemFixture({
      projectId: projectSuedCompactSmall.id,
      orderNumber: projectSuedCompactSmall.orderNumber ?? "",
      componentId: ovenCompact.id,
    });
    await createProjectOrderItemFixture({
      projectId: projectSuedCompactSmall.id,
      orderNumber: projectSuedCompactSmall.orderNumber ?? "",
      componentId: windowSmall.id,
    });

    await createAppointmentFixture({ projectId: projectNordCompactPanorama.id, startDate: "2099-11-01" });
    await createAppointmentFixture({ projectId: projectNordClassicSmall.id, startDate: "2099-11-02" });
    await createAppointmentFixture({ projectId: projectSuedCompactSmall.id, startDate: "2099-11-03" });

    const getProjectNames = async (query: string) => {
      const response = await agent
        .get(`/api/projects/list?scope=upcoming&${query}`)
        .expect(200);
      return {
        body: response.body,
        names: (response.body.items as Array<{ name: string }>).map((item) => item.name).sort(),
      };
    };

    const productOnly = await getProjectNames(`title=${encodeURIComponent(token)}&page=1&pageSize=1&articleProductIds=${saunaNord.id}`);
    expect(productOnly.body.total).toBe(2);
    expect(productOnly.body.totalPages).toBe(2);
    expect(productOnly.names).toHaveLength(1);

    const ovenOr = await getProjectNames(`title=${encodeURIComponent(token)}&page=1&pageSize=50&articleComponentIds=${ovenCompact.id},${ovenClassic.id}`);
    expect(ovenOr.names).toEqual([
      projectNordClassicSmall.name,
      projectNordCompactPanorama.name,
      projectSuedCompactSmall.name,
    ].sort());

    const productAndOven = await getProjectNames(`title=${encodeURIComponent(token)}&page=1&pageSize=50&articleProductIds=${saunaNord.id}&articleComponentIds=${ovenCompact.id}`);
    expect(productAndOven.names).toEqual([projectNordCompactPanorama.name]);

    const ovenAndWindow = await getProjectNames(`title=${encodeURIComponent(token)}&page=1&pageSize=50&articleComponentIds=${ovenCompact.id},${windowSmall.id}`);
    expect(ovenAndWindow.names).toEqual([projectSuedCompactSmall.name]);

    const combined = await getProjectNames(
      `page=1&pageSize=50&tagIds=${articleTag.id}&title=${encodeURIComponent(`${token} Nord`)}&articleProductIds=${saunaNord.id}&articleComponentIds=${ovenCompact.id},${windowPanorama.id}`,
    );
    expect(combined.body.total).toBe(1);
    expect(combined.names).toEqual([projectNordCompactPanorama.name]);
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
