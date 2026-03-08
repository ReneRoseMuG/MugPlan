/**
 * Test Scope:
 *
 * Feature: FT27 - Produktverwaltung
 * Use Case: UC27 - Admin filtert Produkt- und Komponentenlisten in der Stammdatenansicht
 *
 * Abgedeckte Regeln:
 * - Produkte koennen separat nach Produktkategorie gefiltert werden.
 * - Modelle koennen separat nach Komponentenkategorie und Produktzuordnung gefiltert werden.
 * - Listenfilter sind von den Create/Edit-Formularfeldern getrennt verdrahtet.
 *
 * Fehlerfaelle:
 * - Selects existieren, filtern aber die Tabellenlisten nicht.
 * - Formular-Kategorieauswahl und Listenfilter teilen sich versehentlich denselben State.
 *
 * Ziel:
 * Sicherstellen, dass die Produktverwaltung echte Listenfilter fuer Kategorien und Produkte verdrahtet.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("FT27 UI: product management filters wiring", () => {
  it("wires filtering through the existing category and product tables", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProductManagementPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("const [productCategoryFilterId, setProductCategoryFilterId] = useState(\"\")");
    expect(source).toContain("const [componentCategoryFilterId, setComponentCategoryFilterId] = useState(\"\")");
    expect(source).toContain("const [componentProductFilterId, setComponentProductFilterId] = useState(\"\")");
    expect(source).toContain("const filteredProducts = useMemo(() => {");
    expect(source).toContain("const filteredComponents = useMemo(() => {");
    expect(source).toContain("function toggleProductCategorySelection(row: ProductCategory)");
    expect(source).toContain("function toggleComponentCategorySelection(row: ComponentCategory)");
    expect(source).toContain("function toggleProductSelection(row: Product)");
    expect(source).toContain("setProductCategoryFilterId(String(row.id));");
    expect(source).toContain("setComponentCategoryFilterId(String(row.id));");
    expect(source).toContain("setComponentProductFilterId(String(row.id));");
    expect(source).toContain("setProductCategoryFilterId(event.target.value);");
    expect(source).toContain("setComponentCategoryFilterId(event.target.value);");
    expect(source).toContain("setComponentProductFilterId(event.target.value);");
    expect(source).toContain("{filteredProducts.map((row) => (");
    expect(source).toContain("{filteredComponents.map((row) => (");
  });

  it("does not render duplicate filter selects", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProductManagementPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("value={editProduct ? String(editProduct.categoryId) : newProduct.categoryId}");
    expect(source).toContain("value={editComponent ? String(editComponent.categoryId) : newComponent.categoryId}");
    expect(source).not.toContain("data-testid=\"filter-product-category\"");
    expect(source).not.toContain("data-testid=\"filter-component-category\"");
    expect(source).not.toContain("data-testid=\"filter-component-product\"");
  });
});
