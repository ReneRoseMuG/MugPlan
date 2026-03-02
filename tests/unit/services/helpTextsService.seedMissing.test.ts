/**
 * Test Scope:
 *
 * Feature: FT28 - Hilfetext Auto-Seed
 * Use Case: UC Fehlende Hilfetexte aus Frontend-HelpKeys erzeugen
 *
 * Abgedeckte Regeln:
 * - Seed legt nur fehlende Keys als leere Hilfetexte an.
 * - Bestehende Keys werden ohne Aenderung uebersprungen.
 * - duplicateKeys/warnings aus dem Scanner werden unveraendert zurueckgegeben.
 *
 * Fehlerfaelle:
 * - Seed erzeugt Duplikate trotz bestehender Datensaetze.
 *
 * Ziel:
 * Idempotenten Seed-Flow fuer HelpKeys serverseitig absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getHelpTextsMock,
  createHelpTextMock,
  scanFrontendHelpKeysMock,
} = vi.hoisted(() => ({
  getHelpTextsMock: vi.fn(),
  createHelpTextMock: vi.fn(),
  scanFrontendHelpKeysMock: vi.fn(),
}));

vi.mock("../../../server/repositories/helpTextsRepository", () => ({
  getHelpTexts: getHelpTextsMock,
  createHelpText: createHelpTextMock,
}));

vi.mock("../../../server/services/helpTextFrontendKeyScanService", () => ({
  scanFrontendHelpKeys: scanFrontendHelpKeysMock,
}));

import { seedMissingHelpTextsFromFrontend } from "../../../server/services/helpTextsService";

describe("FT28 help texts service seed missing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates only missing keys and skips existing keys", async () => {
    scanFrontendHelpKeysMock.mockReturnValue({
      scannedKeys: ["alpha", "beta"],
      duplicateKeys: [{ key: "beta", occurrences: 2 }],
      warnings: ["Duplicate helpKey usages detected: beta (2)"],
    });
    getHelpTextsMock.mockResolvedValueOnce([
      {
        id: 1,
        helpKey: "alpha",
        title: "alpha",
        body: "existing",
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await seedMissingHelpTextsFromFrontend();

    expect(createHelpTextMock).toHaveBeenCalledTimes(1);
    expect(createHelpTextMock).toHaveBeenCalledWith({
      helpKey: "beta",
      title: "beta",
      body: "",
    });
    expect(result.createdKeys).toEqual(["beta"]);
    expect(result.skippedExistingKeys).toEqual(["alpha"]);
    expect(result.duplicateKeys).toEqual([{ key: "beta", occurrences: 2 }]);
    expect(result.warnings).toEqual(["Duplicate helpKey usages detected: beta (2)"]);
  });

  it("is effectively idempotent when all keys already exist", async () => {
    scanFrontendHelpKeysMock.mockReturnValue({
      scannedKeys: ["alpha"],
      duplicateKeys: [],
      warnings: [],
    });
    getHelpTextsMock.mockResolvedValueOnce([
      {
        id: 2,
        helpKey: "alpha",
        title: "alpha",
        body: "",
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await seedMissingHelpTextsFromFrontend();

    expect(createHelpTextMock).not.toHaveBeenCalled();
    expect(result.createdKeys).toEqual([]);
    expect(result.skippedExistingKeys).toEqual(["alpha"]);
  });

  it("returns warnings when scanner yields no keys", async () => {
    scanFrontendHelpKeysMock.mockReturnValue({
      scannedKeys: [],
      duplicateKeys: [],
      warnings: ["Frontend root not found"],
    });

    const result = await seedMissingHelpTextsFromFrontend();

    expect(getHelpTextsMock).not.toHaveBeenCalled();
    expect(createHelpTextMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      scannedKeys: [],
      createdKeys: [],
      skippedExistingKeys: [],
      duplicateKeys: [],
      warnings: ["Frontend root not found"],
    });
  });
});
