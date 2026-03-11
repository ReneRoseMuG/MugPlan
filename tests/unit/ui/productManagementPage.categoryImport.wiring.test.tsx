/**
 * Test Scope:
 *
 * Feature: FT27 - Kategorienimport im Produkt-Stammdatenbereich
 *
 * Abgedeckte Regeln:
 * - Produkt- und Komponentenkategorien bieten je Zeile einen Import-Trigger.
 * - Delete-Aktionen sind im Kategorienraster auf ein "-" verkuerzt.
 * - Verdeckte Datei-Inputs fuer beide Importpfade sind in ProductManagementPage verdrahtet.
 *
 * Fehlerfaelle:
 * - Import-Button fehlt in einer der beiden Kategorienlisten.
 * - Delete-Label bleibt auf dem alten Text.
 *
 * Ziel:
 * Die UI-Verdrahtung der neuen CSV-Importaktion im FT27-Kategorienbereich regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT27 UI: category import wiring in product management", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/components/ProductManagementPage.tsx"), "utf8");

  it("wires hidden file inputs and per-row import buttons for both category lists", () => {
    expect(source).toContain('data-testid="input-product-category-import-file"');
    expect(source).toContain('data-testid="input-component-category-import-file"');
    expect(source).toContain("Daten importieren");
    expect(source).toContain("button-product-category-import-");
    expect(source).toContain("button-component-category-import-");
  });

  it("uses the shortened delete label", () => {
    expect(source).toMatch(/>\s*-\s*<\/Button>/);
  });
});
