/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Monatsansicht erkennt blockierte Tour-Slots ueber dieselbe ISO-Wochenlogik wie das Rendering.
 * - Nur exakt passende Tour/KW-Kombinationen gelten als blockiert.
 * - Unassigned-Slots und benachbarte Wochen bleiben unblockiert.
 *
 * Fehlerfaelle:
 * - Die Monats-Sperrflaeche greift fuer falsche Touren oder falsche Wochen.
 * - Blockierte Slots werden im Monatsblatt nicht ueber die gemeinsame Regel erkannt.
 *
 * Ziel:
 * Die zentrale Blockierungsregel der Monatsansicht als pure Funktion regressionssicher absichern.
 */
import { describe, expect, it } from "vitest";

import { isBlockedTourWeekSlot } from "../../../client/src/components/calendar/CalendarMonthSheetView";

describe("calendar month sheet blocked slot interaction", () => {
  it("detects a blocked slot for the matching tour and ISO week", () => {
    expect(isBlockedTourWeekSlot({
      tourId: 7,
      weekDate: new Date("2099-07-01T12:00:00Z"),
      blockedTourWeekKeys: new Set(["7-2099-27"]),
    })).toBe(true);
  });

  it("keeps adjacent weeks and different tours unblocked", () => {
    const blockedTourWeekKeys = new Set(["7-2099-27"]);

    expect(isBlockedTourWeekSlot({
      tourId: 8,
      weekDate: new Date("2099-07-01T12:00:00Z"),
      blockedTourWeekKeys,
    })).toBe(false);

    expect(isBlockedTourWeekSlot({
      tourId: 7,
      weekDate: new Date("2099-07-08T12:00:00Z"),
      blockedTourWeekKeys,
    })).toBe(false);
  });

  it("never marks unassigned slots as blocked", () => {
    expect(isBlockedTourWeekSlot({
      tourId: null,
      weekDate: new Date("2099-07-01T12:00:00Z"),
      blockedTourWeekKeys: new Set(["7-2099-27"]),
    })).toBe(false);
  });
});
