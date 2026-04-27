/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - DB-Canaries fuer Listen-/Filter-Verwechslung erzeugen aehnliche Projekte und Termine.
 * - Seed-Schatten-Canaries erzeugen seed-nahe Tags, Touren und Notizvorlagen.
 * - Wochenplan-Canaries erzeugen konkurrierende Tour- und Mitarbeiterkontexte.
 *
 * Fehlerfaelle:
 * - Canary-Profile schreiben keine echten Stoerdaten in die Test-DB.
 * - Seed-Schatten bleiben zu weit vom realen Seed entfernt.
 *
 * Ziel:
 * Die DB-Canary-Helfer fuer den Test-Isolationsumbau gegen die echte Test-DB absichern.
 */
import { describe, expect, it } from "vitest";

import { injectDatabaseCanaries } from "../../helpers/testIsolationCanaries";

describe("test isolation canaries integration", () => {
  it("creates project-list confusion canaries with similar project labels", async () => {
    const result = await injectDatabaseCanaries("project-list-confusion", "pilot-a");

    expect(result.profile).toBe("project-list-confusion");
    expect(result.created.filter((entry) => entry.entity === "project")).toHaveLength(2);
    expect(result.created.some((entry) => entry.label.includes("Alpha Altbestand"))).toBe(true);
    expect(result.created.filter((entry) => entry.entity === "appointment")).toHaveLength(2);
  });

  it("creates week-plan confusion canaries with competing tours and employees", async () => {
    const result = await injectDatabaseCanaries("week-plan-confusion", "pilot-b");

    expect(result.profile).toBe("week-plan-confusion");
    expect(result.created.filter((entry) => entry.entity === "employee")).toHaveLength(2);
    expect(result.created.filter((entry) => entry.entity === "tour")).toHaveLength(2);
    expect(result.created.filter((entry) => entry.entity === "appointment")).toHaveLength(2);
  });

  it("creates seed-shadow canaries with seed-near labels", async () => {
    const result = await injectDatabaseCanaries("seed-shadow", "pilot-c");

    expect(result.profile).toBe("seed-shadow");
    expect(result.created).toEqual(expect.arrayContaining([
      expect.objectContaining({ entity: "tag", label: expect.stringContaining("Geparkt") }),
      expect.objectContaining({ entity: "tour", label: expect.stringContaining("Parkplatz") }),
      expect.objectContaining({ entity: "noteTemplate", label: expect.stringContaining("Reklamation") }),
    ]));
  });
});
