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

  it("blocks create action for READER/Monteur in UI (NOT_IMPLEMENTED_BY_SCOPE)", () => {
    const hasRoleGateForCreate = source.includes("effectiveUserRole === \"ADMIN\" || effectiveUserRole === \"DISPATCHER\"");
    const alwaysRendersCreateButton = source.includes("data-testid=\"button-new-tour\"");
    if (!hasRoleGateForCreate && alwaysRendersCreateButton) {
      throw new Error(
        "NOT_IMPLEMENTED_BY_SCOPE | UC 04/05 Tourliste anzeigen | Fehlendes Verhalten: 'Neue Tour' darf fuer READER/Monteur nicht gerendert werden | Betroffene Produktion: client/src/components/TourManagement.tsx",
      );
    }
  });
});
