/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - GET/POST /api/admin/system-seed sind ADMIN-only.
 * - Der Preview-Endpoint meldet fehlende Soll-Einträge strukturiert vor der Ausführung.
 * - Der Apply-Endpoint seeded ausgewählte System-Tags, Soll-Touren, den FT-33-Systemkunden und Notizvorlagen mit stabilem Vertrag.
 * - Der Apply-Endpoint kann Sondermaß gezielt auf isDefault=false reparieren.
 * - Ein zweiter Lauf bleibt idempotent und liefert unveränderte Einträge statt Duplikaten.
 * - Bestehende Notizvorlagen-Bodies werden beim Endpoint-Seed nicht überschrieben.
 *
 * Fehlerfälle:
 * - Nicht-Admin kann den Endpoint ausführen.
 * - Wiederholter Lauf erzeugt Duplikate oder verändert Bodies unerwünscht.
 *
 * Ziel:
 * Den End-to-end-Vertrag des Admin-System-Seeds gegen die echte API-Pipeline absichern.
 */
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import {
  ABSENCE_CUSTOMER_ADDRESS_LINE1,
  ABSENCE_CUSTOMER_CITY,
  ABSENCE_CUSTOMER_COUNTRY,
  ABSENCE_CUSTOMER_NAME,
  ABSENCE_CUSTOMER_NUMBER,
  ABSENCE_CUSTOMER_POSTAL_CODE,
} from "../../../shared/absenceAppointments";
import { hashPassword } from "../../../server/security/passwordHash";
import { createUser } from "../../../server/repositories/usersRepository";
import * as customersRepository from "../../../server/repositories/customersRepository";
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
  it("returns 403 for non-admin on preview and apply", async () => {
    const reader = await createReaderAgent();

    await reader
      .get("/api/admin/system-seed")
      .expect(403)
      .expect(({ body }) => {
        expect(body.code).toBe("FORBIDDEN");
      });

    await reader
      .post("/api/admin/system-seed")
      .send({ selectedKeys: [] })
      .expect(403)
      .expect(({ body }) => {
        expect(body.code).toBe("FORBIDDEN");
      });
  });

  it("reports missing system entries before apply and seeds only selected items", async () => {
    const admin = await loginAdminAgent(app);

    const preview = await admin
      .get("/api/admin/system-seed")
      .expect(200);

    expect(preview.body.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "tag:storniert",
        kind: "tag",
        label: "Storniert",
        status: "missing",
        canApply: true,
      }),
      expect.objectContaining({
        key: "tour:parkplatz",
        kind: "tour",
        label: "Parkplatz",
        status: "missing",
        canApply: true,
      }),
      expect.objectContaining({
        key: "customer:001",
        kind: "customer",
        label: "001 · Meisel & Gerken",
        status: "missing",
        canApply: true,
      }),
      expect.objectContaining({
        key: "noteTemplate:reklamation",
        kind: "noteTemplate",
        label: "Reklamation",
        status: "missing",
        canApply: true,
      }),
    ]));

    const response = await admin
      .post("/api/admin/system-seed")
      .send({
        selectedKeys: [
          "tag:storniert",
          "tag:reklamation",
          "tag:geparkt",
          "tour:parkplatz",
          "customer:001",
          "noteTemplate:reklamation",
        ],
      })
      .expect(200);

    expect(response.body.logLines).toEqual(expect.arrayContaining([
      "Tag angelegt: Storniert",
      "Tour angelegt: Parkplatz",
      "Kunde angelegt: 001 · Meisel & Gerken",
      "Notizvorlage angelegt: Reklamation",
    ]));

    const complaintTag = await masterDataRepository.getTagByNormalizedName("Reklamation");
    const vacantTag = await masterDataRepository.getTagByNormalizedName("Geparkt");
    const tours = await toursRepository.getTours();
    const templates = await noteTemplatesRepository.getNoteTemplates(false);
    const customers = await customersRepository.getCustomersByCustomerNumber(ABSENCE_CUSTOMER_NUMBER);

    expect(complaintTag).toMatchObject({ color: "#FF011B", isDefault: true });
    expect(vacantTag).toMatchObject({ color: "#D4537E", isDefault: true });
    expect(tours).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Parkplatz", color: "#D4537E" }),
    ]));
    expect(tours.find((tour) => tour.name === "Tour 1")).toBeUndefined();
    expect(customers).toEqual(expect.arrayContaining([
      expect.objectContaining({
        customerNumber: ABSENCE_CUSTOMER_NUMBER,
        fullName: ABSENCE_CUSTOMER_NAME,
        company: ABSENCE_CUSTOMER_NAME,
        addressLine1: ABSENCE_CUSTOMER_ADDRESS_LINE1,
        postalCode: ABSENCE_CUSTOMER_POSTAL_CODE,
        city: ABSENCE_CUSTOMER_CITY,
        country: ABSENCE_CUSTOMER_COUNTRY,
        isActive: true,
      }),
    ]));
    expect(templates).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: "Reklamation", cardColor: "#FF011B", print: true }),
    ]));
    expect(templates.find((template) => template.title === "Info zum Termin")).toBeUndefined();
  });

  it("repairs only Sondermaß to isDefault=false when selected explicitly", async () => {
    const admin = await loginAdminAgent(app);

    await masterDataRepository.createTag({
      name: "Sondermaß",
      color: "#BA7517",
      isDefault: true,
    });

    const preview = await admin
      .get("/api/admin/system-seed")
      .expect(200);

    expect(preview.body.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "tag:sondermass",
        kind: "tag",
        label: "Sondermaß",
        status: "update",
        canApply: true,
        checkedByDefault: true,
      }),
    ]));

    const response = await admin
      .post("/api/admin/system-seed")
      .send({ selectedKeys: ["tag:sondermass"] })
      .expect(200);

    expect(response.body.logLines).toEqual(["Tag aktualisiert: Sondermaß"]);

    const specialMeasureTag = await masterDataRepository.getTagByNormalizedName("Sondermaß");
    const tours = await toursRepository.getTours();
    const templates = await noteTemplatesRepository.getNoteTemplates(false);
    const customers = await customersRepository.getCustomersByCustomerNumber(ABSENCE_CUSTOMER_NUMBER);

    expect(specialMeasureTag).toMatchObject({
      name: "Sondermaß",
      color: "#BA7517",
      isDefault: false,
    });
    expect(tours.find((tour) => tour.name === "Parkplatz")).toBeUndefined();
    expect(customers).toHaveLength(0);
    expect(templates.find((template) => template.title === "Reklamation")).toBeUndefined();
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

    const preview = await admin.get("/api/admin/system-seed").expect(200);
    const selectedKeys = preview.body.items
      .filter((item: { checkedByDefault: boolean }) => item.checkedByDefault)
      .map((item: { key: string }) => item.key);

    await admin.post("/api/admin/system-seed").send({ selectedKeys }).expect(200);
    const secondRun = await admin.post("/api/admin/system-seed").send({ selectedKeys }).expect(200);

    expect(secondRun.body.logLines).toEqual(expect.arrayContaining([
      "Tag unverändert: Reklamation",
      "Tour unverändert: Parkplatz",
      "Kunde unverändert: 001 · Meisel & Gerken",
      "Notizvorlage unverändert: Reklamation",
    ]));

    const templates = await noteTemplatesRepository.getNoteTemplates(false);
    const complaintTemplates = templates.filter((template) => template.title === "Reklamation");
    const customers = await customersRepository.getCustomersByCustomerNumber(ABSENCE_CUSTOMER_NUMBER);

    expect(complaintTemplates).toHaveLength(1);
    expect(complaintTemplates[0]).toMatchObject({
      body: "Bestehender Body bleibt",
      cardColor: "#FF011B",
      print: true,
      sortOrder: 10,
      isActive: false,
    });
    expect(customers).toHaveLength(1);
  });

  it("does not create preview candidates that are intentionally left unchecked", async () => {
    const admin = await loginAdminAgent(app);

    const preview = await admin.get("/api/admin/system-seed").expect(200);

    expect(preview.body.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "noteTemplate:reklamation",
        status: "missing",
        canApply: true,
      }),
      expect.objectContaining({
        key: "noteTemplate:info zum termin",
        status: "missing",
        canApply: true,
      }),
      expect.objectContaining({
        key: "customer:001",
        status: "missing",
        canApply: true,
      }),
    ]));

    await admin.post("/api/admin/system-seed").send({
      selectedKeys: ["noteTemplate:reklamation"],
    }).expect(200);

    const templates = await noteTemplatesRepository.getNoteTemplates(false);
    const customers = await customersRepository.getCustomersByCustomerNumber(ABSENCE_CUSTOMER_NUMBER);
    expect(templates.find((template) => template.title === "Reklamation")).toMatchObject({
      cardColor: "#FF011B",
      print: true,
    });
    expect(templates.find((template) => template.title === "Info zum Termin")).toBeUndefined();
    expect(customers).toHaveLength(0);
  });
});
