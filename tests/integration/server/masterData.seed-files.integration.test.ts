/**
 * Test Scope:
 *
 * Feature: FT27/FT28 - Deployment-Seed fuer Admin-Stammdaten und Tags
 *
 * Abgedeckte Regeln:
 * - Alle Seed-Services lesen und schreiben Dateien in einem externen Temp-Ordner ausserhalb des Projekts.
 * - Tag-Seeds laufen ueber denselben externen Temp-Pfad und bleiben bei Wiederholung duplikatsicher.
 * - Kategorie-, Produkt- und Komponenten-Dateien werden getrennt verwaltet; Kategorien sind die autoritative Quelle fuer ihren Status.
 * - Importe erzeugen fehlende Objekte, aktualisieren Duplikate per Upsert und deaktivieren nicht gelistete Kategorien statt sie still zu behalten.
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
import {
  MANAGED_REPORT_EXCLUSION_TAG_COLOR,
  MANAGED_REPORT_EXCLUSION_TAG_NAME,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
} from "../../../shared/appointmentCancellation";
import { createEmployeeFixture, ensureComponentCategoryFixture, ensureProductCategoryFixture } from "../../helpers/testDataFactory";
import { applyEmployeesSeed, exportEmployeesSeed } from "../../../server/services/seedEmployeesService";
import { applyHelpTextsSeed, exportHelpTextsSeed } from "../../../server/services/seedHelpTextsService";
import { applyNoteTemplatesSeed, exportNoteTemplatesSeed } from "../../../server/services/seedNoteTemplatesService";
import { applyProductManagementSeed, exportProductManagementSeed } from "../../../server/services/seedProductManagementService";
import { applyTagsSeed, exportTagsSeed } from "../../../server/services/seedTagsService";

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

async function expectSeedFileMissing(fileName: string) {
  await expect(fs.access(path.join(tempRoot, "uploads", "seed", fileName))).rejects.toThrow();
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

  it("does not write an employee seed file when no employees exist", async () => {
    const result = await exportEmployeesSeed();

    expect(result).toEqual({
      sourceFile: "employees.csv",
      exists: false,
      logLines: ["Kein Export geschrieben: employees.csv (keine Mitarbeiter vorhanden)"],
    });
    await expectSeedFileMissing("employees.csv");
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

  it("exports and reapplies product management files with dedicated category csvs", async () => {
    const existingProductCategory = await ensureProductCategoryFixture("Export Kategorie");
    const existingComponentCategory = await ensureComponentCategoryFixture("Export Komponenten");
    await masterDataRepository.createProduct({
      name: "Export Produkt",
      shortCode: "EXP-P",
      description: "Alt",
      categoryId: existingProductCategory.id,
      isActive: true,
      version: 1,
    });
    await masterDataRepository.createComponent({
      name: "Export Komponente",
      shortCode: "EXP-K",
      description: "Alt",
      categoryId: existingComponentCategory.id,
      isActive: true,
      version: 1,
    });

    await exportProductManagementSeed();
    await expect(readSeedFile("product-categories.csv")).resolves.toContain("Export Kategorie;false;true");
    await expect(readSeedFile("component-categories.csv")).resolves.toContain("Export Komponenten;false;true");
    await expect(readSeedFile("products.csv")).resolves.toContain("Export Produkt;EXP-P;Alt;Export Kategorie");
    await expect(readSeedFile("components.csv")).resolves.toContain("Export Komponente;EXP-K;Alt;Export Komponenten");

    await writeSeedFile(
      "product-categories.csv",
      "Name;IsDefault;IsActive\nExport Kategorie;false;true\nNeue Produktkategorie;true;true\nSeed Kategorie;false;true\n",
    );
    await writeSeedFile(
      "component-categories.csv",
      "Name;IsDefault;IsActive\nExport Komponenten;false;true\nNeue Komponenten Kategorie;true;true\nSeed Komponenten;false;true\n",
    );
    await writeSeedFile(
      "products.csv",
      "Name;ShortCode;Beschreibung;Kategorie\nExport Produkt;EP2;Neu;Neue Produktkategorie\nSeed Produkt;SP1;Beschreibung;Seed Kategorie\n",
    );
    await writeSeedFile(
      "components.csv",
      "Name;ShortCode;Beschreibung;Kategorie\nExport Komponente;EK2;Neu;Neue Komponenten Kategorie\nSeed Komponente;SK1;Beschreibung;Seed Komponenten\n",
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
    expect(products.find((entry) => entry.name === "Seed Produkt")?.shortCode).toBe("SP1");
    expect(components.find((entry) => entry.name === "Seed Komponente")?.shortCode).toBe("SK1");
    expect(productCategories.some((entry) => entry.name === "Seed Kategorie")).toBe(true);
    expect(productCategories.some((entry) => entry.name === "Neue Produktkategorie" && entry.isDefault)).toBe(true);
    expect(componentCategories.some((entry) => entry.name === "Seed Komponenten")).toBe(true);
    expect(componentCategories.some((entry) => entry.name === "Neue Komponenten Kategorie" && entry.isDefault)).toBe(true);
  });

  it("reports missing product files and rejects malformed csv content", async () => {
    const missing = await applyProductManagementSeed();
    expect(missing.logLines).toEqual(
      expect.arrayContaining([
        "Quelldatei fehlt: product-categories.csv",
        "Quelldatei fehlt: component-categories.csv",
        "Quelldatei fehlt: products.csv",
        "Quelldatei fehlt: components.csv",
      ]),
    );

    await writeSeedFile("product-categories.csv", "Name;IsDefault;IsActive\nKategorie A;true;true\n");
    await writeSeedFile("component-categories.csv", "Name;IsDefault;IsActive\nKategorie B;true;true\n");
    await writeSeedFile("products.csv", "Name;Beschreibung;Kategorie\n\"kaputt;wert;Kategorie\n");
    await writeSeedFile("components.csv", "Name;Beschreibung;Kategorie\nKomponente;Okay;Kategorie\n");

    await expect(applyProductManagementSeed()).rejects.toThrow("INVALID_CSV_FORMAT");
  });

  it("exports category files even when no products or components exist", async () => {
    await ensureProductCategoryFixture("Leere Produktkategorie");
    const result = await exportProductManagementSeed();

    expect(result).toEqual(expect.objectContaining({
      sourceFile: "product-categories.csv",
      exists: true,
      logLines: expect.arrayContaining([
        "Export geschrieben: product-categories.csv",
        "Kein Export geschrieben: component-categories.csv (keine Komponentenkategorien vorhanden)",
        "Kein Export geschrieben: products.csv (keine Produkte vorhanden)",
        "Kein Export geschrieben: components.csv (keine Komponenten vorhanden)",
      ]),
    }));
    await expect(readSeedFile("product-categories.csv")).resolves.toContain("Leere Produktkategorie;false;true");
    await expectSeedFileMissing("component-categories.csv");
    await expectSeedFileMissing("products.csv");
    await expectSeedFileMissing("components.csv");
  });

  it("defaults product and component seed rows to active when the Is Active header is missing", async () => {
    const productCategory = await ensureProductCategoryFixture("Kategorie A");
    const componentCategory = await ensureComponentCategoryFixture("Kategorie B");
    const inactiveProduct = await masterDataRepository.createProduct({
      name: "Inaktives Produkt",
      description: "Alt",
      categoryId: productCategory.id,
      isActive: false,
      version: 1,
    });
    const inactiveComponent = await masterDataRepository.createComponent({
      name: "Inaktive Komponente",
      description: "Alt",
      categoryId: componentCategory.id,
      isActive: false,
      version: 1,
    });

    await writeSeedFile("product-categories.csv", "Name;IsDefault;IsActive\nKategorie A;true;true\n");
    await writeSeedFile("component-categories.csv", "Name;IsDefault;IsActive\nKategorie B;true;true\n");
    await writeSeedFile(
      "products.csv",
      "Name;Beschreibung;Kategorie\nInaktives Produkt;Neu;Kategorie A\nNeues Produkt;Beschreibung;Kategorie A\n",
    );
    await writeSeedFile(
      "components.csv",
      "Name;Beschreibung;Kategorie\nInaktive Komponente;Neu;Kategorie B\nNeue Komponente;Beschreibung;Kategorie B\n",
    );

    await applyProductManagementSeed();

    const products = await masterDataRepository.listProducts("all");
    const components = await masterDataRepository.listComponents("all");

    expect(products.find((entry) => entry.id === inactiveProduct.id)?.isActive).toBe(true);
    expect(products.find((entry) => entry.name === "Neues Produkt")?.isActive).toBe(true);
    expect(components.find((entry) => entry.id === inactiveComponent.id)?.isActive).toBe(true);
    expect(components.find((entry) => entry.name === "Neue Komponente")?.isActive).toBe(true);
  });

  it("rejects product management imports when product or component rows reference unknown categories", async () => {
    await writeSeedFile("product-categories.csv", "Name;IsDefault;IsActive\nBekannte Produktkategorie;true;true\n");
    await writeSeedFile("component-categories.csv", "Name;IsDefault;IsActive\nBekannte Komponentenkategorie;true;true\n");
    await writeSeedFile("products.csv", "Name;Beschreibung;Kategorie\nProdukt A;Alt;Unbekannte Produktkategorie\n");
    await writeSeedFile("components.csv", "Name;Beschreibung;Kategorie\nKomponente A;Alt;Bekannte Komponentenkategorie\n");

    await expect(applyProductManagementSeed()).rejects.toThrow("Produkt Produkt A verweist auf unbekannte Kategorie: Unbekannte Produktkategorie");
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

  it("does not write a note template seed file when no note templates exist", async () => {
    const result = await exportNoteTemplatesSeed();

    expect(result).toEqual({
      sourceFile: "notetemplates.csv",
      exists: false,
      logLines: ["Kein Export geschrieben: notetemplates.csv (keine Notiz Vorlagen vorhanden)"],
    });
    await expectSeedFileMissing("notetemplates.csv");
  });

  it("exports and reapplies tags from the external seed directory", async () => {
    await masterDataRepository.createTag({
      name: "Export Tag",
      color: "#111111",
    });

    await exportTagsSeed();
    await expect(readSeedFile("tags.csv")).resolves.toContain("Export Tag;#111111");
    await expect(readSeedFile("tags.csv")).resolves.not.toContain(RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME);
    await expect(readSeedFile("tags.csv")).resolves.not.toContain(MANAGED_REPORT_EXCLUSION_TAG_NAME);

    await writeSeedFile(
      "tags.csv",
      `Name;Farbe\nExport Tag;#222222\nSeed Tag;\n${RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME};#000000\n${MANAGED_REPORT_EXCLUSION_TAG_NAME};#000000\n`,
    );

    const firstRun = await applyTagsSeed();
    const secondRun = await applyTagsSeed();
    const tags = await masterDataRepository.listTags();

    expect(firstRun.logLines).toContain("Tag aktualisiert: Export Tag");
    expect(firstRun.logLines).toContain("Tag angelegt: Seed Tag");
    expect(firstRun.logLines).toContain(`System-Tag uebersprungen: ${RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME}`);
    expect(firstRun.logLines).toContain(`System-Tag uebersprungen: ${MANAGED_REPORT_EXCLUSION_TAG_NAME}`);
    expect(secondRun.logLines).toContain("Tag aktualisiert: Seed Tag");
    expect(tags.filter((entry) => entry.name === "Seed Tag")).toHaveLength(1);
    expect(tags.find((entry) => entry.name === "Export Tag")?.color).toBe("#222222");
    expect(tags.find((entry) => entry.name === "Seed Tag")?.color).toBe("#2563eb");
    expect(tags.find((entry) => entry.name === RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME)).toMatchObject({
      color: RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR,
      isDefault: true,
    });
    expect(tags.find((entry) => entry.name === MANAGED_REPORT_EXCLUSION_TAG_NAME)).toMatchObject({
      color: MANAGED_REPORT_EXCLUSION_TAG_COLOR,
      isDefault: true,
    });
  });

  it("reports missing tag files before import", async () => {
    await expect(applyTagsSeed()).resolves.toEqual({
      sourceFile: "tags.csv",
      exists: false,
      logLines: ["Quelldatei fehlt: tags.csv"],
    });
  });

  it("does not write a tag seed file when no tags exist", async () => {
    const result = await exportTagsSeed();

    expect(result).toEqual({
      sourceFile: "tags.csv",
      exists: false,
      logLines: ["Kein Export geschrieben: tags.csv (keine Tags vorhanden)"],
    });
    await expectSeedFileMissing("tags.csv");
  });
});
