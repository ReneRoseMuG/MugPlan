/**
 * Test Scope:
 *
 * Feature: FT27/FT28 - Stammdatenverwaltung Produktkatalog und Tag-Seeds
 *
 * Abgedeckte Regeln:
 * - Stammdaten binden einen eigenen Seed-Tab an.
 * - Der Seed-Tab rendert die neue MasterDataSeedPage.
 * - Die MasterDataSeedPage verdrahtet die verbleibenden Seed-Panels an Status-, Import- und Export-Endpunkte.
 * - SeedPanel rendert Titel, Dateistatus, Import-/Export-Aktionen und Logfenster als wiederverwendbares UI-Muster.
 *
 * Fehlerfaelle:
 * - Seed-Tab fehlt in der Tab-Konfiguration.
 * - SeedPanel verliert Button- oder Textfenster-Verdrahtung.
 *
 * Ziel:
 * Die statische Verdrahtung des neuen Seed-Bereichs im Admin-Stammdatenmodul absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT27 unit: master data seed wiring", () => {
  it("adds a seed tab to MasterDataPage", () => {
    const masterDataPagePath = path.resolve(process.cwd(), "client/src/components/MasterDataPage.tsx");
    const source = readFileSync(masterDataPagePath, "utf8");

    expect(source).toContain('id: "seed"');
    expect(source).toContain('content: <MasterDataSeedPage />');
  });

  it("wires all seed panels with status, apply and export endpoints", () => {
    const seedPagePath = path.resolve(process.cwd(), "client/src/components/MasterDataSeedPage.tsx");
    const source = readFileSync(seedPagePath, "utf8");

    expect(source).toContain('"/api/admin/master-data/seed/product-management/apply"');
    expect(source).toContain('"/api/admin/master-data/seed/product-management/export"');
    expect(source).toContain('"/api/admin/master-data/seed/product-management"');
    expect(source).toContain('"/api/admin/master-data/seed/employees"');
    expect(source).toContain('"/api/admin/master-data/seed/help-texts"');
    expect(source).toContain('"/api/admin/master-data/seed/note-templates"');
    expect(source).toContain('"/api/admin/master-data/seed/tags"');
    expect(source).toContain('"/api/admin/master-data/tags"');
    expect(source).toContain('"/api/note-templates"');
    expect(source).toContain('title: "Produktverwaltung"');
    expect(source).toContain('testId={`master-data-seed-${panel.key}`}');
    expect(source).toContain('title: "Mitarbeiter"');
    expect(source).toContain('title: "Hilfetexte"');
    expect(source).toContain('title: "Notiz Vorlagen"');
    expect(source).toContain('title: "Tags"');
  });

  it("renders seed panel with status, buttons and textarea", () => {
    const seedPanelPath = path.resolve(process.cwd(), "client/src/components/ui/seed-panel.tsx");
    const source = readFileSync(seedPanelPath, "utf8");

    expect(source).toContain("<Textarea");
    expect(source).toContain("readOnly");
    expect(source).toContain("Daten erzeugen");
    expect(source).toContain("Export");
    expect(source).toContain("Quelldatei");
    expect(source).toContain("button-run-");
    expect(source).toContain("button-export-");
    expect(source).toContain("status-");
    expect(source).toContain("textarea-");
  });
});
