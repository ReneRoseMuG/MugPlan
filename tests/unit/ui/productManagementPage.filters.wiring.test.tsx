/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Produktverwaltung verwendet wiederverwendbare UI-Bausteine fuer Auswahl, Stammdaten und Komponentenlisten.
 * - Produkt-Komponenten-Zuordnung wird getrennt in Produktliste und Alle-Komponenten-Liste angezeigt.
 * - Kategorie-Bereiche bleiben als eigene Bereiche erhalten.
 *
 * Fehlerfälle:
 * - ProductManagementPage rendert die neue Komponentenstruktur nicht.
 * - Komponenten-Zuordnung bleibt in einem alten monolithischen CRUD-Block verankert.
 *
 * Ziel:
 * Sicherstellen, dass die Produktverwaltung auf die neue Komponentenarchitektur umgestellt ist.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("FT27 UI: product management component architecture wiring", () => {
  it("uses the new reusable product management UI components", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProductManagementPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("import { AllComponentList }");
    expect(source).toContain("import { ProductComponentList }");
    expect(source).toContain("import { ProductData");
    expect(source).toContain("import { ProductDropDown }");
    expect(source).toContain("<ProductDropDown");
    expect(source).toContain("<ProductData");
    expect(source).toContain("<ProductComponentList");
    expect(source).toContain("<AllComponentList");
    expect(source).toContain("const selectedProductComponents = useMemo(() => {");
    expect(source).toContain("const filteredAvailableComponents = useMemo(() => {");
  });

  it("keeps category panels and removes the old inline component management table", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProductManagementPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("data-testid=\"master-data-product-categories\"");
    expect(source).toContain("data-testid=\"master-data-component-categories\"");
    expect(source).not.toContain("DialogTitle>Neue Komponente</DialogTitle>");
    expect(source).not.toContain("TableHead>Produkte</TableHead>");
    expect(source).not.toContain("const [componentDialogOpen, setComponentDialogOpen]");
  });
});
