/**
 * Test Scope:
 *
 * Feature: FT03 – Vorschau- und Kalenderverhalten
 * Use Case: UC03 – Hover-Preview-Verzoegerung
 *
 * Abgedeckte Regeln:
 * - Globales Delay-Setting hat Prioritaet vor komponentenspezifischem Delay.
 * - Ohne globales Setting wird das Komponenten-Delay verwendet.
 * - Ohne beide Werte gilt der interne Default.
 *
 * Fehlerfälle:
 * - Ungueltige Werte sollen nicht zu negativen Delays fuehren.
 *
 * Ziel:
 * Korrekte Priorisierung und Fallbacks der Hover-Open-Delay-Logik absichern.
 */
import { describe, expect, it } from "vitest";
import { resolveOpenDelayMs } from "../../../client/src/components/ui/hover-preview";

describe("FT03 hover preview delay setting", () => {
  it("prefers global setting over component openDelay", () => {
    expect(resolveOpenDelayMs({ globalOpenDelayMs: 900, openDelay: 200 })).toBe(900);
  });

  it("uses component openDelay when global setting is missing", () => {
    expect(resolveOpenDelayMs({ globalOpenDelayMs: undefined, openDelay: 275 })).toBe(275);
  });

  it("falls back to default when both values are missing", () => {
    expect(resolveOpenDelayMs({ globalOpenDelayMs: undefined, openDelay: undefined })).toBe(150);
  });

  it("normalizes negative values to zero", () => {
    expect(resolveOpenDelayMs({ globalOpenDelayMs: -10, openDelay: 120 })).toBe(0);
    expect(resolveOpenDelayMs({ globalOpenDelayMs: undefined, openDelay: -20 })).toBe(0);
  });
});
