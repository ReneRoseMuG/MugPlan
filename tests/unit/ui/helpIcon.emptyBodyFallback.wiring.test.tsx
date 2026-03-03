/**
 * Test Scope:
 *
 * Feature: FT28 - Hilfetext Auto-Seed
 * Use Case: UC HelpIcon mit leerem Hilfetext-Inhalt
 *
 * Abgedeckte Regeln:
 * - HelpIcon behandelt leeren body als "kein Inhalt".
 * - Empty-Body blendet das Icon aus.
 *
 * Fehlerfaelle:
 * - Leerer body wird als gueltiger Inhalt gewertet.
 *
 * Ziel:
 * Sicherstellen, dass leere Seed-Eintraege das HelpIcon nicht anzeigen.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT28 help icon empty-body fallback wiring", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "client/src/components/ui/help/help-icon.tsx"),
    "utf8",
  );

  it("treats empty body as missing content", () => {
    expect(source).toContain("const resolvedHelpText = helpText && helpText.body.trim().length > 0 ? helpText : null;");
    expect(source).toContain("if (isLoading || isError || !resolvedHelpText)");
  });

  it("renders help body only for non-empty content", () => {
    expect(source).toContain("dangerouslySetInnerHTML={{ __html: resolvedHelpText.body }}");
  });
});
