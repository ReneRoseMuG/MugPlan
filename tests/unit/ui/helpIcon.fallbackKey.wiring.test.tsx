/**
 * Test Scope:
 *
 * Feature: FT16 - Hilfetexte in Sidebar-Panels
 * Use Case: UC HelpIcon Sichtbarkeit nur bei vorhandenem Inhalt
 *
 * Abgedeckte Regeln:
 * - HelpIcon rendert nur bei vorhandenem body-Inhalt.
 * - Loading/Error/fehlender Inhalt blenden das Icon aus.
 *
 * Fehlerfaelle:
 * - HelpIcon bleibt trotz fehlendem Text sichtbar.
 *
 * Ziel:
 * Sichtbarkeitsregel des HelpIcons auf echte Inhalte absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT16 help icon visibility wiring", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "client/src/components/ui/help/help-icon.tsx"),
    "utf8",
  );

  it("hides icon when loading, error, or missing content", () => {
    expect(source).toContain("if (isLoading || isError || !resolvedHelpText) {");
    expect(source).toContain("return null;");
  });

  it("requires non-empty body for icon visibility", () => {
    expect(source).toContain("const resolvedHelpText = helpText && helpText.body.trim().length > 0 ? helpText : null;");
  });
});
