/**
 * Test Scope:
 *
 * Feature: FT-UI - Einheitlicher Plus-Action-Button
 * Use Case: UC Reine Plus-Buttons im UI konsistent darstellen
 *
 * Abgedeckte Regeln:
 * - PlusActionButton nutzt ghost-Variante ohne sichtbaren Rand.
 * - PlusActionButton nutzt feste kompakte Groesse (h-7 w-7).
 * - Plus-Icon ist einheitlich klein (w-3 h-3).
 * - Interaktionsrelevante Props (onClick, disabled, aria-label, data-testid) werden durchgereicht.
 *
 * Fehlerfaelle:
 * - Abweichende Plus-Groessen/Varianten je Einsatzort.
 * - Fehlende Prop-Durchleitung fuer Interaktionen und Tests.
 *
 * Ziel:
 * Den zentralen UI-Standard fuer alle icon-only Plus-Aktionen absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT-UI plus action button component", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/ui/plus-action-button.tsx");
  const source = readFileSync(filePath, "utf8");

  it("uses ghost variant with compact fixed size", () => {
    expect(source).toContain("variant=\"ghost\"");
    expect(source).toContain("cn(\"h-7 w-7\", className)");
  });

  it("renders a normalized plus icon", () => {
    expect(source).toContain("<Plus className=\"w-3 h-3\" />");
  });

  it("forwards interactive props to Button", () => {
    expect(source).toContain("onClick={onClick}");
    expect(source).toContain("disabled={disabled}");
    expect(source).toContain("{...props}");
  });
});
