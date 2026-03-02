/**
 * Test Scope:
 *
 * Feature: FT28 - Hilfetext Auto-Seed
 * Use Case: UC HelpIcon mit leerem Hilfetext-Inhalt
 *
 * Abgedeckte Regeln:
 * - HelpIcon behandelt leeren body wie fehlenden Hilfetext.
 * - Empty-Body faellt in denselben Fallback wie null.
 *
 * Fehlerfaelle:
 * - Leerer body wird als gueltiger Inhalt dargestellt und verschleiert fehlende Texte.
 *
 * Ziel:
 * Sicherstellen, dass leere Seed-Eintraege im UI als fehlender Hilfetext kenntlich bleiben.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT28 help icon empty-body fallback wiring", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "client/src/components/ui/help/help-icon.tsx"),
    "utf8",
  );

  it("treats empty body as fallback condition", () => {
    expect(source).toContain("const hasEmptyBody = Boolean(helpText && helpText.body.trim().length === 0);");
    expect(source).toContain("helpText && !hasEmptyBody");
  });

  it("keeps fallback message path active", () => {
    expect(source).toContain("Kein Hilfetext fuer \"{helpKey}\" verfuegbar.");
  });
});
