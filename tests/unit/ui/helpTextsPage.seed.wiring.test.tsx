/**
 * Test Scope:
 *
 * Feature: FT28 - Hilfetext Auto-Seed
 * Use Case: UC Hilfetexte-Ansicht initialisiert fehlende Keys beim Oeffnen
 *
 * Abgedeckte Regeln:
 * - HelpTextsPage ruft den Seed-Endpunkt beim Mount auf.
 * - Nach Seed wird die Hilfetext-Query invalidiert.
 * - Board-Karten zeigen den helpKey sichtbar an.
 *
 * Fehlerfaelle:
 * - Seed wird nicht ausgelost und fehlende Keys bleiben unsichtbar.
 *
 * Ziel:
 * Verdrahtung von Auto-Seed und Key-Sichtbarkeit in der Hilfetextverwaltung absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT28 help texts page seed wiring", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "client/src/components/HelpTextsPage.tsx"),
    "utf8",
  );

  it("calls seed endpoint and invalidates help-text list", () => {
    expect(source).toContain("apiRequest(\"POST\", \"/api/help-texts/seed-missing-from-frontend\")");
    expect(source).toContain("queryClient.invalidateQueries({ queryKey: [\"/api/help-texts\"] })");
  });

  it("renders help key on board cards", () => {
    expect(source).toContain("data-testid={`text-helptext-key-${helpText.id}`}");
    expect(source).toContain("Key: {helpText.helpKey}");
  });
});
