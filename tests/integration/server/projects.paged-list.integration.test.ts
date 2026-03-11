/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die paginierte Projektliste liefert nur den angeforderten Seitenausschnitt.
 * - Projektfilter (Titel, Auftragsnummer, Status) wirken vor dem Paging auf die Grundmenge.
 * - Die Listenaggregation liefert Status-, Termin- und Artikellistenfelder fuer die Kartenansicht.
 *
 * Fehlerfaelle:
 * - Paging liefert Vollmengen oder falsche Seiten.
 * - Filter greifen nur auf den Seitenausschnitt statt auf die Gesamtmenge.
 * - Status-/Terminaggregation oder Projekt-Artikelliste fehlt in der Listenantwort.
 *
 * Ziel:
 * Den API-Vertrag der neuen paginierten Projektliste inklusive Kartenaggregation regressionssicher absichern.
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
import * as projectStatusService from "../../../server/services/projectStatusService";

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

    for (let index = 0; index < 55; index += 1) {
      const project = await createProjectFixture({
        prefix: `FT30-PROJ-${String(index).padStart(3, "0")}`,
        name: `FT30 Project ${String(index).padStart(3, "0")}`,
      });
      await createAppointmentFixture({
        projectId: project.id,
        startDate: `2099-10-${String((index % 20) + 1).padStart(2, "0")}`,
      });
    }

    const response = await agent
      .get("/api/projects/list?scope=upcoming&page=2&pageSize=50")
      .expect(200);

    expect(response.body.total).toBe(55);
    expect(response.body.totalPages).toBe(2);
    expect(response.body.page).toBe(2);
    expect(response.body.items).toHaveLength(5);
  });

  it("filters before paging and returns board status and appointment summary fields", async () => {
    const agent = await loginAdminAgent(app);
    const status = await projectStatusService.createProjectStatus({
      title: "FT30 Status",
      description: null,
      color: "#0f766e",
      sortOrder: 10,
    }, "ADMIN");
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
    await projectStatusService.addProjectStatus(project.id, status.id, 0, "ADMIN");
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
      .get("/api/projects/list?scope=upcoming&title=Target&statusIds=" + status.id + "&page=1&pageSize=50")
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]?.name).toBe("FT30 Target Project");
    expect(response.body.items[0]?.plannedAppointmentsCount).toBe(1);
    expect(response.body.items[0]?.nextAppointmentStartDate).toBe("2099-12-20");
    expect(response.body.items[0]?.statuses).toEqual([
      expect.objectContaining({ id: status.id, title: "FT30 Status" }),
    ]);
    expect(response.body.items[0]?.projectArticleItems).toEqual([
      { label: "Saunamodell", value: "FT30 Sauna Modell" },
      { label: "Fenster", value: "FT30 Rundfenster" },
    ]);
  });
});
