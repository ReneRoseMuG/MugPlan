/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Termin-Karten
 * Use Case: UC FT03 - Fortsetzungssegment mit fixer Schraffurhoehe
 *
 * Abgedeckte Regeln:
 * - Continuation-Segmente nutzen eine explizite Hoehe statt layoutbestimmtem Hidden-Content.
 * - Der Hoehenwert nutzt continuationHeightPx mit Fallback auf DEFAULT_CONTINUATION_HEIGHT_PX.
 * - Start-Segmente rendern weiterhin den vollstaendigen Inhaltsblock.
 *
 * Fehlerfaelle:
 * - Unsichtbarer Content (`opacity-0`) bestimmt wieder indirekt die Segmenthoehe.
 * - Continuation-Segmente ohne explizite Hoehenvorgabe.
 *
 * Ziel:
 * Verdrahtung der hoehenstabilen Fortsetzungsdarstellung im Wochenkarten-Panel regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT03 UI: CalendarWeekAppointmentPanel continuation height wiring", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentPanel.tsx"), "utf8");

  it("defines continuation height fallback constant and prop", () => {
    expect(source).toContain("export const DEFAULT_CONTINUATION_HEIGHT_PX = 180;");
    expect(source).toContain("continuationHeightPx?: number | null;");
    expect(source).toContain("const resolvedContinuationHeightPx = continuationHeightPx ?? DEFAULT_CONTINUATION_HEIGHT_PX;");
  });

  it("applies explicit height style for continuation segments", () => {
    expect(source).toContain("style={isContinuation ? { height: `${resolvedContinuationHeightPx}px` } : undefined}");
  });

  it("removes hidden-content layout hack for continuation segments", () => {
    expect(source).toContain("{!isContinuation && (");
    expect(source).not.toContain("opacity-0 select-none");
  });
});
