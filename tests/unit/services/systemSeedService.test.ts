/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - applySystemSeed legt fehlende System-Tags idempotent über ensureTagDefinition an.
 * - applySystemSeed legt fehlende Soll-Touren direkt über das Repository an.
 * - applySystemSeed legt den FT-33-Systemkunden 001 · Meisel & Gerken an oder aktualisiert ihn.
 * - applySystemSeed legt fehlende Notizvorlagen an.
 * - applySystemSeed überschreibt bestehende Notizvorlagen-Bodies nicht.
 * - applySystemSeed arbeitet in fester Reihenfolge: Tags, Touren, Kunden, Notizvorlagen.
 * - applySystemSeed migriert einen Tag mit Namen "Vakant" zu "Geparkt" vor dem normalen Seed-Lauf.
 * - applySystemSeed korrigiert Sondermaß gezielt auf isDefault=false, damit es in Pickern nutzbar bleibt.
 * - applySystemSeed migriert eine Tour mit Namen "Vakant" zu "Parkplatz" vor dem normalen Seed-Lauf.
 *
 * Fehlerfälle:
 * - Der Systemkunde wird nicht angelegt oder nicht auf den Sollzustand korrigiert.
 * - Bestehende Notizvorlagen verlieren ihren Body durch den Seed.
 * - Die Orchestrierung springt zwischen den Bereichen oder läuft in falscher Reihenfolge.
 *
 * Ziel:
 * Die Orchestrierungslogik des System-Seed-Service isoliert ohne echte DB-Zugriffe absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ABSENCE_CUSTOMER_ADDRESS_LINE1,
  ABSENCE_CUSTOMER_CITY,
  ABSENCE_CUSTOMER_COUNTRY,
  ABSENCE_CUSTOMER_NAME,
  ABSENCE_CUSTOMER_NUMBER,
  ABSENCE_CUSTOMER_POSTAL_CODE,
  ABSENCE_TAG_NAMES,
  ABSENCE_TOUR_COLOR,
  ABSENCE_TOUR_NAME,
} from "../../../shared/absenceAppointments";

const ensureTagDefinitionMock = vi.fn();
const getTagByNormalizedNameMock = vi.fn();
const updateTagWithVersionMock = vi.fn();
const getToursMock = vi.fn();
const createTourMock = vi.fn();
const updateTourWithVersionMock = vi.fn();
const getCustomersByCustomerNumberMock = vi.fn();
const createCustomerMock = vi.fn();
const updateCustomerWithVersionMock = vi.fn();
const getNoteTemplatesMock = vi.fn();
const createNoteTemplateMock = vi.fn();
const updateNoteTemplateWithVersionMock = vi.fn();

function buildSeededTours(overrides: Record<string, { color?: string; version?: number }> = {}) {
  return [
    { id: 1, name: "Parkplatz", color: overrides.Parkplatz?.color ?? "#D4537E", version: overrides.Parkplatz?.version ?? 1 },
    { id: 2, name: ABSENCE_TOUR_NAME, color: overrides[ABSENCE_TOUR_NAME]?.color ?? ABSENCE_TOUR_COLOR, version: overrides[ABSENCE_TOUR_NAME]?.version ?? 1 },
    { id: 3, name: "Schröder Halle", color: overrides["Schröder Halle"]?.color ?? "#5C3317", version: overrides["Schröder Halle"]?.version ?? 1 },
    { id: 7, name: "Tour 1", color: overrides["Tour 1"]?.color ?? "#006B6F", version: overrides["Tour 1"]?.version ?? 5 },
    { id: 8, name: "Tour 2", color: overrides["Tour 2"]?.color ?? "#00ACB1", version: overrides["Tour 2"]?.version ?? 1 },
    { id: 9, name: "Tour 3", color: overrides["Tour 3"]?.color ?? "#00CFD5", version: overrides["Tour 3"]?.version ?? 1 },
    { id: 10, name: "Tour 4", color: overrides["Tour 4"]?.color ?? "#5B4B8A", version: overrides["Tour 4"]?.version ?? 1 },
  ];
}

vi.mock("../../../server/repositories/masterDataRepository", () => ({
  getTagByNormalizedName: (...args: unknown[]) => getTagByNormalizedNameMock(...args),
  ensureTagDefinition: (...args: unknown[]) => ensureTagDefinitionMock(...args),
  updateTagWithVersion: (...args: unknown[]) => updateTagWithVersionMock(...args),
}));

vi.mock("../../../server/repositories/toursRepository", () => ({
  getTours: (...args: unknown[]) => getToursMock(...args),
  createTour: (...args: unknown[]) => createTourMock(...args),
  updateTourWithVersion: (...args: unknown[]) => updateTourWithVersionMock(...args),
}));

