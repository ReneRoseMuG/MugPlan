/**
 * Test Scope:
 *
 * Feature: FT27 - Stammdatenverwaltung Produktkatalog
 *
 * Abgedeckte Regeln:
 * - Stammdaten binden einen eigenen Seed-Tab an.
 * - Der Seed-Tab rendert die neue MasterDataSeedPage.
 * - SeedPanel rendert Titel, Aktion und Logfenster als wiederverwendbares UI-Muster.
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

  it("wires product management seed panel and keeps placeholder panels disabled", () => {
    const seedPagePath = path.resolve(process.cwd(), "client/src/components/MasterDataSeedPage.tsx");
    const source = readFileSync(seedPagePath, "utf8");

    expect(source).toContain('"/api/admin/master-data/seed/product-management"');
    expect(source).toContain('title="Produktverwaltung"');
    expect(source).toContain('testId="master-data-seed-product-management"');
    expect(source).toContain('title="Mitarbeiter"');
    expect(source).toContain('title="Hilfetexte"');
    expect(source).toContain('title="Projekt Status"');
    expect(source).toContain('title="Notiz Vorlagen"');
    expect(source).toContain("disabled");
  });

  it("renders seed panel with button and textarea", () => {
    const seedPanelPath = path.resolve(process.cwd(), "client/src/components/ui/seed-panel.tsx");
    const source = readFileSync(seedPanelPath, "utf8");

    expect(source).toContain("<Textarea");
    expect(source).toContain("readOnly");
    expect(source).toContain("Daten erzeugen");
    expect(source).toContain("button-run-");
    expect(source).toContain("textarea-");
  });
});
