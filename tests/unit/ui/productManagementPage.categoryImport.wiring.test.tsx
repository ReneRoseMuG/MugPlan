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
    expect(source).toContain(">Import</Button>");
    expect(source).toContain('title === "Produktkategorien" ? "button-product-category-import" : "button-component-category-import"');
    expect(source).toContain('data-testid={`${title === "Produktkategorien" ? "button-product-category-import" : "button-component-category-import"}-${row.id}`}');
  });

  it("maps import error codes to specific user-facing messages", () => {
    expect(source).toContain("function resolveCategoryImportError(");
    expect(source).toContain('code === "INVALID_CSV_FORMAT"');
    expect(source).toContain('code === "INVALID_CSV_CONTENT"');
    expect(source).toContain('code === "NOT_FOUND"');
    expect(source).toContain('code === "FORBIDDEN"');
    expect(source).toContain("description: message.description");
  });

  it("uses the shortened delete label", () => {
    expect(source).toMatch(/>\s*-\s*<\/Button>/);
  });
});
