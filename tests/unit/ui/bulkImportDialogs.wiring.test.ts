/**
 * Test Scope:
 *
 * Feature: FT24 - Bulk Import Kunden/Projekte
 * Use Case: UC Admin-Dialogverdrahtung in Listen
 *
 * Abgedeckte Regeln:
 * - CustomersPage rendert admin-only Bulk-Import-Button und Dialog.
 * - ProjectsPage rendert admin-only Bulk-Import-Button und Dialog.
 * - Query-Invalidierung nutzt explizite Kunden/Projekte-Keys.
 *
 * Fehlerfaelle:
 * - Fehlende Dialogverdrahtung in der jeweiligen Listenansicht.
 *
 * Ziel:
 * Sicherstellen, dass Bulk-Import-Dialoge in beiden Hauptlisten korrekt angebunden sind.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT24 unit: bulk import dialog wiring", () => {
  it("wires customer bulk import in CustomersPage and dialog invalidations", () => {
    const customersPagePath = path.resolve(process.cwd(), "client/src/components/CustomersPage.tsx");
    const customersPageSource = readFileSync(customersPagePath, "utf8");
    const customerDialogPath = path.resolve(process.cwd(), "client/src/components/CustomerBulkImportDialog.tsx");
    const customerDialogSource = readFileSync(customerDialogPath, "utf8");

    expect(customersPageSource).toContain("CustomerBulkImportDialog");
    expect(customersPageSource).toContain("button-open-customer-bulk-import");
    expect(customersPageSource).toContain("!tableOnly && isAdmin");
    expect(customersPageSource).toContain("<CustomerBulkImportDialog open={bulkImportOpen} onOpenChange={setBulkImportOpen} />");

    expect(customerDialogSource).toContain("queryKey: [\"/api/customers\"]");
    expect(customerDialogSource).toContain("queryKey: [\"/api/customers\", { scope: \"active\" }]");
    expect(customerDialogSource).toContain("queryKey: [\"/api/customers\", { scope: \"inactive\" }]");
    expect(customerDialogSource).toContain("queryKey: [\"/api/projects?filter=all&scope=all\"]");
  });

  it("wires project bulk import in ProjectsPage and dialog invalidations", () => {
    const projectsPagePath = path.resolve(process.cwd(), "client/src/components/ProjectsPage.tsx");
    const projectsPageSource = readFileSync(projectsPagePath, "utf8");
    const projectDialogPath = path.resolve(process.cwd(), "client/src/components/ProjectBulkImportDialog.tsx");
    const projectDialogSource = readFileSync(projectDialogPath, "utf8");

    expect(projectsPageSource).toContain("ProjectBulkImportDialog");
    expect(projectsPageSource).toContain("button-open-project-bulk-import");
    expect(projectsPageSource).toContain("!tableOnly && isAdmin");
    expect(projectsPageSource).toContain("<ProjectBulkImportDialog open={bulkImportOpen} onOpenChange={setBulkImportOpen} />");

    expect(projectDialogSource).toContain("queryKey: [\"/api/projects\"]");
    expect(projectDialogSource).toContain("queryKey: [\"/api/projects?filter=all&scope=all\"]");
    expect(projectDialogSource).toContain("queryKey: [\"/api/customers\"]");
    expect(projectDialogSource).toContain("queryKey: [\"/api/customers\", { scope: \"active\" }]");
    expect(projectDialogSource).toContain("queryKey: [\"/api/customers\", { scope: \"inactive\" }]");
  });
});
