/**
 * Test Scope:
 *
 * Feature: FT03 - Vorschau- und Kalenderverhalten
 * Use Case: UC03 - Weekly-Preview ohne internen Scroll
 *
 * Abgedeckte Regeln:
 * - Weekly-Appointment-Preview setzt maxHeight explizit auf null.
 * - Weekly-Appointment-Preview erzwingt sichtbaren Inhalt ohne Y-Scrollcontainer.
 * - InfoBadge leitet scrollY so weiter, dass nur bei "auto" ein Overflow-Container gesetzt wird.
 *
 * Fehlerfaelle:
 * - Weekly-Preview wird wieder in einem internen Scrollcontainer abgeschnitten.
 *
 * Ziel:
 * Sicherstellen, dass Weekly-Previews ohne internen Scroll gerendert werden koennen.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("FT03 weekly preview no-scroll options", () => {
  it("defines null maxHeight and visible scrollY for weekly preview options", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ui/badge-previews/appointment-weekly-panel-preview.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("maxHeight: null");
    expect(source).toContain('scrollY: "visible"');
  });

  it("applies overflow-y-auto only when scrollY is auto", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ui/info-badge.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain('className={previewOptions.scrollY === "auto" ? "overflow-y-auto" : undefined}');
  });
});
