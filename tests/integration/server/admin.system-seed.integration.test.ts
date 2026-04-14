/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - POST /api/admin/system-seed ist ADMIN-only.
 * - Der Endpoint seeded System-Tags inklusive "Planung blockiert", Soll-Touren und Notizvorlagen mit stabilem Vertrag.
 * - Ein zweiter Lauf bleibt idempotent und liefert unveraenderte Eintraege statt Duplikaten.
 * - Bestehende Notizvorlagen-Bodies werden beim Endpoint-Seed nicht ueberschrieben.
 *
 * Fehlerfaelle:
 * - Nicht-Admin kann den Endpoint ausfuehren.
 * - Wiederholter Lauf erzeugt Duplikate oder veraendert Bodies unerwuenscht.
 *
 * Ziel:
 * Den End-to-end-Vertrag des Admin-System-Seeds gegen die echte API-Pipeline absichern.
 */
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import { hashPassword } from "../../../server/security/passwordHash";
import { createUser } from "../../../server/repositories/usersRepository";
import * as masterDataRepository from "../../../server/repositories/masterDataRepository";
import * as noteTemplatesRepository from "../../../server/repositories/noteTemplatesRepository";
import * as toursRepository from "../../../server/repositories/toursRepository";

let app: Awaited<ReturnType<typeof createApiTestApp>>;
let userCounter = 1;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function createReaderAgent() {
  const suffix = `system-seed-reader-${userCounter++}`;
  const password = `${suffix}-password`;
  const passwordHash = await hashPassword(password);

  await createUser({
    username: suffix,
    email: `${suffix}@example.test`,
    firstName: "Reader",
    lastName: "SystemSeed",
    passwordHash,
    roleCode: "READER",
  });

  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ username: suffix, password }).expect(200);
  return agent;
}

describe("integration: admin system seed", () => {
  it("returns 403 for non-admin", async () => {
    const reader = await createReaderAgent();

    await reader
      .post("/api/admin/system-seed")
      .send({})
      .expect(403)
      .expect(({ body }) => {
        expect(body.code).toBe("FORBIDDEN");
      });
  });

  it("seeds tags, tours and note templates on first run", async () => {
    const admin = await loginAdminAgent(app);

    const response = await admin
      .post("/api/admin/system-seed")
      .send({})
      .expect(200);

    expect(response.body.logLines).toEqual(expect.arrayContaining([
      "Tag angelegt: Storniert",
      "Tag angelegt: Planung blockiert",
      "Tour angelegt: Parkplatz",
      "Notizvorlage angelegt: Reklamation",
    ]));

    const complaintTag = await masterDataRepository.getTagByNormalizedName("Reklamation");
    const vacantTag = await masterDataRepository.getTagByNormalizedName("Geparkt");
    const planningBlockedTag = await masterDataRepository.getTagByNormalizedName("Planung blockiert");
    const tours = await toursRepository.getTours();
    const templates = await noteTemplatesRepository.getNoteTemplates(false);

    expect(complaintTag).toMatchObject({ color: "#FF011B", isDefault: true });
    expect(vacantTag).toMatchObject({ color: "#D4537E", isDefault: true });
    expect(planningBlockedTag).toMatchObject({ color: "#8B6A00", isDefault: true });
    expect(tours).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Parkplatz", color: "#D4537E" }),
      expect.objectContaining({ name: "Tour 1", color: "#006B6F" }),
    ]));
    expect(templates).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: "Reklamation", cardColor: "#FF011B", print: true }),
      expect.objectContaining({ title: "Info zum Termin", cardColor: "#888780", print: true }),
    ]));
  });

  it("is idempotent on repeated runs and keeps existing template bodies", async () => {
    const admin = await loginAdminAgent(app);

    await noteTemplatesRepository.createNoteTemplate({
      title: "Reklamation",
      body: "Bestehender Body bleibt",
      cardColor: "#000000",
      print: false,
      sortOrder: 99,
      isActive: false,
      version: 1,
    });

    await admin.post("/api/admin/system-seed").send({}).expect(200);
    const secondRun = await admin.post("/api/admin/system-seed").send({}).expect(200);

    expect(secondRun.body.logLines).toEqual(expect.arrayContaining([
      "Tag unverändert: Reklamation",
      "Tag unverändert: Planung blockiert",
      "Tour unverändert: Parkplatz",
      "Notizvorlage unverändert: Reklamation",
    ]));

    const templates = await noteTemplatesRepository.getNoteTemplates(false);
    const complaintTemplates = templates.filter((template) => template.title === "Reklamation");

    expect(complaintTemplates).toHaveLength(1);
    expect(complaintTemplates[0]).toMatchObject({
      body: "Bestehender Body bleibt",
      cardColor: "#FF011B",
      print: true,
      sortOrder: 10,
      isActive: false,
    });
  });
});
