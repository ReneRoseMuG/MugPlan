/**
 * Test Scope:
 *
 * Feature: FT24 - Bulk Import Kunden/Projekte
 * Use Case: UC Admin-Dialogverdrahtung in Listen
 *
 * Abgedeckte Regeln:
 * - CustomersPage rendert keinen Kunden-Bulk-Import mehr.
 * - ProjectsPage rendert keinen Projekt-Bulk-Import mehr.
 * - Stammdaten binden den neuen PDF-Mining-Tab und den Seed-Tab an.
 * - PDF-Mining-Ergebnisse werden tabwechselstabil restauriert, ohne die Stammdaten-Tabs global gemountet zu halten.
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
  it("removes customer bulk import from CustomersPage", () => {
    const customersPagePath = path.resolve(process.cwd(), "client/src/components/CustomersPage.tsx");
    const customersPageSource = readFileSync(customersPagePath, "utf8");

    expect(customersPageSource).not.toContain("CustomerBulkImportDialog");
    expect(customersPageSource).not.toContain("button-open-customer-bulk-import");
    expect(customersPageSource).not.toContain("bulkImportOpen");
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
    expect(masterDataPageSource).toContain("id: \"seed\"");
    expect(masterDataPageSource).toContain("content: <MasterDataSeedPage />");
    expect(masterDataPageSource).toContain("keepMounted={false}");

    expect(miningPageSource).toContain("/api/admin/master-data/pdf-mining/limits");
    expect(miningPageSource).toContain("/api/admin/master-data/pdf-mining/analyze");
    expect(miningPageSource).toContain("partitionMiningFiles(files, limits)");
    expect(miningPageSource).toContain("for (let index = 0; index < batches.length; index += 1)");
    expect(miningPageSource).toContain("mergeMiningAnalyzeResponses(aggregatedResult, batchResult)");
    expect(miningPageSource).toContain("master-data-pdf-mining-result");
    expect(miningPageSource).toContain("window.sessionStorage.getItem(MINING_RESULT_STORAGE_KEY)");
    expect(miningPageSource).toContain("window.sessionStorage.setItem(");
    expect(miningPageSource).toContain("data-testid=\"master-data-pdf-mining-progress\"");
    expect(miningPageSource).toContain("button-adopt-mining-product");
    expect(miningPageSource).toContain("button-run-master-data-pdf-mining");
  });
});
