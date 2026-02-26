/**
 * Test Scope:
 *
 * Feature: FT23 - CSV-Import Mitarbeitende
 * Use Case: UC23/01 Import per Upload inklusive Rollenpruefung und Ergebnisreport
 *
 * Abgedeckte Regeln:
 * - Nur ADMIN darf den Import-Endpunkt ausfuehren.
 * - CSV-Import verarbeitet gueltige Zeilen, ueberspringt Duplikate und liefert Summen.
 * - Fehlende Header und leere/ungueltige CSV-Inhalte liefern fachliche Fehlercodes.
 *
 * Fehlerfaelle:
 * - Nicht-Admin-Import liefert FORBIDDEN.
 * - Fehlende Pflichtheader liefern INVALID_CSV_HEADER.
 * - Inhalt ohne verarbeitbare Daten liefert INVALID_CSV_CONTENT.
 *
 * Ziel:
 * Den Endpunktvertrag fuer UC23/01 in realem HTTP-/Service-/Repository-Flow absichern.
 */
import express from "express";
import { createServer } from "http";
import request, { type SuperAgentTest } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../../../server/routes";
import { errorHandler } from "../../../server/middleware/errorHandler";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { nextDeterministicToken } from "../../helpers/deterministic";

let app: express.Express;

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
  await agent.post("/api/auth/login").send({ username: "test-admin", password: "test-admin-password" }).expect(200);
  return agent;
}

async function createReaderAgent(): Promise<SuperAgentTest> {
  const username = `test-reader-${nextDeterministicToken("employees-import-reader")}`;
  const password = "test-reader-password";
  const passwordHash = await hashPassword(password);
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "Test",
    lastName: "Reader",
    passwordHash,
    roleCode: "READER",
  });

  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username, password }).expect(200);
  return agent;
}

describe("FT23 integration: employees csv import", () => {
  it("imports valid rows and reports duplicates", async () => {
    const admin = await loginAdminAgent();
    await admin
      .post("/api/employees")
      .send({ firstName: "Max", lastName: "Muster", phone: null, email: null })
      .expect(201);

    const csv = "Vorname;Nachname\nMax;Muster\nAnna;Neu\n anna ; neu \n";

    await admin
      .post("/api/employees/import-csv")
      .attach("file", Buffer.from(csv, "utf8"), "employees.csv")
      .expect(200)
      .expect((res) => {
        expect(res.body.summary.totalRows).toBe(3);
        expect(res.body.summary.importedRows).toBe(1);
        expect(res.body.summary.duplicateRows).toBe(2);
        expect(res.body.summary.invalidRows).toBe(0);
      });
  });

  it("blocks non-admin users", async () => {
    const reader = await createReaderAgent();
    const csv = "Vorname,Nachname\nMax,Muster\n";
    await reader
      .post("/api/employees/import-csv")
      .attach("file", Buffer.from(csv, "utf8"), "employees.csv")
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe("FORBIDDEN");
      });
  });

  it("returns INVALID_CSV_HEADER for missing required headers", async () => {
    const admin = await loginAdminAgent();
    const csv = "Name;Surname\nMax;Muster\n";
    await admin
      .post("/api/employees/import-csv")
      .attach("file", Buffer.from(csv, "utf8"), "employees.csv")
      .expect(400)
      .expect((res) => {
        expect(res.body.code).toBe("INVALID_CSV_HEADER");
      });
  });

  it("returns INVALID_CSV_CONTENT for empty csv", async () => {
    const admin = await loginAdminAgent();
    await admin
      .post("/api/employees/import-csv")
      .attach("file", Buffer.from("", "utf8"), "employees.csv")
      .expect(422)
      .expect((res) => {
        expect(res.body.code).toBe("INVALID_CSV_CONTENT");
      });
  });
});
