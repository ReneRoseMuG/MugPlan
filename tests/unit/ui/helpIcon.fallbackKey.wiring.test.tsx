/**
 * Test Scope:
 *
 * Feature: FT16 - Hilfetexte in Sidebar-Panels
 * Use Case: UC Fehlender oder geloeschter Hilfetext
 *
 * Abgedeckte Regeln:
 * - HelpIcon zeigt im Null-Fallback explizit den helpKey.
 * - Null-Fallback behaelt die generische "Kein Hilfetext"-Hinweismeldung bei.
 * - Key-Ausgabe ist ueber eigenen Test-Selector adressierbar.
 *
 * Fehlerfaelle:
 * - Bei fehlendem Hilfetext ist nur eine generische Meldung sichtbar.
 * - Der helpKey ist nach Loeschung nicht wieder sichtbar.
 *
 * Ziel:
 * Sicherstellen, dass der helpKey im Fallback immer eindeutig sichtbar bleibt.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT16 help icon fallback key wiring", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "client/src/components/ui/help/help-icon.tsx"),
    "utf8",
  );

  it("shows the key in fallback state with dedicated test id", () => {
    expect(source).toContain("data-testid={`text-help-key-${helpKey}`}");
    expect(source).toContain("Key: {helpKey}");
  });

  it("keeps the missing help text message in fallback state", () => {
    expect(source).toContain("Kein Hilfetext fuer \"{helpKey}\" verfuegbar.");
  });
});

