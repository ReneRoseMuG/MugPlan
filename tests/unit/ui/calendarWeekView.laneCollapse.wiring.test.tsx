/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Lane-Kollaps
 * Use Case: UC FT03 - UI-Verdrahtung fuer persistierten Lane-Modus
 *
 * Abgedeckte Regeln:
 * - Wochenansicht liest die FT03-Settings fuer collapsed mode und expanded lane id.
 * - Globaler Toggle persistiert ueber setSetting im USER-Scope.
 * - Lane-Header-Klick persistiert expandedLaneId nur im kollabierten Modus.
 * - Kollabierter Modus korrigiert ungueltige Lane-ID per sofortiger Persistenz.
 *
 * Fehlerfaelle:
 * - Fehlende Persistenzaufrufe fuer Toggle/Header.
 * - Keine Korrekturpersistenz bei invalidem expandedLaneId.
 *
 * Ziel:
 * Absicherung der FT03-Verdrahtung in CalendarWeekView ohne Verhaltensdrift.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT03 UI: CalendarWeekView lane collapse wiring", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekView.tsx"), "utf8");

  it("uses FT03 settings keys for collapsed mode and expanded lane", () => {
    expect(source).toContain('useSetting("calendar.weekLanes.isCollapsed")');
    expect(source).toContain('useSetting("calendar.weekLanes.expandedLaneId")');
  });

  it("wires global toggle button and persists USER setting", () => {
    expect(source).toContain('data-testid="button-week-lanes-collapse-toggle"');
    expect(source).toContain('key: "calendar.weekLanes.isCollapsed"');
    expect(source).toContain('scopeType: "USER"');
  });

  it("persists expanded lane on lane header click in collapsed mode", () => {
    expect(source).toContain("if (!isCollapsedMode) return;");
    expect(source).toContain('key: "calendar.weekLanes.expandedLaneId"');
  });

  it("contains correction persistence for invalid collapsed expandedLaneId", () => {
    expect(source).toContain("collapsedLaneSelection.requiresCorrection");
    expect(source).toContain("failed to persist lane correction");
  });
});
