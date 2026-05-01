/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Alle bestehenden Rollen dürfen aktive Kalendermarker lesen.
 * - Nur Admin darf Marker anlegen, bearbeiten und löschen.
 * - Direkte Admin-API-Aufrufe von Disponent und Leser werden serverseitig mit 403 blockiert.
 * - Versionierung schützt Admin-Mutationen vor veralteten Bearbeitungsständen.
 *
 * Aussagekraft-Nachweis:
 * - Zielobjekt: echte Express-API-Routen `/api/calendar/markers` und `/api/admin/calendar-markers`.
 * - Eindeutiger Nachweis: eindeutige Testnutzer `calendar-markers-*` und Admin-Marker `Betriebsfeiertag Test` / `Brückentag`.
 * - Realistische Daten: echte Sessions, echte Rollenauflösung über Test-DB und echte Server-FS-Persistenz in temporären Verzeichnissen.
 * - Kritische Assertion: Leser/Disponent lesen Marker, Admin mutiert Marker, Nicht-Admins erhalten bei Admin-Mutation `403`, stale Versionen erhalten `409`.
 * - False-Positive-Schutz: jeder Test setzt einen frischen File-Store, erzeugt eigene Rollenuser und prüft konkrete Response-Codes statt nur UI-Sichtbarkeit.
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { SuperAgentTest } from "supertest";
import { createApiTestApp, loginAdminAgent, loginAgent } from "../../helpers/apiTestHarness";
import { createUser } from "../../../server/repositories/usersRepository";
import { hashPassword } from "../../../server/security/passwordHash";
import { ServerScopedFileStore } from "../../../server/services/serverScopedFileStore";
import {
  resetCalendarMarkersFileStoreForTests,
  setCalendarMarkersFileStoreForTests,
} from "../../../server/repositories/calendarMarkersRepository";

let app: Awaited<ReturnType<typeof createApiTestApp>>;
let tempRoot = "";
let userCounter = 1;

beforeAll(async () => {
  app = await createApiTestApp();
});

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mugplan-calendar-markers-api-"));
  setCalendarMarkersFileStoreForTests(new ServerScopedFileStore({ baseDirectory: tempRoot }));
  userCounter += 1;
});

afterEach(async () => {
  resetCalendarMarkersFileStoreForTests();
  if (tempRoot) {
    await fs.rm(tempRoot, { recursive: true, force: true });
    tempRoot = "";
  }
});

async function createRoleAgent(roleCode: "DISPATCHER" | "READER"): Promise<SuperAgentTest> {
  const username = `calendar-markers-${roleCode.toLowerCase()}-${userCounter}`;
  userCounter += 1;
  const password = `${username}-password`;
  await createUser({
    username,
    email: `${username}@local.test`,
    firstName: "Kalender",
    lastName: roleCode,
    passwordHash: await hashPassword(password),
    roleCode,
  });
  return loginAgent(app, { username, password });
}

describe("calendar marker API", () => {
  it("liefert automatische und aktive Admin-Marker für alle Les Rollen", async () => {
    const admin = await loginAdminAgent(app);
    const created = await admin
      .post("/api/admin/calendar-markers")
      .send({
        date: "2026-12-24",
        endDate: null,
        name: "Betriebsfeiertag Test",
        type: "company_holiday",
        source: "admin",
        scope: "company",
        states: [],
        active: true,
        note: null,
      })
      .expect(201);

    const dispatcher = await createRoleAgent("DISPATCHER");
    const reader = await createRoleAgent("READER");

    for (const agent of [admin, dispatcher, reader]) {
      const response = await agent
        .get("/api/calendar/markers?fromDate=2026-12-24&toDate=2026-12-26")
        .expect(200);
      const names = response.body.map((marker: { name: string }) => marker.name);
      expect(names).toContain("Betriebsfeiertag Test");
      expect(names).toContain("1. Weihnachtstag");
    }

    const adminList = await admin.get("/api/admin/calendar-markers").expect(200);
    expect(adminList.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: created.body.id })]));
  });

  it("blockiert Admin-Mutationen für Disponent und Leser serverseitig", async () => {
    const dispatcher = await createRoleAgent("DISPATCHER");
    const reader = await createRoleAgent("READER");

    for (const agent of [dispatcher, reader]) {
      const response = await agent
        .post("/api/admin/calendar-markers")
        .send({
          date: "2026-05-02",
          endDate: null,
          name: "Nicht erlaubt",
          type: "company_holiday",
          source: "admin",
          scope: "company",
          states: [],
          active: true,
          note: null,
        })
        .expect(403);
      expect(response.body).toEqual({ code: "FORBIDDEN" });
    }
  });

  it("erzwingt Versionen bei Admin-Updates und Delete", async () => {
    const admin = await loginAdminAgent(app);
    const created = await admin
      .post("/api/admin/calendar-markers")
      .send({
        date: "2026-05-02",
        endDate: null,
        name: "Brückentag",
        type: "company_holiday",
        source: "admin",
        scope: "company",
        states: [],
        active: true,
        note: null,
      })
      .expect(201);

    await admin
      .patch(`/api/admin/calendar-markers/${encodeURIComponent(created.body.id)}`)
      .send({
        date: "2026-05-02",
        endDate: null,
        name: "Brückentag geändert",
        type: "company_holiday",
        source: "admin",
        scope: "company",
        states: [],
        active: true,
        note: null,
        version: 99,
      })
      .expect(409);

    const updated = await admin
      .patch(`/api/admin/calendar-markers/${encodeURIComponent(created.body.id)}`)
      .send({
        date: "2026-05-02",
        endDate: null,
        name: "Brückentag geändert",
        type: "company_holiday",
        source: "admin",
        scope: "company",
        states: [],
        active: true,
        note: null,
        version: created.body.version,
      })
      .expect(200);

    await admin
      .delete(`/api/admin/calendar-markers/${encodeURIComponent(created.body.id)}`)
      .send({ version: created.body.version })
      .expect(409);

    await admin
      .delete(`/api/admin/calendar-markers/${encodeURIComponent(created.body.id)}`)
      .send({ version: updated.body.version })
      .expect(204);
  });
});