vi.mock("../../../server/repositories/customersRepository", () => ({
  getCustomersByCustomerNumber: (...args: unknown[]) => getCustomersByCustomerNumberMock(...args),
  createCustomer: (...args: unknown[]) => createCustomerMock(...args),
  updateCustomerWithVersion: (...args: unknown[]) => updateCustomerWithVersionMock(...args),
}));

vi.mock("../../../server/repositories/noteTemplatesRepository", () => ({
  getNoteTemplates: (...args: unknown[]) => getNoteTemplatesMock(...args),
  createNoteTemplate: (...args: unknown[]) => createNoteTemplateMock(...args),
  updateNoteTemplateWithVersion: (...args: unknown[]) => updateNoteTemplateWithVersionMock(...args),
}));

import { applySystemSeed, getSystemSeedPreview } from "../../../server/services/systemSeedService";

describe("systemSeedService", () => {
  beforeEach(() => {
    ensureTagDefinitionMock.mockReset();
    getTagByNormalizedNameMock.mockReset();
    updateTagWithVersionMock.mockReset();
    getToursMock.mockReset();
    createTourMock.mockReset();
    updateTourWithVersionMock.mockReset();
    getCustomersByCustomerNumberMock.mockReset();
    createCustomerMock.mockReset();
    updateCustomerWithVersionMock.mockReset();
    getNoteTemplatesMock.mockReset();
    createNoteTemplateMock.mockReset();
    updateNoteTemplateWithVersionMock.mockReset();

    ensureTagDefinitionMock.mockImplementation(async (input: { name: string; color: string; isDefault: boolean }) => ({
      id: 1,
      version: 1,
      ...input,
    }));
    getTagByNormalizedNameMock.mockResolvedValue(null);
    updateTagWithVersionMock.mockResolvedValue({ kind: "updated", row: { id: 1, name: "Geparkt", color: "#D4537E", version: 2 } });
    getToursMock.mockResolvedValue([]);
    createTourMock.mockImplementation(async (name: string, color: string) => ({ id: 1, name, color, version: 1 }));
    updateTourWithVersionMock.mockResolvedValue({
      kind: "updated",
      tour: { id: 1, name: "Parkplatz", color: "#D4537E", version: 2 },
    });
    getCustomersByCustomerNumberMock.mockResolvedValue([]);
    createCustomerMock.mockImplementation(async (input: Record<string, unknown>) => ({
      id: 1776,
      version: 1,
      ...input,
    }));
    updateCustomerWithVersionMock.mockResolvedValue({
      kind: "updated",
      customer: {
        id: 1776,
        customerNumber: ABSENCE_CUSTOMER_NUMBER,
        firstName: null,
        lastName: null,
        fullName: ABSENCE_CUSTOMER_NAME,
        company: ABSENCE_CUSTOMER_NAME,
        email: null,
        phone: null,
        addressLine1: ABSENCE_CUSTOMER_ADDRESS_LINE1,
        addressLine2: null,
        postalCode: ABSENCE_CUSTOMER_POSTAL_CODE,
        city: ABSENCE_CUSTOMER_CITY,
        country: ABSENCE_CUSTOMER_COUNTRY,
        isActive: true,
        version: 2,
      },
    });
    getNoteTemplatesMock.mockResolvedValue([]);
    createNoteTemplateMock.mockResolvedValue({
      id: 1,
      title: "Reklamation",
      body: "",
      cardColor: "#FF011B",
      print: true,
      sortOrder: 10,
      isActive: true,
      version: 1,
    });
    updateNoteTemplateWithVersionMock.mockResolvedValue({
      kind: "updated",
      template: {
        id: 1,
        title: "Reklamation",
        body: "bestehend",
        cardColor: "#FF011B",
        print: true,
        sortOrder: 10,
        isActive: false,
        version: 2,
      },
    });
  });

  it("legt fehlende Tags an und protokolliert sie", async () => {
    const result = await applySystemSeed();

    expect(ensureTagDefinitionMock).toHaveBeenCalledWith(expect.objectContaining({
      name: "Reklamation",
      color: "#FF011B",
      isDefault: true,
    }));
    expect(result.logLines).toContain("Tag angelegt: Reklamation");
    expect(result.logLines).toContain("Tag angelegt: Geparkt");
    for (const absenceTagName of ABSENCE_TAG_NAMES) {
      expect(ensureTagDefinitionMock).toHaveBeenCalledWith(expect.objectContaining({
        name: absenceTagName,
        isDefault: true,
      }));
      expect(result.logLines).toContain(`Tag angelegt: ${absenceTagName}`);
    }
    expect(ensureTagDefinitionMock).toHaveBeenCalledWith(expect.objectContaining({
      name: "Sondermaß",
      color: "#BA7517",
      isDefault: false,
    }));
  });

  it("meldet fehlende Soll-Einträge in der Preview als anlegbar", async () => {
    const preview = await getSystemSeedPreview();

    expect(preview.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "tag:storniert",
        kind: "tag",
        status: "missing",
        canApply: true,
        checkedByDefault: true,
      }),
      expect.objectContaining({
        key: "tour:parkplatz",
        kind: "tour",
        status: "missing",
        canApply: true,
        checkedByDefault: true,
      }),
      expect.objectContaining({
        key: "customer:001",
        kind: "customer",
        label: "001 · Meisel & Gerken",
        status: "missing",
        canApply: true,
        checkedByDefault: true,
      }),
      expect.objectContaining({
        key: "tag:urlaub",
        kind: "tag",
        status: "missing",
        canApply: true,
        checkedByDefault: true,
      }),
      expect.objectContaining({
        key: "noteTemplate:reklamation",
        kind: "noteTemplate",
        status: "missing",
        canApply: true,
        checkedByDefault: true,
      }),
    ]));
  });

  it("behandelt vorhandene Tags idempotent", async () => {
    getTagByNormalizedNameMock.mockImplementation(async (name: string) => {
      if (name === "Reklamation") {
        return {
          id: 11,
          name: "Reklamation",
          color: "#FF011B",
          isDefault: true,
          version: 2,
        };
      }
      return null;
    });
    ensureTagDefinitionMock.mockImplementation(async (input: { name: string; color: string; isDefault: boolean }) => ({
      id: 11,
      version: 2,
      ...input,
    }));

    const result = await applySystemSeed();

    expect(result.logLines).toContain("Tag unverändert: Reklamation");
  });

  it("meldet Sondermaß mit isDefault=true in der Preview als korrigierbare Abweichung", async () => {
    getTagByNormalizedNameMock.mockImplementation(async (name: string) => {
      if (name === "Sondermaß") {
        return {
          id: 31,
          name: "Sondermaß",
          color: "#BA7517",
          isDefault: true,
          version: 7,
        };
      }
      return null;
    });

    const preview = await getSystemSeedPreview();

    expect(preview.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "tag:sondermass",
        kind: "tag",
        label: "Sondermaß",
        status: "update",
        canApply: true,
        checkedByDefault: true,
      }),
    ]));
  });

  it("korrigiert Sondermaß bei gezieltem Seed-Lauf auf isDefault=false", async () => {
    getTagByNormalizedNameMock.mockImplementation(async (name: string) => {
      if (name === "Sondermaß") {
        return {
          id: 31,
          name: "Sondermaß",
          color: "#BA7517",
          isDefault: true,
          version: 7,
        };
      }
      return null;
    });
    ensureTagDefinitionMock.mockImplementation(async (input: { name: string; color: string; isDefault: boolean }) => ({
      id: 31,
      version: 8,
      ...input,
    }));

    const result = await applySystemSeed(["tag:sondermass"]);

    expect(ensureTagDefinitionMock).toHaveBeenCalledTimes(1);
    expect(ensureTagDefinitionMock).toHaveBeenCalledWith(expect.objectContaining({
      name: "Sondermaß",
      color: "#BA7517",
      isDefault: false,
    }));
    expect(result.logLines).toEqual(["Tag aktualisiert: Sondermaß"]);
    expect(createTourMock).not.toHaveBeenCalled();
    expect(createCustomerMock).not.toHaveBeenCalled();
    expect(createNoteTemplateMock).not.toHaveBeenCalled();
  });

  it("legt fehlende Touren an", async () => {
    getToursMock.mockResolvedValue([]);

    const result = await applySystemSeed();

    expect(createTourMock).toHaveBeenCalledWith("Parkplatz", "#D4537E");
    expect(createTourMock).toHaveBeenCalledWith(ABSENCE_TOUR_NAME, ABSENCE_TOUR_COLOR);
    expect(createTourMock).toHaveBeenCalledWith("Schröder Halle", "#5C3317");
    expect(result.logLines).toContain("Tour angelegt: Parkplatz");
  });

  it("legt den FT-33-Systemkunden mit dem Sollzustand an", async () => {
    const result = await applySystemSeed(["customer:001"]);

    expect(createCustomerMock).toHaveBeenCalledWith({
      customerNumber: ABSENCE_CUSTOMER_NUMBER,
      firstName: null,
      lastName: null,
      fullName: ABSENCE_CUSTOMER_NAME,
      company: ABSENCE_CUSTOMER_NAME,
      email: null,
      phone: null,
      addressLine1: ABSENCE_CUSTOMER_ADDRESS_LINE1,
      addressLine2: null,
      postalCode: ABSENCE_CUSTOMER_POSTAL_CODE,
      city: ABSENCE_CUSTOMER_CITY,
      country: ABSENCE_CUSTOMER_COUNTRY,
    });
    expect(result.logLines).toEqual(["Kunde angelegt: 001 · Meisel & Gerken"]);
    expect(ensureTagDefinitionMock).not.toHaveBeenCalled();
    expect(createTourMock).not.toHaveBeenCalled();
    expect(createNoteTemplateMock).not.toHaveBeenCalled();
  });

  it("führt nur explizit ausgewählte Seed-Schritte aus", async () => {
    const result = await applySystemSeed(["tour:parkplatz"]);

    expect(createTourMock).toHaveBeenCalledWith("Parkplatz", "#D4537E");
    expect(ensureTagDefinitionMock).not.toHaveBeenCalled();
    expect(createCustomerMock).not.toHaveBeenCalled();
    expect(createNoteTemplateMock).not.toHaveBeenCalled();
    expect(result.logLines).toEqual(["Tour angelegt: Parkplatz"]);
  });

  it("aktualisiert bestehende Tour-Farben auf den Sollzustand", async () => {
    getToursMock
      .mockResolvedValueOnce(buildSeededTours())
      .mockResolvedValueOnce(buildSeededTours())
      .mockResolvedValueOnce(buildSeededTours())
      .mockResolvedValueOnce(buildSeededTours({ "Tour 1": { color: "#999999", version: 4 } }))
      .mockResolvedValue(buildSeededTours());

    const result = await applySystemSeed();

    expect(updateTourWithVersionMock).toHaveBeenCalledWith(7, 4, "Tour 1", "#006B6F");
    expect(result.logLines).toContain("Tour aktualisiert: Tour 1");
  });

  it("aktualisiert den FT-33-Systemkunden bei Sollabweichungen", async () => {
    getCustomersByCustomerNumberMock.mockResolvedValue([{
      id: 1776,
      customerNumber: ABSENCE_CUSTOMER_NUMBER,
      firstName: null,
      lastName: null,
      fullName: ABSENCE_CUSTOMER_NAME,
      company: "Altname",
      email: null,
      phone: null,
      addressLine1: ABSENCE_CUSTOMER_ADDRESS_LINE1,
      addressLine2: null,
      postalCode: ABSENCE_CUSTOMER_POSTAL_CODE,
      city: ABSENCE_CUSTOMER_CITY,
      country: ABSENCE_CUSTOMER_COUNTRY,
      isActive: true,
      version: 4,
      tags: [],
    }]);

    const result = await applySystemSeed(["customer:001"]);

    expect(updateCustomerWithVersionMock).toHaveBeenCalledWith(1776, 4, expect.objectContaining({
      customerNumber: ABSENCE_CUSTOMER_NUMBER,
      company: ABSENCE_CUSTOMER_NAME,
      fullName: ABSENCE_CUSTOMER_NAME,
      addressLine1: ABSENCE_CUSTOMER_ADDRESS_LINE1,
    }));
    expect(result.logLines).toEqual(["Kunde aktualisiert: 001 · Meisel & Gerken"]);
  });

  it("legt fehlende Notizvorlagen an", async () => {
    const result = await applySystemSeed();

    expect(createNoteTemplateMock).toHaveBeenCalledWith(expect.objectContaining({
      title: "Reklamation",
      body: "",
      cardColor: "#FF011B",
      print: true,
      isActive: true,
    }));
    expect(result.logLines).toContain("Notizvorlage angelegt: Reklamation");
  });

  it("überschreibt bestehende Notizvorlagen-Bodies beim Update nicht", async () => {
    getNoteTemplatesMock.mockResolvedValue([{
      id: 21,
      title: "Reklamation",
      body: "bestehender Body",
      cardColor: "#ffffff",
      print: false,
      sortOrder: 99,
      isActive: false,
      version: 3,
    }]);

    await applySystemSeed();

    expect(updateNoteTemplateWithVersionMock).toHaveBeenCalledWith(21, 3, {
      cardColor: "#FF011B",
      print: true,
      sortOrder: 10,
    });
  });

  it("migriert Tag Vakant zu Geparkt und protokolliert die Migration", async () => {
    getTagByNormalizedNameMock.mockImplementation(async (name: string) => {
      if (name === "Vakant") {
        return { id: 99, name: "Vakant", color: "#D4537E", isDefault: true, version: 3 };
      }
      return null;
    });

    const result = await applySystemSeed();

    expect(updateTagWithVersionMock).toHaveBeenCalledWith(99, 3, { name: "Geparkt" });
    expect(result.logLines).toContain("Tag migriert: Vakant → Geparkt");
  });

  it("migriert Tour Vakant zu Parkplatz und protokolliert die Migration", async () => {
    getToursMock.mockResolvedValueOnce([
      { id: 42, name: "Vakant", color: "#D4537E", version: 5 },
    ]).mockResolvedValue([
      { id: 42, name: "Parkplatz", color: "#D4537E", version: 6 },
    ]);
    updateTourWithVersionMock.mockResolvedValue({ kind: "updated", tour: { id: 42, name: "Parkplatz", color: "#D4537E", version: 6 } });

    const result = await applySystemSeed();

    expect(updateTourWithVersionMock).toHaveBeenCalledWith(42, 5, "Parkplatz", "#D4537E");
    expect(result.logLines).toContain("Tour migriert: Vakant → Parkplatz");
  });

  it("läuft fehlerfrei wenn kein Vakant-Tag existiert (idempotent)", async () => {
    getTagByNormalizedNameMock.mockResolvedValue(null);

    await expect(applySystemSeed()).resolves.not.toThrow();
    expect(updateTagWithVersionMock).not.toHaveBeenCalled();
  });

  it("läuft fehlerfrei wenn keine Vakant-Tour existiert (idempotent)", async () => {
    getToursMock.mockResolvedValue([
      { id: 1, name: "Parkplatz", color: "#D4537E", version: 1 },
    ]);

    const result = await applySystemSeed();

    const migrateCall = (result.logLines as string[]).find((line) => line.includes("Tour migriert"));
    expect(migrateCall).toBeUndefined();
  });

  it("legt Parkplatz-Tour nach Migration als reguläre Soll-Tour an wenn nicht vorhanden", async () => {
    getToursMock.mockResolvedValueOnce([
      { id: 42, name: "Vakant", color: "#D4537E", version: 1 },
    ]).mockResolvedValue([
      { id: 42, name: "Parkplatz", color: "#D4537E", version: 2 },
    ]);
    updateTourWithVersionMock.mockResolvedValue({ kind: "updated", tour: { id: 42, name: "Parkplatz", color: "#D4537E", version: 2 } });

    const result = await applySystemSeed();

    expect(result.logLines).toContain("Tour migriert: Vakant → Parkplatz");
    expect(result.logLines).toContain("Tour unverändert: Parkplatz");
    expect(createTourMock).not.toHaveBeenCalledWith("Parkplatz", expect.anything());
  });

  it("arbeitet in fester Reihenfolge: Tags, Touren, Kunden, Notizvorlagen", async () => {
    const order: string[] = [];

    ensureTagDefinitionMock.mockImplementation(async (input: { name: string; color: string; isDefault: boolean }) => {
      order.push(`tag:${input.name}`);
      return { id: 1, version: 1, ...input };
    });
    createTourMock.mockImplementation(async (name: string, color: string) => {
      order.push(`tour:${name}`);
      return { id: 1, name, color, version: 1 };
    });
    createCustomerMock.mockImplementation(async (input: { customerNumber: string }) => {
      order.push(`customer:${input.customerNumber}`);
      return { id: 1776, version: 1, ...input };
    });
    createNoteTemplateMock.mockImplementation(async (input: { title: string }) => {
      order.push(`template:${input.title}`);
      return { id: 1, title: input.title, body: "", cardColor: "#000000", print: true, sortOrder: 0, isActive: true, version: 1 };
    });

    await applySystemSeed();

    const firstTourIndex = order.findIndex((entry) => entry.startsWith("tour:"));
    const firstCustomerIndex = order.findIndex((entry) => entry.startsWith("customer:"));
    const firstTemplateIndex = order.findIndex((entry) => entry.startsWith("template:"));
    const lastTagIndex = order.map((entry, index) => ({ entry, index }))
      .filter((item) => item.entry.startsWith("tag:"))
      .at(-1)?.index ?? -1;

    expect(lastTagIndex).toBeGreaterThanOrEqual(0);
    expect(firstTourIndex).toBeGreaterThan(lastTagIndex);
    expect(firstCustomerIndex).toBeGreaterThan(firstTourIndex);
    expect(firstTemplateIndex).toBeGreaterThan(firstCustomerIndex);
  });
});
