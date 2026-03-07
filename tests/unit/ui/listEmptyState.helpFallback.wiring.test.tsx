/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - ListEmptyState nutzt nur Hilfetexte mit nicht-leerem Body fuer dekorierte Empty-States.
 * - Fehlende oder leere Hilfetexte rendern nur den Fallback ohne technische helpKey-Anzeige.
 *
 * Fehlerfaelle:
 * - Leere Hilfetexte unterdruecken den Fallback.
 * - Der Fallback blendet erneut interne helpKey-Details ein.
 *
 * Ziel:
 * Die Fallback-Regel fuer konfigurierbare Empty-States am gemeinsamen UI-Baustein absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT16/FT28 list empty state help fallback wiring", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "client/src/components/ui/list-empty-state.tsx"),
    "utf8",
  );

  it("requires a non-empty help body before rendering configured content", () => {
    expect(source).toContain("const hasRenderableHelpText = Boolean(helpText && typeof helpText.body === \"string\" && helpText.body.trim().length > 0);");
  });

  it("does not expose the internal helpKey in fallback mode", () => {
    expect(source).not.toContain("text-empty-helpkey-");
    expect(source).not.toContain("helpKey: <span className=\"font-mono\">{helpKey}</span>");
  });
});
