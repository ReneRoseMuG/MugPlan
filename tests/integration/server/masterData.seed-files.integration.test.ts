/**
 * Test Scope:
 *
 * Feature: FT27 - Deployment-Seed fuer Admin-Stammdaten
 *
 * Abgedeckte Regeln:
 * - Alle Seed-Services lesen und schreiben Dateien in einem externen Temp-Ordner ausserhalb des Projekts.
 * - Importe erzeugen fehlende Objekte, aktualisieren Duplikate per Upsert und loeschen keine nicht gelisteten Daten.
 * - Fehlende Dateien werden pro Domaene sauber gemeldet.
 * - Formatfehler schlagen kontrolliert fehl.
 *
 * Fehlerfaelle:
 * - Seed erzeugt Dubletten bei wiederholtem Import.
 * - Ungueltige CSV-Dateien werden still akzeptiert.
 *
 * Ziel:
 * Dateibasierte Seed-Roundtrips integrativ mit echter DB und echter Dateisystemablage absichern.
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as employeesRepository from "../../../server/repositories/employeesRepository";
import * as helpTextsRepository from "../../../server/repositories/helpTextsRepository";
import * as masterDataRepository from "../../../server/repositories/masterDataRepository";
import * as noteTemplatesRepository from "../../../server/repositories/noteTemplatesRepository";
import * as projectStatusRepository from "../../../server/repositories/projectStatusRepository";
import { createEmployeeFixture, ensureComponentCategoryFixture, ensureProductCategoryFixture } from "../../helpers/testDataFactory";
import { applyEmployeesSeed, exportEmployeesSeed } from "../../../server/services/seedEmployeesService";
import { applyHelpTextsSeed, exportHelpTextsSeed } from "../../../server/services/seedHelpTextsService";
import { applyNoteTemplatesSeed, exportNoteTemplatesSeed } from "../../../server/services/seedNoteTemplatesService";
import { applyProductManagementSeed, exportProductManagementSeed } from "../../../server/services/seedProductManagementService";
import { applyProjectStatusSeed, exportProjectStatusSeed } from "../../../server/services/seedProjectStatusService";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mugplan-seed-integration-"));
process.env.ATTACHMENT_STORAGE_PATH = path.join(tempRoot, "uploads");
process.env.BACKUP_BASE_PATH = path.join(tempRoot, "backups");

async function clearSeedDirectory() {
  await fs.rm(path.join(tempRoot, "uploads", "seed"), { recursive: true, force: true });
}

async function writeSeedFile(fileName: string, content: string) {
  const seedDirectory = path.join(tempRoot, "uploads", "seed");
  await fs.mkdir(seedDirectory, { recursive: true });
  await fs.writeFile(path.join(seedDirectory, fileName), content, "utf8");
}

async function readSeedFile(fileName: string) {
  return fs.readFile(path.join(tempRoot, "uploads", "seed", fileName), "utf8");
}

describe("FT27 integration: seed file services", () => {
  beforeEach(async () => {
    await clearSeedDirectory();
  });

  afterAll(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("exports and reapplies employees from an external seed directory without duplicates", async () => {
    await createEmployeeFixture("SEED-EMP-A");

    const exportResult = await exportEmployeesSeed();
    expect(exportResult.logLines).toContain("Export geschrieben: employees.csv");
    await expect(readSeedFile("employees.csv")).resolves.toContain("Fixture;SEED-EMP-A-0001;true");

    await writeSeedFile(
      "employees.csv",
      "Vorname;Nachname;IsActive\nFixture;SEED-EMP-A-0001;false\nGrace;Hopper;true\n",
    );

    const firstRun = await applyEmployeesSeed();
    const secondRun = await applyEmployeesSeed();
    const employees = await employeesRepository.getAllEmployees();

    expect(firstRun.logLines).toContain("Mitarbeiter aktualisiert: SEED-EMP-A-0001, Fixture");
    expect(firstRun.logLines).toContain("Mitarbeiter angelegt: Hopper, Grace");
    expect(secondRun.logLines).toContain("Mitarbeiter bereits vorhanden: Hopper, Grace");
    expect(employees.filter((entry) => entry.firstName === "Grace" && entry.lastName === "Hopper")).toHaveLength(1);
    expect(employees.find((entry) => entry.firstName === "Fixture" && entry.lastName === "SEED-EMP-A-0001")?.isActive).toBe(false);
  });

  it("reports missing employee files before import", async () => {
    await expect(applyEmployeesSeed()).resolves.toEqual({
      sourceFile: "employees.csv",
      exists: false,
      logLines: ["Quelldatei fehlt: employees.csv"],
    });
  });

  it("exports and applies help texts against the external seed yaml", async () => {
    await helpTextsRepository.createHelpText({
      helpKey: "seed.alpha",
      title: "Alt",
      body: "",
    });

    await exportHelpTextsSeed();
    await expect(readSeedFile("helptexts.yaml")).resolves.toContain("help_key: seed.alpha");

    await writeSeedFile(
      "helptexts.yaml",
      [
        "- help_key: seed.alpha",
        "  title: Alpha",
        "  body: Neuer Text",
        "- help_key: seed.beta",
        "  title: Beta",
        "  body: Zweiter Text",
        "",
      ].join("\n"),
    );

    const result = await applyHelpTextsSeed();
    const rows = await helpTextsRepository.getHelpTexts();

    expect(result.logLines).toContain("Hilfetexte angelegt: 1");
    expect(rows.find((entry) => entry.helpKey === "seed.alpha")?.body).toBe("Neuer Text");
    expect(rows.find((entry) => entry.helpKey === "seed.beta")?.title).toBe("Beta");
  });

  it("exports and reapplies product management files with category creation and duplicate-safe upserts", async () => {
    const existingProductCategory = await ensureProductCategoryFixture("Export Kategorie");
    const existingComponentCategory = await ensureComponentCategoryFixture("Export Komponenten");
    await masterDataRepository.createProduct({
      name: "Export Produkt",
      description: "Alt",
      categoryId: existingProductCategory.id,
      isActive: true,
      version: 1,
    });
    await masterDataRepository.createComponent({
      name: "Export Komponente",
      description: "Alt",
      categoryId: existingComponentCategory.id,
      isActive: true,
      version: 1,
    });

    await exportProductManagementSeed();
    await expect(readSeedFile("products.csv")).resolves.toContain("Export Produkt;Alt;Export Kategorie");
    await expect(readSeedFile("components.csv")).resolves.toContain("Export Komponente;Alt;Export Komponenten");

    await writeSeedFile(
      "products.csv",
      "Name;Beschreibung;Kategorie\nExport Produkt;Neu;Neue Produktkategorie\nSeed Produkt;Beschreibung;Seed Kategorie\n",
    );
    await writeSeedFile(
      "components.csv",
      "Name;Beschreibung;Kategorie\nExport Komponente;Neu;Neue Komponenten Kategorie\nSeed Komponente;Beschreibung;Seed Komponenten\n",
    );

    const firstRun = await applyProductManagementSeed();
    const secondRun = await applyProductManagementSeed();
    const products = await masterDataRepository.listProducts("all");
    const components = await masterDataRepository.listComponents("all");
    const productCategories = await masterDataRepository.listProductCategories("all");
    const componentCategories = await masterDataRepository.listComponentCategories("all");

    expect(firstRun.logLines).toContain("Produkt angelegt: Seed Produkt");
    expect(firstRun.logLines).toContain("Komponente angelegt: Seed Komponente");
    expect(secondRun.logLines).toContain("Produkt aktualisiert: Seed Produkt");
    expect(products.filter((entry) => entry.name === "Seed Produkt")).toHaveLength(1);
    expect(components.filter((entry) => entry.name === "Seed Komponente")).toHaveLength(1);
    expect(productCategories.some((entry) => entry.name === "Seed Kategorie")).toBe(true);
    expect(componentCategories.some((entry) => entry.name === "Seed Komponenten")).toBe(true);
  });

  it("reports missing product files and rejects malformed csv content", async () => {
    const missing = await applyProductManagementSeed();
    expect(missing.logLines).toEqual(
      expect.arrayContaining([
        "Quelldatei fehlt: products.csv",
        "Quelldatei fehlt: components.csv",
      ]),
    );

    await writeSeedFile("products.csv", "Name;Beschreibung;Kategorie\n\"kaputt;wert;Kategorie\n");
    await writeSeedFile("components.csv", "Name;Beschreibung;Kategorie\nKomponente;Okay;Kategorie\n");

    await expect(applyProductManagementSeed()).rejects.toThrow("INVALID_CSV_FORMAT");
  });

  it("exports and reapplies project states from the external seed directory", async () => {
    await projectStatusRepository.createProjectStatus({
      title: "Planung",
      description: null,
      color: "#111111",
      sortOrder: 0,
    });

    await exportProjectStatusSeed();
    await expect(readSeedFile("projectstates.csv")).resolves.toContain("Planung;#111111;true");

    await writeSeedFile(
      "projectstates.csv",
      "Name;Farbe;Status\nPlanung;#abcdef;false\nMontage;#123456;ja\n",
    );

    const result = await applyProjectStatusSeed();
    const rows = await projectStatusRepository.getProjectStatuses("all");

    expect(result.logLines).toContain("Projektstatus aktualisiert: Planung");
    expect(result.logLines).toContain("Projektstatus angelegt: Montage");
    expect(rows.find((entry) => entry.title === "Planung")?.isActive).toBe(false);
    expect(rows.find((entry) => entry.title === "Montage")?.color).toBe("#123456");
  });

  it("exports and reapplies note templates from the external seed directory", async () => {
    await noteTemplatesRepository.createNoteTemplate({
      title: "Checkliste",
      body: "Alt",
      cardColor: "#111111",
      print: true,
      sortOrder: 3,
      isActive: true,
      version: 1,
    });

    await exportNoteTemplatesSeed();
    await expect(readSeedFile("notetemplates.csv")).resolves.toContain("Checkliste;Alt;#111111;true;3;true");

    await writeSeedFile(
      "notetemplates.csv",
      "Titel;Inhalt;Farbe;Drucken;Sortierreihenfolge;Status\nCheckliste;Neu;#222222;nein;kaputt;false\nMontage;Body;;ja;9;true\n",
    );

    const result = await applyNoteTemplatesSeed();
    const rows = await noteTemplatesRepository.getNoteTemplates(false);

    expect(result.logLines).toContain("Notiz Vorlage aktualisiert: Checkliste");
    expect(result.logLines).toContain("Notiz Vorlage angelegt: Montage");
    expect(rows.find((entry) => entry.title === "Checkliste")?.sortOrder).toBe(3);
    expect(rows.find((entry) => entry.title === "Montage")?.print).toBe(true);
  });
});
