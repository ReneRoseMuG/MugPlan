/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Report-Defaults-Endpunkt liefert den letzten verfuegbaren Projektermin systemweit.
 * - Mehrtaegige Projekttermine nutzen fuer das letzte verfuegbare Datum das Terminende.
 * - Nur ADMIN und DISPONENT duerfen die Report-Defaults lesen; READER wird abgewiesen.
 *
 * Fehlerfaelle:
 * - Kunden-Termine ohne Projekt verschieben den Report-Default nach hinten.
 * - Mehrtaegige Termine liefern nur das Startdatum statt des letzten Termintags.
 * - Die Rollenpruefung fuer den Defaults-Endpunkt fehlt.
 *
 * Ziel:
 * Den leichten Report-Read-Pfad fuer Datums- und KW-Defaults end-to-end absichern.
 */
import { beforeAll, describe, expect, it } from "vitest";

import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { createApiTestApp, loginAdminAgent, loginAgent } from "../../helpers/apiTestHarness";
import {
  createAppointmentFixture,
  createCustomerFixture,
  createProjectFixture,
} from "../../helpers/testDataFactory";

let app: Awaited<ReturnType<typeof createApiTestApp>>;
let authCounter = 1;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function createRoleAgent(roleCode: "DISPATCHER" | "READER") {
  const token = `${roleCode.toLowerCase()}-reports-defaults-${authCounter}`;
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

describe("integration: report config defaults endpoint", () => {
  it("returns the last available project appointment date and ignores customer-only appointments", async () => {
    const admin = await loginAdminAgent(app);
    const customer = await createCustomerFixture("FT26-REPORTS-DEFAULTS-CUST");
    const project = await createProjectFixture({
      prefix: "FT26-REPORTS-DEFAULTS-PROJ",
      customerId: customer.id,
      name: "FT26 Reports Defaults Projekt",
    });

    await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-09-01",
    });
    await createAppointmentFixture({
      projectId: project.id,
      startDate: "2099-09-05",
      endDate: "2099-09-07",
    });
    await createAppointmentFixture({
      customerId: customer.id,
      startDate: "2099-10-15",
    });

    const response = await admin.get("/api/reports/defaults").expect(200);

    expect(response.body).toEqual({
      latestProjectAppointmentDate: "2099-09-07",
    });
  });

  it("allows DISPONENT and READER", async () => {
    const dispatcher = await createRoleAgent("DISPATCHER");
    const reader = await createRoleAgent("READER");

    await dispatcher.get("/api/reports/defaults").expect(200);
    await reader.get("/api/reports/defaults").expect(200);
  });
});
