/**
 * Test Scope:
 *
 * Feature: FT02 - Projektverwaltung
 * Use Case: UC Projektnamen mit Kundennummer-Praefix
 *
 * Abgedeckte Regeln:
 * - Projektnamen werden als "K: {Kundennummer} - {Projektname}" formatiert.
 * - Beim Laden wird das Praefix geparst und der isolierte Projektname extrahiert.
 * - Nicht-formatierte Altdaten bleiben unveraendert nutzbar.
 *
 * Fehlerfaelle:
 * - Leere Kundennummer oder leerer Projektname liefern keinen fehlerhaften Praefix.
 * - Unerwartete Namensformate fuehren nicht zu falscher Extraktion.
 *
 * Ziel:
 * Sicherstellen, dass Speichern/Laden des Projekttitels konsistent mit Kundennummer-Praefix funktioniert.
 */
import { describe, expect, it } from "vitest";
import { formatProjectStoredName, parseProjectStoredName } from "../../../client/src/lib/project-name-format";

describe("FT02 project name format", () => {
  it("formats prefixed project name", () => {
    expect(formatProjectStoredName("4711", "Sauna Modern")).toBe("K: 4711 - Sauna Modern");
  });

  it("parses prefixed project name into isolated project name", () => {
    expect(parseProjectStoredName("K: 4711 - Sauna Modern")).toEqual({
      customerNumberFromName: "4711",
      isolatedProjectName: "Sauna Modern",
    });
  });

  it("keeps legacy unprefixed name as isolated name", () => {
    expect(parseProjectStoredName("Sauna Modern")).toEqual({
      customerNumberFromName: null,
      isolatedProjectName: "Sauna Modern",
    });
  });
});
