/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Lane-Kollaps
 * Use Case: UC FT03 - Deterministische Lane-Sichtbarkeit aus User-Preferences
 *
 * Abgedeckte Regeln:
 * - Expanded-Modus laesst alle Lanes offen und ignoriert expandedLaneId.
 * - Collapsed-Modus erzwingt genau eine expandierte Lane.
 * - Bei fehlender/ungueltiger Lane-ID wird deterministisch auf die oberste Lane gefallbackt.
 * - Beim Wechsel collapsed -> expanded bleibt die gespeicherte Lane-ID unveraendert verwendbar.
 *
 * Fehlerfaelle:
 * - Keine Lanes vorhanden.
 * - Persistierte Lane-ID existiert nicht mehr.
 *
 * Ziel:
 * Fachliche Kernregeln fuer FT03 als pure Zustandslogik ohne UI-Nebenwirkungen absichern.
 */
import { describe, expect, it } from "vitest";
import {
  isLaneCollapsed,
  normalizeExpandedLaneId,
  resolveCollapsedLaneSelection,
} from "../../../client/src/components/calendar/weekLaneState";

describe("FT03 week lane state rules", () => {
  it("normalizes empty expandedLaneId to null", () => {
    expect(normalizeExpandedLaneId("")).toBeNull();
    expect(normalizeExpandedLaneId("   ")).toBeNull();
    expect(normalizeExpandedLaneId("tour-1")).toBe("tour-1");
  });

  it("expanded mode keeps all lanes open and ignores expandedLaneId", () => {
    expect(
      isLaneCollapsed({
        isCollapsedMode: false,
        laneKey: "tour-1",
        effectiveExpandedLaneId: "tour-2",
      }),
    ).toBe(false);
    expect(
      isLaneCollapsed({
        isCollapsedMode: false,
        laneKey: "tour-2",
        effectiveExpandedLaneId: null,
      }),
    ).toBe(false);
  });

  it("collapsed mode keeps exactly one lane open when lane id is valid", () => {
    const result = resolveCollapsedLaneSelection({
      laneKeys: ["tour-1", "tour-2", "tour-unassigned"],
      persistedExpandedLaneId: "tour-2",
    });

    expect(result).toEqual({
      effectiveExpandedLaneId: "tour-2",
      requiresCorrection: false,
    });

    expect(
      isLaneCollapsed({
        isCollapsedMode: true,
        laneKey: "tour-2",
        effectiveExpandedLaneId: result.effectiveExpandedLaneId,
      }),
    ).toBe(false);
    expect(
      isLaneCollapsed({
        isCollapsedMode: true,
        laneKey: "tour-1",
        effectiveExpandedLaneId: result.effectiveExpandedLaneId,
      }),
    ).toBe(true);
  });

  it("falls back to first lane and marks correction when lane id is invalid", () => {
    const result = resolveCollapsedLaneSelection({
      laneKeys: ["tour-1", "tour-2"],
      persistedExpandedLaneId: "tour-999",
    });

    expect(result).toEqual({
      effectiveExpandedLaneId: "tour-1",
      requiresCorrection: true,
    });
  });

  it("falls back to first lane and marks correction when lane id is empty", () => {
    const result = resolveCollapsedLaneSelection({
      laneKeys: ["tour-1", "tour-2"],
      persistedExpandedLaneId: null,
    });

    expect(result).toEqual({
      effectiveExpandedLaneId: "tour-1",
      requiresCorrection: true,
    });
  });

  it("returns stable empty state when no lanes exist", () => {
    const result = resolveCollapsedLaneSelection({
      laneKeys: [],
      persistedExpandedLaneId: "tour-1",
    });

    expect(result).toEqual({
      effectiveExpandedLaneId: null,
      requiresCorrection: false,
    });
  });
});
