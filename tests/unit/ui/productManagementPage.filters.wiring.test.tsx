/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Produktverwaltung verwendet wiederverwendbare UI-Bausteine fuer Auswahl, Stammdaten und Komponentenlisten.
 * - Alle-Komponenten-Liste zeigt den gesamten Komponentenbestand; die Kategorienfilterung bleibt in der Listenkomponente.
 * - Alle-Komponenten-Liste legt neue Komponenten ohne Produktbindung an.
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
    const allComponentListPath = path.resolve(process.cwd(), "client/src/components/ui/all-component-list.tsx");
    const allComponentListSource = readFileSync(allComponentListPath, "utf8");

    expect(source).toContain("import { AllComponentList }");
    expect(source).toContain("import { ProductData");
    expect(source).toContain("import { ProductDropDown }");
    expect(source).toContain("<ProductDropDown");
    expect(source).toContain("<ProductData");
    expect(source).toContain("<AllComponentList");
    expect(source).toContain("const allComponents = useMemo(");
    expect(source).toContain("components={allComponents}");
    expect(source).toContain("async function createStandaloneComponent");
    expect(source).toContain("onCreateComponent={createStandaloneComponent}");
    expect(source).not.toContain("const filteredAvailableComponents = useMemo(() => {");
    expect(allComponentListSource).toContain("button-open-new-component-from-all-components");
    expect(allComponentListSource).toContain("DialogTitle>Neue Komponente</DialogTitle>");
  });

  it("keeps category panels and removes the old inline component management table", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProductManagementPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("data-testid=\"master-data-product-categories\"");
    expect(source).toContain("data-testid=\"master-data-component-categories\"");
    expect(source).not.toContain("<ProductComponentList");
    expect(source).not.toContain("TableHead>Produkte</TableHead>");
    expect(source).not.toContain("const [componentDialogOpen, setComponentDialogOpen]");
  });
});
