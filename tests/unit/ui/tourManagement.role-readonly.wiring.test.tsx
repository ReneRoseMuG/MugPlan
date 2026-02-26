/**
 * Test Scope:
 *
 * Feature: FT04 - Tourenplanung
 * Use Case: UC 04/05 Tourliste anzeigen (rollenabhaengiger Lesemodus)
 *
 * Abgedeckte Regeln:
 * - READER/Monteur darf keine Tour-Mutationsaktionen sehen.
 * - Der Neue-Tour-Button muss fuer Lesemodus ausgeblendet sein.
 *
 * Fehlerfaelle:
 * - Mutationsaktionen bleiben fuer Lesemodus sichtbar.
 *
 * Ziel:
 * Sollvorgabe der rollenabhaengigen Readonly-UI explizit absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT04 UI: TourManagement role readonly wiring (UC 04/05)", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/TourManagement.tsx");
  const source = readFileSync(filePath, "utf8");

  it("blocks create action for READER/Monteur in UI", () => {
    expect(source).toContain('const canMutateTours = effectiveUserRole === "ADMIN" || effectiveUserRole === "DISPATCHER"');
    expect(source).toContain("{canMutateTours ? (");
    expect(source).toContain('data-testid="button-new-tour"');
  });
});
