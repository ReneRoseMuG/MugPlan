/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die paginierte Kundenliste liefert nur den Seitenausschnitt statt der Vollmenge.
 * - Filter fuer Nachname und Kundennummer wirken vor dem Paging auf die Gesamttreffermenge.
 * - Die Listenaggregation liefert Notiz- und Terminzaehler fuer Board-/Tabellenkarten.
 * - Die Listenaggregation liefert `attachmentsCount` als korrekte Anzahl vorhandener Kundenanhaenge.
 *
 * Fehlerfaelle:
 * - Paging schneidet den falschen Ausschnitt.
 * - Filter arbeiten nur auf der aktuellen Seite statt auf der Grundmenge.
 * - Kartenrelevante Aggregatfelder fehlen oder sind inkonsistent.
 * - `attachmentsCount` fehlt oder wird nicht pro Kunde aggregiert.
 *
 * Ziel:
 * Den API-Vertrag der neuen paginierten Kundenliste fuer grosse Mengen regressionssicher absichern.
 */
import express from "express";
import { createServer } from "http";
import { beforeAll, describe, expect, it } from "vitest";

import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { loginAdminAgent } from "../../helpers/appointmentOverlapFixtures";
import { createAppointmentFixture, createCustomerFixture, createProjectFixture } from "../../helpers/testDataFactory";
import { db } from "../../../server/db";
import { customerAttachments } from "../../../shared/schema";

let app: express.Express;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
});

describe("FT30 integration: paged customers list", () => {
  it("returns only one board page from a larger result set", async () => {
    const agent = await loginAdminAgent(app);

    for (let index = 0; index < 55; index += 1) {
      await createCustomerFixture(`FT30-CUST-${String(index).padStart(3, "0")}`);
    }

    const response = await agent
      .get("/api/customers/list?scope=active&page=2&pageSize=50")
      .expect(200);

    expect(response.body.total).toBe(55);
    expect(response.body.totalPages).toBe(2);
    expect(response.body.page).toBe(2);
    expect(response.body.items).toHaveLength(5);
  });

  it("applies filters before paging and includes appointment counters", async () => {
    const agent = await loginAdminAgent(app);
    const customer = await createCustomerFixture("FT30-CUST-FILTER");
    const project = await createProjectFixture({
      prefix: "FT30-CUST-PROJECT",
      customerId: customer.id,
      name: "FT30 Customer Project",
    });
    await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-11-10",
    });

    await createCustomerFixture("FT30-CUST-OTHER");

    const response = await agent
      .get(`/api/customers/list?scope=active&lastName=${encodeURIComponent(customer.lastName ?? "")}&page=1&pageSize=50`)
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]?.customerNumber).toBe(customer.customerNumber);
    expect(response.body.items[0]?.appointmentsCount).toBe(1);
    expect(response.body.items[0]?.nextAppointmentStartDate).toBe("2099-11-10");
  });

  it("returns correct attachmentsCount per customer in paged list", async () => {
    const agent = await loginAdminAgent(app);
    const customerWithAttachment = await createCustomerFixture("FT30-CUST-ATTACH-WITH");
    const customerWithoutAttachment = await createCustomerFixture("FT30-CUST-ATTACH-WITHOUT");

    await db.insert(customerAttachments).values({
      customerId: customerWithAttachment.id,
      filename: "ft30-cust-test.pdf",
      originalName: "FT30 Kunden Anhang.pdf",
      mimeType: "application/pdf",
      fileSize: 512,
      storagePath: "/tmp/ft30-cust-test.pdf",
    });

    const response = await agent
      .get(`/api/customers/list?scope=active&customerNumber=${encodeURIComponent(customerWithAttachment.customerNumber)}&page=1&pageSize=50`)
      .expect(200);

    const withItem = response.body.items.find((item: { id: number }) => item.id === customerWithAttachment.id);
    expect(withItem?.attachmentsCount).toBe(1);

    const responseWithout = await agent
      .get(`/api/customers/list?scope=active&customerNumber=${encodeURIComponent(customerWithoutAttachment.customerNumber)}&page=1&pageSize=50`)
      .expect(200);

    const withoutItem = responseWithout.body.items.find((item: { id: number }) => item.id === customerWithoutAttachment.id);
    expect(withoutItem?.attachmentsCount).toBe(0);
  });
});
