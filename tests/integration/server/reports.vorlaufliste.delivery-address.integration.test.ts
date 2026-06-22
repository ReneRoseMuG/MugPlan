/**
 * Test Scope:
 *
 * Abgedeckte Regeln (MS-68, FT 09 / FT 26):
 * - Die Vorlaufliste (Report-Konsument) gibt je Kunde die WIRKSAME LIEFERADRESSE aus:
 *   ohne abweichende Lieferadresse die Rechnungsadresse, mit abweichender Lieferadresse
 *   diese - und schliesst die Rechnungsadresse nachweislich aus.
 *
 * Fehlerfaelle:
 * - Der Report zeigt weiter die Rechnungsadresse, obwohl eine Lieferadresse gesetzt ist.
 *
 * Ziel:
 * Den Report-Konsumenten explizit gegen die serverseitige Aufloesung der wirksamen
 * Lieferadresse absichern (gleicher Resolver wie Kalender/Board/Export).
 *
 * Isolation: Klasse B (eigene, eindeutig getokte Testdaten; Nachweis ueber projectId und
 * eindeutige PLZ-Token mit Ausschluss), Baseline core, Storage none.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { SuperAgentTest } from "supertest";

import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import {
  createAppointmentFixture,
  createCustomerFixtureWithOverrides,
  createProjectFixture,
} from "../../helpers/testDataFactory";

let app: Awaited<ReturnType<typeof createApiTestApp>>;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function deliveryCategoryId(admin: SuperAgentTest): Promise<number> {
  const res = await admin.get("/api/address-categories").expect(200);
  const categories = res.body as Array<{ id: number; roleKey: string | null }>;
  const delivery = categories.find((category) => category.roleKey === "DELIVERY");
  if (!delivery) throw new Error("Lieferadress-Kategorie fehlt");
  return delivery.id;
}

describe("FT26/FT09 integration: Vorlaufliste zeigt die wirksame Lieferadresse", () => {
  it("ersetzt im Report die Rechnungsadresse durch die abweichende Lieferadresse", async () => {
    const admin = await loginAdminAgent(app);

    const customer = await createCustomerFixtureWithOverrides({
      prefix: "FT26-DELIV-CUST",
      postalCode: "10001",
      city: "Billtown",
      country: "Deutschland",
    });
    const project = await createProjectFixture({
      prefix: "FT26-DELIV-PROJ",
      customerId: customer.id,
      name: "Lieferadress Report",
    });
    await createAppointmentFixture({ projectId: project.id, startDate: "2101-04-15" });

    const reportUrl = "/api/reports/vorlaufliste?fromDate=2101-04-01&toDate=2101-04-30&page=1&pageSize=100";

    // Ohne Lieferadresse: Fallback auf Rechnungsadresse.
    const before = await admin.get(reportUrl).expect(200);
    const beforeRow = (before.body.items as Array<{ projectId: number; postalCode: string | null; city: string | null }>)
      .find((item) => item.projectId === project.id);
    expect(beforeRow).toBeDefined();
    expect(beforeRow!.postalCode).toBe("10001");
    expect(beforeRow!.city).toBe("Billtown");

    // Abweichende Lieferadresse setzen.
    await admin
      .post(`/api/customers/${customer.id}/addresses`)
      .send({
        categoryId: await deliveryCategoryId(admin),
        addressLine1: "Lieferstrasse 9",
        postalCode: "20002",
        city: "Deliverytown",
        country: "Deutschland",
      })
      .expect(201);

    // Report zeigt nun die Lieferadresse, NICHT mehr die Rechnungsadresse.
    const after = await admin.get(reportUrl).expect(200);
    const afterRow = (after.body.items as Array<{ projectId: number; postalCode: string | null; city: string | null }>)
      .find((item) => item.projectId === project.id);
    expect(afterRow).toBeDefined();
    expect(afterRow!.postalCode).toBe("20002");
    expect(afterRow!.city).toBe("Deliverytown");
    expect(afterRow!.postalCode).not.toBe("10001");
  });
});
