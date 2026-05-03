/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Alle bestehenden Rollen dürfen aktive Kalendermarker lesen.
 * - Admin und Disponent dürfen Marker anlegen, bearbeiten und löschen.
 * - Direkte Pflege-API-Aufrufe von Lesern werden serverseitig mit 403 blockiert.
 * - Versionierung schützt Pflege-Mutationen vor veralteten Bearbeitungsständen.
 *
 * Aussagekraft-Nachweis:
 * - Zielobjekt: echte Express-API-Routen `/api/calendar/markers` und `/api/admin/calendar-markers`.
 * - Eindeutiger Nachweis: eindeutige Testnutzer `calendar-markers-*` und Admin-Marker `Betriebsfeiertag Test` / `Brückentag`.
 * - Realistische Daten: echte Sessions, echte Rollenauflösung über Test-DB und echte Server-FS-Persistenz in temporären Verzeichnissen.
 * - Kritische Assertion: Leser/Disponent lesen Marker, Admin/Disponent mutieren Marker, Leser erhalten bei Pflege-Mutation `403`, stale Versionen erhalten `409`.
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
  readStoredCalendarMarkers,
  resetCalendarMarkersFileStoreForTests,
  setCalendarMarkersFileStoreForTests,
} from "../../../server/repositories/calendarMarkersRepository";
import {
  seedCalendarHolidays,
  seedCalendarHolidaysAfterFirstAdminLoginOfDay,
} from "../../../server/services/calendarMarkersService";

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
    await seedCalendarHolidays({ fromYear: 2026, toYear: 2026 });
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

  it("blockiert Pflege-Mutationen für Leser serverseitig", async () => {
    const reader = await createRoleAgent("READER");

    for (const agent of [reader]) {
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

  it("blockiert globale Visualisierungs-Settings für Leser serverseitig", async () => {
    const reader = await createRoleAgent("READER");
    const resolved = await reader.get("/api/user-settings/resolved").expect(200);
    const setting = (resolved.body as Array<{ key: string; globalVersion?: number }>).find(
      (entry) => entry.key === "calendar.markerVisualizationStyle",
    );
    expect(setting).toBeTruthy();

    await reader.patch("/api/user-settings").send({
      key: "calendar.markerVisualizationStyle",
      scopeType: "GLOBAL",
      version: setting?.globalVersion ?? 1,
      value: "highlighted",
    }).expect(403);
  });

  it("erlaubt Pflege-Mutationen für Disponenten serverseitig", async () => {
    const dispatcher = await createRoleAgent("DISPATCHER");

    const created = await dispatcher
      .post("/api/admin/calendar-markers")
      .send({
        date: "2026-05-02",
        endDate: null,
        name: "Disponent Feiertag",
        type: "company_holiday",
        source: "admin",
        scope: "company",
        states: [],
        active: true,
        note: null,
      })
      .expect(201);

    const adminList = await dispatcher.get("/api/admin/calendar-markers").expect(200);
    expect(adminList.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: created.body.id })]));

    const updated = await dispatcher
      .patch(`/api/admin/calendar-markers/${encodeURIComponent(created.body.id)}`)
      .send({
        date: "2026-05-02",
        endDate: null,
        name: "Disponent Feiertag aktualisiert",
        type: "company_holiday",
        source: "admin",
        scope: "company",
        states: [],
        active: true,
        note: "Disponent",
        version: created.body.version,
      })
      .expect(200);
    expect(updated.body.name).toBe("Disponent Feiertag aktualisiert");

    await dispatcher.delete(`/api/admin/calendar-markers/${encodeURIComponent(created.body.id)}`).send({ version: updated.body.version }).expect(204);
  });

  it("erlaubt globale Visualisierungs-Settings für Disponenten serverseitig", async () => {
    const dispatcher = await createRoleAgent("DISPATCHER");
    const resolved = await dispatcher.get("/api/user-settings/resolved").expect(200);
    const setting = (resolved.body as Array<{ key: string; globalVersion?: number }>).find(
      (entry) => entry.key === "calendar.markerVisualizationStyle",
    );
    expect(setting).toBeTruthy();

    await dispatcher.patch("/api/user-settings").send({
      key: "calendar.markerVisualizationStyle",
      scopeType: "GLOBAL",
      version: setting?.globalVersion ?? 1,
      value: "highlighted",
    }).expect(200);
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

  it("führt CRUD, Deaktivierung und Reaktivierung für gespeicherte Feiertage über echte API-Pfade aus", async () => {
    const admin = await loginAdminAgent(app);
    const createdHoliday = await admin
      .post("/api/admin/calendar-markers")
      .send({
        date: "2026-05-01",
        endDate: null,
        name: "Feiertag API Test",
        type: "public_holiday",
        source: "automatic",
        scope: "national",
        states: [],
        active: true,
        note: null,
      })
      .expect(201);

    const createdCompanyHoliday = await admin
      .post("/api/admin/calendar-markers")
      .send({
        date: "2026-05-02",
        endDate: null,
        name: "Betriebsfeiertag API Test",
        type: "company_holiday",
        source: "admin",
        scope: "company",
        states: [],
        active: true,
        note: null,
      })
      .expect(201);

    const createdVacation = await admin
      .post("/api/admin/calendar-markers")
      .send({
        date: "2026-05-04",
        endDate: "2026-05-06",
        name: "Betriebsferien API Test",
        type: "company_vacation",
        source: "admin",
        scope: "company",
        states: [],
        active: true,
        note: null,
      })
      .expect(201);

    const listBeforeDeactivate = await admin
      .get("/api/calendar/markers?fromDate=2026-05-01&toDate=2026-05-06")
      .expect(200);
    expect(listBeforeDeactivate.body.map((marker: { name: string }) => marker.name)).toEqual(expect.arrayContaining([
      "Feiertag API Test",
      "Betriebsfeiertag API Test",
      "Betriebsferien API Test",
    ]));

    const disabled = await admin
      .patch(`/api/admin/calendar-markers/${encodeURIComponent(createdHoliday.body.id)}`)
      .send({
        date: "2026-05-01",
        endDate: null,
        name: "Feiertag API Test deaktiviert",
        type: "public_holiday",
        source: "automatic",
        scope: "national",
        states: [],
        active: false,
        note: "deaktiviert",
        version: createdHoliday.body.version,
      })
      .expect(200);

    const listAfterDeactivate = await admin
      .get("/api/calendar/markers?fromDate=2026-05-01&toDate=2026-05-01")
      .expect(200);
    expect(listAfterDeactivate.body.map((marker: { name: string }) => marker.name)).not.toContain("Feiertag API Test deaktiviert");

    const reactivated = await admin
      .patch(`/api/admin/calendar-markers/${encodeURIComponent(createdHoliday.body.id)}`)
      .send({
        date: "2026-05-01",
        endDate: null,
        name: "Feiertag API Test reaktiviert",
        type: "public_holiday",
        source: "automatic",
        scope: "national",
        states: [],
        active: true,
        note: "reaktiviert",
        version: disabled.body.version,
      })
      .expect(200);

    const listAfterReactivate = await admin
      .get("/api/calendar/markers?fromDate=2026-05-01&toDate=2026-05-01")
      .expect(200);
    expect(listAfterReactivate.body.map((marker: { name: string }) => marker.name)).toContain("Feiertag API Test reaktiviert");

    await admin.delete(`/api/admin/calendar-markers/${encodeURIComponent(createdHoliday.body.id)}`).send({ version: reactivated.body.version }).expect(204);
    await admin.delete(`/api/admin/calendar-markers/${encodeURIComponent(createdCompanyHoliday.body.id)}`).send({ version: createdCompanyHoliday.body.version }).expect(204);
    await admin.delete(`/api/admin/calendar-markers/${encodeURIComponent(createdVacation.body.id)}`).send({ version: createdVacation.body.version }).expect(204);
  });

  it("seedet bei vorhandenen editierten Daten ohne Duplikate und ohne Rücksetzen", async () => {
    const admin = await loginAdminAgent(app);
    await seedCalendarHolidays({ fromYear: 2026, toYear: 2026 });
    const seededList = await admin.get("/api/admin/calendar-markers").expect(200);
    const maifeiertag = seededList.body.find((marker: { name: string }) => marker.name === "Maifeiertag");
    expect(maifeiertag).toBeTruthy();

    const edited = await admin
      .patch(`/api/admin/calendar-markers/${encodeURIComponent(maifeiertag.id)}`)
      .send({
        date: maifeiertag.date,
        endDate: maifeiertag.endDate,
        name: "Maifeiertag individuell",
        type: maifeiertag.type,
        source: maifeiertag.source,
        scope: maifeiertag.scope,
        states: maifeiertag.states,
        active: false,
        note: "bleibt erhalten",
        version: maifeiertag.version,
      })
      .expect(200);

    const secondSeed = await seedCalendarHolidays({ fromYear: 2026, toYear: 2026 });
    expect(secondSeed.created).toBe(0);

    const afterSeed = await admin.get("/api/admin/calendar-markers").expect(200);
    const matching = afterSeed.body.filter((marker: { date: string; type: string; source: string; scope: string; states: string[] }) =>
      marker.date === "2026-05-01"
      && marker.type === "public_holiday"
      && marker.source === "automatic"
      && marker.scope === "national"
      && marker.states.length === 0,
    );
    expect(matching).toHaveLength(1);
    expect(matching[0]).toMatchObject({
      id: edited.body.id,
      name: "Maifeiertag individuell",
      active: false,
      note: "bleibt erhalten",
      version: edited.body.version,
    });
  });

  it("seedet nur beim ersten Admin-Login des Tages", async () => {
    const first = await seedCalendarHolidaysAfterFirstAdminLoginOfDay(new Date("2026-05-01T06:00:00.000Z"));
    expect(first?.created).toBeGreaterThan(0);
    const storedAfterFirst = await readStoredCalendarMarkers();

    const second = await seedCalendarHolidaysAfterFirstAdminLoginOfDay(new Date("2026-05-01T12:00:00.000Z"));
    expect(second).toBeNull();
    const storedAfterSecond = await readStoredCalendarMarkers();
    expect(storedAfterSecond).toHaveLength(storedAfterFirst.length);
  });

  it("triggert den Feiertags-Seed nach Admin-Login, aber nicht nach Nicht-Admin-Login", async () => {
    const dispatcher = await createRoleAgent("DISPATCHER");
    expect(dispatcher).toBeTruthy();
    expect(await readStoredCalendarMarkers()).toEqual([]);

    await loginAdminAgent(app);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const stored = await readStoredCalendarMarkers();
      if (stored.some((marker) => marker.name === "Maifeiertag")) {
        expect(stored.some((marker) => marker.name === "Maifeiertag")).toBe(true);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error("Admin-Login hat den Feiertags-Seed nicht ausgelöst.");
  });
});
