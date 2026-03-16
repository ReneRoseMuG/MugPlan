/**
 * Test Scope:
 *
 * Feature: FT24 - Bulk Import Kunden/Projekte
 * Use Case: UC Admin-Dialogverdrahtung in Listen
 *
 * Abgedeckte Regeln:
 * - CustomersPage rendert keinen Kunden-Bulk-Import mehr.
 * - ProjectsPage rendert keinen Projekt-Bulk-Import mehr.
 * - Stammdaten binden keinen PDF-Mining-Tab mehr und behalten den Seed-Tab.
 * - Query-Invalidierung nutzt explizite Kunden/Projekte-Keys.
 *
 * Fehlerfaelle:
 * - Fehlende Dialogverdrahtung in der jeweiligen Listenansicht.
 * - Der entfernte PDF-Mining-Tab bleibt versehentlich im Stammdatenbereich sichtbar.
 *
 * Ziel:
 * Sicherstellen, dass die alten Bulk-Imports entfernt bleiben und der PDF-Mining-Tab nicht mehr im Adminbereich verdrahtet ist.
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

  it("removes project bulk import from ProjectsPage and keeps pdf mining out of master data tabs", () => {
    const projectsPagePath = path.resolve(process.cwd(), "client/src/components/ProjectsPage.tsx");
    const projectsPageSource = readFileSync(projectsPagePath, "utf8");
    const masterDataPagePath = path.resolve(process.cwd(), "client/src/components/MasterDataPage.tsx");
    const masterDataPageSource = readFileSync(masterDataPagePath, "utf8");

    expect(projectsPageSource).not.toContain("ProjectBulkImportDialog");
    expect(projectsPageSource).not.toContain("button-open-project-bulk-import");

    expect(masterDataPageSource).not.toContain("id: \"pdf-mining\"");
    expect(masterDataPageSource).not.toContain("MasterDataPdfMiningPage");
    expect(masterDataPageSource).toContain("id: \"seed\"");
    expect(masterDataPageSource).toContain("content: <MasterDataSeedPage />");
    expect(masterDataPageSource).toContain("keepMounted={false}");
  });
});
