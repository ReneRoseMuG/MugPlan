/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - applySystemSeed legt fehlende System-Tags idempotent ueber ensureTagDefinition an.
 * - applySystemSeed legt fehlende Soll-Touren direkt ueber das Repository an.
 * - applySystemSeed aktualisiert abweichende Tour-Farben ueber updateTourWithVersion.
 * - applySystemSeed legt fehlende Notizvorlagen an.
 * - applySystemSeed ueberschreibt bestehende Notizvorlagen-Bodies nicht.
 * - applySystemSeed arbeitet in fester Reihenfolge: Tags, Touren, Notizvorlagen.
 *
 * Fehlerfaelle:
 * - Tour-Farben bleiben bei bestehender Tour trotz Sollabweichung unveraendert.
 * - Bestehende Notizvorlagen verlieren ihren Body durch den Seed.
 * - Die Orchestrierung springt zwischen den Bereichen oder laeuft in falscher Reihenfolge.
 *
 * Ziel:
 * Die Orchestrierungslogik des System-Seed-Service isoliert ohne echte DB-Zugriffe absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const ensureTagDefinitionMock = vi.fn();
const getTagByNormalizedNameMock = vi.fn();
const getToursMock = vi.fn();
const createTourMock = vi.fn();
const updateTourWithVersionMock = vi.fn();
const getNoteTemplatesMock = vi.fn();
const createNoteTemplateMock = vi.fn();
const updateNoteTemplateWithVersionMock = vi.fn();

vi.mock("../../../server/repositories/masterDataRepository", () => ({
  getTagByNormalizedName: (...args: unknown[]) => getTagByNormalizedNameMock(...args),
  ensureTagDefinition: (...args: unknown[]) => ensureTagDefinitionMock(...args),
}));

vi.mock("../../../server/repositories/toursRepository", () => ({
  getTours: (...args: unknown[]) => getToursMock(...args),
  createTour: (...args: unknown[]) => createTourMock(...args),
  updateTourWithVersion: (...args: unknown[]) => updateTourWithVersionMock(...args),
}));

vi.mock("../../../server/repositories/noteTemplatesRepository", () => ({
  getNoteTemplates: (...args: unknown[]) => getNoteTemplatesMock(...args),
  createNoteTemplate: (...args: unknown[]) => createNoteTemplateMock(...args),
  updateNoteTemplateWithVersion: (...args: unknown[]) => updateNoteTemplateWithVersionMock(...args),
}));

import { applySystemSeed } from "../../../server/services/systemSeedService";

describe("systemSeedService", () => {
  beforeEach(() => {
    ensureTagDefinitionMock.mockReset();
    getTagByNormalizedNameMock.mockReset();
    getToursMock.mockReset();
    createTourMock.mockReset();
    updateTourWithVersionMock.mockReset();
    getNoteTemplatesMock.mockReset();
    createNoteTemplateMock.mockReset();
    updateNoteTemplateWithVersionMock.mockReset();

    ensureTagDefinitionMock.mockImplementation(async (input: { name: string; color: string; isDefault: boolean }) => ({
      id: 1,
      version: 1,
      ...input,
    }));
    getTagByNormalizedNameMock.mockResolvedValue(null);
    getToursMock.mockResolvedValue([]);
    createTourMock.mockResolvedValue({ id: 1, name: "Vakant", color: "#D4537E", version: 1 });
    updateTourWithVersionMock.mockResolvedValue({
      kind: "updated",
      tour: { id: 1, name: "Vakant", color: "#D4537E", version: 2 },
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
    expect(result.logLines).toContain("Tag angelegt: Vakant");
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

  it("legt fehlende Touren an", async () => {
    getToursMock.mockResolvedValue([]);

    const result = await applySystemSeed();

    expect(createTourMock).toHaveBeenCalledWith("Vakant", "#D4537E");
    expect(createTourMock).toHaveBeenCalledWith("Schröder Halle", "#5C3317");
    expect(result.logLines).toContain("Tour angelegt: Vakant");
  });

  it("aktualisiert bestehende Tour-Farben auf den Sollzustand", async () => {
    getToursMock
      .mockResolvedValueOnce([
        { id: 1, name: "Vakant", color: "#D4537E", version: 1 },
        { id: 2, name: "Schröder Halle", color: "#5C3317", version: 1 },
        { id: 7, name: "Tour 1", color: "#999999", version: 4 },
        { id: 8, name: "Tour 2", color: "#00ACB1", version: 1 },
        { id: 9, name: "Tour 3", color: "#00CFD5", version: 1 },
        { id: 10, name: "Tour 4", color: "#5B4B8A", version: 1 },
      ])
      .mockResolvedValue([
        { id: 1, name: "Vakant", color: "#D4537E", version: 1 },
        { id: 2, name: "Schröder Halle", color: "#5C3317", version: 1 },
        { id: 7, name: "Tour 1", color: "#006B6F", version: 5 },
        { id: 8, name: "Tour 2", color: "#00ACB1", version: 1 },
        { id: 9, name: "Tour 3", color: "#00CFD5", version: 1 },
        { id: 10, name: "Tour 4", color: "#5B4B8A", version: 1 },
      ]);

    const result = await applySystemSeed();

    expect(updateTourWithVersionMock).toHaveBeenCalledWith(7, 4, "Tour 1", "#006B6F");
    expect(result.logLines).toContain("Tour aktualisiert: Tour 1");
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

  it("ueberschreibt bestehende Notizvorlagen-Bodies beim Update nicht", async () => {
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

  it("arbeitet in fester Reihenfolge: Tags, Touren, Notizvorlagen", async () => {
    const order: string[] = [];

    ensureTagDefinitionMock.mockImplementation(async (input: { name: string; color: string; isDefault: boolean }) => {
      order.push(`tag:${input.name}`);
      return { id: 1, version: 1, ...input };
    });
    createTourMock.mockImplementation(async (name: string, color: string) => {
      order.push(`tour:${name}`);
      return { id: 1, name, color, version: 1 };
    });
    createNoteTemplateMock.mockImplementation(async (input: { title: string }) => {
      order.push(`template:${input.title}`);
      return { id: 1, title: input.title, body: "", cardColor: "#000000", print: true, sortOrder: 0, isActive: true, version: 1 };
    });

    await applySystemSeed();

    const firstTourIndex = order.findIndex((entry) => entry.startsWith("tour:"));
    const firstTemplateIndex = order.findIndex((entry) => entry.startsWith("template:"));
    const lastTagIndex = order.map((entry, index) => ({ entry, index }))
      .filter((item) => item.entry.startsWith("tag:"))
      .at(-1)?.index ?? -1;

    expect(lastTagIndex).toBeGreaterThanOrEqual(0);
    expect(firstTourIndex).toBeGreaterThan(lastTagIndex);
    expect(firstTemplateIndex).toBeGreaterThan(firstTourIndex);
  });
});
