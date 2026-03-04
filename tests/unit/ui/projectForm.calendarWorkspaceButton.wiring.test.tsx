/**
 * Test Scope:
 *
 * Feature: FT29 - Projektkontext Einstieg in CalendarWorkspace
 * Use Case: UC Kalender oeffnen aus bestehendem Projekt
 *
 * Abgedeckte Regeln:
 * - ProjectForm bietet einen dedizierten Callback `onOpenCalendarWorkspace`.
 * - Der Button wird nur im Edit-Modus mit gueltiger projectId gerendert.
 * - Der Callback erhaelt die numerische Projekt-ID.
 *
 * Fehlerfaelle:
 * - Kein Kontext-Einstieg aus dem Projektformular moeglich.
 * - Kontext wird ohne Projekt-ID geoeffnet.
 *
 * Ziel:
 * Kontextsicheren Einstiegspunkt aus dem Projektformular absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT29 project form calendar workspace button wiring", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/components/ProjectForm.tsx"), "utf8");

  it("exposes callback prop for contextual calendar open", () => {
    expect(source).toContain("onOpenCalendarWorkspace?: (ctx: { projectId: number }) => void;");
  });

  it("renders open-calendar button only in edit mode with project id", () => {
    expect(source).toContain("isEditing && projectId && onOpenCalendarWorkspace");
    expect(source).toContain("data-testid=\"button-open-calendar-workspace\"");
  });

  it("passes numeric project id to the callback", () => {
    expect(source).toContain("onOpenCalendarWorkspace({ projectId })");
  });
});
