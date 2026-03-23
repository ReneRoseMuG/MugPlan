/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Regulär nummerierte Touren werden im Kalender vor frei benannten Touren sortiert.
 * - Frei benannte Touren folgen alphabetisch nach den nummerierten Touren.
 * - Leere Tournamen und damit die Lane "Ohne Tour" bleiben immer am Ende.
 *
 * Fehlerfälle:
 * - Umbenannte Touren rutschen zwischen nummerierte Tour-Lanes.
 * - Die Lane "Ohne Tour" wird vor regulären oder frei benannten Touren einsortiert.
 *
 * Ziel:
 * Die Kalender-Sortierung für Tour-Lanes und tourbasierte Terminvergleiche nach beobachtbarer Reihenfolge absichern.
 */
import { describe, expect, it } from "vitest";
import { compareTourNamesForCalendar } from "../../../client/src/lib/calendar-utils";

describe("FT04 calendar tour ordering", () => {
  it("sorts numeric tours before renamed tours and keeps unassigned last", () => {
    const orderedTourNames = ["Tour 2", "Tour A", "Tour 10", "", "Tour 1", "Nordtour"]
      .sort(compareTourNamesForCalendar);

    expect(orderedTourNames).toEqual(["Tour 1", "Tour 2", "Tour 10", "Nordtour", "Tour A", ""]);
  });

  it("treats null or blank names as unassigned and keeps them after renamed tours", () => {
    const orderedTourNames = ["West", null, " ", "Tour 3"]
      .sort(compareTourNamesForCalendar);

    expect(orderedTourNames).toEqual(["Tour 3", "West", null, " "]);
  });
});
