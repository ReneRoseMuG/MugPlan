/**
 * Test Scope:
 *
 * Feature: FT24 - Bulk Import Kunden/Projekte
 * Use Case: UC Admin-Dialogverdrahtung in Listen
 *
 * Abgedeckte Regeln:
 * - CustomersPage rendert admin-only Bulk-Import-Button und Dialog.
 * - ProjectsPage rendert keinen Projekt-Bulk-Import mehr.
 * - Stammdaten binden den neuen PDF-Mining-Tab an.
 * - Query-Invalidierung nutzt explizite Kunden/Projekte-Keys.
 *
 * Fehlerfaelle:
 * - Fehlende Dialogverdrahtung in der jeweiligen Listenansicht.
 *
 * Ziel:
 * Sicherstellen, dass der alte Projekt-Bulk-Import entfernt und der neue Mining-Flow im Adminbereich verdrahtet ist.
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

  it("removes project bulk import from ProjectsPage and adds master data pdf mining", () => {
    const projectsPagePath = path.resolve(process.cwd(), "client/src/components/ProjectsPage.tsx");
    const projectsPageSource = readFileSync(projectsPagePath, "utf8");
    const masterDataPagePath = path.resolve(process.cwd(), "client/src/components/MasterDataPage.tsx");
    const masterDataPageSource = readFileSync(masterDataPagePath, "utf8");
    const miningPagePath = path.resolve(process.cwd(), "client/src/components/MasterDataPdfMiningPage.tsx");
    const miningPageSource = readFileSync(miningPagePath, "utf8");

    expect(projectsPageSource).not.toContain("ProjectBulkImportDialog");
    expect(projectsPageSource).not.toContain("button-open-project-bulk-import");

    expect(masterDataPageSource).toContain("id: \"pdf-mining\"");
    expect(masterDataPageSource).toContain("content: <MasterDataPdfMiningPage />");

    expect(miningPageSource).toContain("/api/admin/master-data/pdf-mining/analyze");
    expect(miningPageSource).toContain("button-adopt-mining-product");
    expect(miningPageSource).toContain("button-run-master-data-pdf-mining");
  });
});
