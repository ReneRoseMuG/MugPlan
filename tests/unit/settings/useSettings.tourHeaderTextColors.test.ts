/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Ein gueltiges Plain-Objekt wird unveraendert zurueckgegeben.
 * - undefined, null, Array und primitiver Wert fallen auf leeres Objekt zurueck.
 *
 * Fehlerfaelle:
 * - Ungueltige Eingaben erzeugen eine unerwartete Map oder keinen Fallback.
 *
 * Ziel:
 * Sichere Fallback-Logik des resolveTourHeaderTextColors-Resolvers absichern.
 */

import { describe, expect, it } from "vitest";
import { resolveTourHeaderTextColors } from "../../../client/src/hooks/useSettings";

describe("useSettings resolveTourHeaderTextColors", () => {
  it("returns a valid plain object unchanged", () => {
    const input = { "7": "#ff0000", "42": "#00ff00" };
    expect(resolveTourHeaderTextColors(input)).toBe(input);
  });

  it("returns an empty object for an empty plain object", () => {
    expect(resolveTourHeaderTextColors({})).toEqual({});
  });

  it("falls back to empty object for undefined", () => {
    expect(resolveTourHeaderTextColors(undefined)).toEqual({});
  });

  it("falls back to empty object for null", () => {
    expect(resolveTourHeaderTextColors(null)).toEqual({});
  });

  it("falls back to empty object for an array", () => {
    expect(resolveTourHeaderTextColors(["#ff0000"])).toEqual({});
  });

  it("falls back to empty object for a primitive", () => {
    expect(resolveTourHeaderTextColors(42)).toEqual({});
    expect(resolveTourHeaderTextColors("string")).toEqual({});
  });
});
