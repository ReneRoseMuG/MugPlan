/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - ISO-KW-Freitext wird auf Ziffern reduziert.
 * - Nur ganze Kalenderwochen 1 bis 53 gelten als gültig.
 * - Spinner-Schritte klemmen komfortabel auf den gültigen KW-Bereich.
 *
 * Fehlerfälle:
 * - KW 0, negative Werte, Leerwerte und Nicht-Ziffern werden als ungültig behandelt.
 * - Stepper verlassen den Bereich 1 bis 53.
 *
 * Ziel:
 * Die gemeinsame Frontend-Guard-Logik für ISO-KW-Eingaben isoliert und deterministisch absichern.
 */
import { describe, expect, it } from "vitest";

import {
  normalizeIsoWeekNumber,
  parseIsoWeekInput,
  parseIsoWeekNumber,
  sanitizeIsoWeekInput,
  stepIsoWeekValue,
} from "../../../client/src/lib/isoWeekInput";

describe("isoWeekInput helpers", () => {
  it("sanitizes free text down to numeric iso week input", () => {
    expect(sanitizeIsoWeekInput("KW 014")).toBe("014");
    expect(sanitizeIsoWeekInput(" 5a4b ")).toBe("54");
    expect(sanitizeIsoWeekInput("1234")).toBe("123");
  });

  it("normalizes numeric iso week values without inventing week zero", () => {
    expect(normalizeIsoWeekNumber(undefined)).toBeUndefined();
    expect(normalizeIsoWeekNumber(Number.NaN)).toBeUndefined();
    expect(normalizeIsoWeekNumber(0)).toBeUndefined();
    expect(normalizeIsoWeekNumber(-1)).toBeUndefined();
    expect(normalizeIsoWeekNumber(14)).toBe(14);
    expect(normalizeIsoWeekNumber(54)).toBe(53);
  });

  it("parses only strict numeric iso week values", () => {
    expect(parseIsoWeekNumber(undefined)).toBeUndefined();
    expect(parseIsoWeekNumber(0)).toBeUndefined();
    expect(parseIsoWeekNumber(54)).toBeUndefined();
    expect(parseIsoWeekNumber(53)).toBe(53);
  });

  it("parses only valid iso week input strings", () => {
    expect(parseIsoWeekInput("")).toBeUndefined();
    expect(parseIsoWeekInput("0")).toBeUndefined();
    expect(parseIsoWeekInput("000")).toBeUndefined();
    expect(parseIsoWeekInput("KW 15")).toBe(15);
    expect(parseIsoWeekInput("054")).toBeUndefined();
  });

  it("steps iso week values within the bounded range", () => {
    expect(stepIsoWeekValue(undefined, 1)).toBe(2);
    expect(stepIsoWeekValue("0", 1)).toBe(2);
    expect(stepIsoWeekValue(1, -1)).toBe(1);
    expect(stepIsoWeekValue("53", 1)).toBe(53);
    expect(stepIsoWeekValue("14", -1)).toBe(13);
  });
});
