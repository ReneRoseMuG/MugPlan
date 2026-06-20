/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Registry-Eintrag fuer die Tour-Kopfzeilen-Textfarben ist mit stabilem Schluessel,
 *   USER-Scope, leerem Objekt als Default und gueltiger Validierungsfunktion definiert.
 * - Nur valide Maps (Tour-ID als Ziffernstring auf Hex-Farbcode) bestehen die Validierung.
 * - Ungueltiges Format (nicht-Ziffern-Schluessel, ungueltige Hex-Codes, nicht-Objekte) wird abgelehnt.
 *
 * Fehlerfaelle:
 * - Fehlender oder falsch benannter Registry-Schluessel.
 * - Scope nicht USER oder GLOBAL statt USER.
 * - Validierung akzeptiert ungueltige Hex-Codes oder nicht-Ziffernschluessel.
 *
 * Ziel:
 * Regressionssicherer Nachweis, dass der neue Registry-Eintrag korrekt konfiguriert ist.
 */

import { describe, expect, it } from "vitest";
import { userSettingsRegistry } from "../../../server/settings/registry";

describe("settings registry: tourHeaderTextColors", () => {
  const entry = userSettingsRegistry.tourHeaderTextColors;

  it("defines the correct key and USER scope", () => {
    expect(entry.key).toBe("calendar.tourHeaderTextColors");
    expect(entry.allowedScopes).toEqual(["USER"]);
    expect(entry.type).toBe("json");
    expect(entry.defaultValue).toEqual({});
  });

  it("accepts a valid map of tourId to hex color", () => {
    expect(entry.validate({ "7": "#ff0000" })).toBe(true);
    expect(entry.validate({ "1": "#000000", "42": "#ffffff" })).toBe(true);
    expect(entry.validate({})).toBe(true);
  });

  it("rejects non-digit keys", () => {
    expect(entry.validate({ "abc": "#ff0000" })).toBe(false);
    expect(entry.validate({ "1a": "#ff0000" })).toBe(false);
  });

  it("rejects invalid hex color values", () => {
    expect(entry.validate({ "7": "red" })).toBe(false);
    expect(entry.validate({ "7": "#xyz123" })).toBe(false);
    expect(entry.validate({ "7": "#fff" })).toBe(false);
    expect(entry.validate({ "7": "ff0000" })).toBe(false);
  });

  it("rejects non-object values", () => {
    expect(entry.validate(null)).toBe(false);
    expect(entry.validate([])).toBe(false);
    expect(entry.validate("string")).toBe(false);
    expect(entry.validate(42)).toBe(false);
    expect(entry.validate(undefined)).toBe(false);
  });
});
