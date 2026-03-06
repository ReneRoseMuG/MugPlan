/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - ListEmptyState nutzt nur Hilfetexte mit nicht-leerem Body fuer dekorierte Empty-States.
 * - Fehlende oder leere Hilfetexte rendern den Fallback samt sichtbarem helpKey.
 *
 * Fehlerfaelle:
 * - Leere Hilfetexte unterdruecken den Fallback.
 * - Der erwartete helpKey ist im Fallback nicht sichtbar.
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

  it("renders the expected helpKey in fallback mode", () => {
    expect(source).toContain("data-testid={`text-empty-helpkey-${helpKey}`}");
    expect(source).toContain("helpKey: <span className=\"font-mono\">{helpKey}</span>");
  });
});
