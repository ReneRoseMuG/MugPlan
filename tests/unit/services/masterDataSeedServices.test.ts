/**
 * Test Scope:
 *
 * Feature: FT27/FT28 - Deployment-Seed fuer Admin-Stammdaten und Tags
 *
 * Abgedeckte Regeln:
 * - Seed-Services lesen und schreiben ihre Formate gegen einen externen Seed-Ordner.
 * - Import laeuft als Upsert ohne Duplikaterzeugung und protokolliert fehlende oder ungueltige Zeilen.
 * - Tag-Seeds erzeugen und aktualisieren Tags duplikatsicher mit Default-Farb-Fallback.
 * - Fehlende Dateien werden pro Domaene sauber gemeldet.
 * - Parser- oder Importfehler werden nicht still verschluckt.
 *
 * Fehlerfaelle:
 * - Seed erzeugt Duplikate statt bestehende Objekte zu aktualisieren.
 * - Ungueltige CSV- oder YAML-Dateien werden ohne Fehler akzeptiert.
 *
 * Ziel:
 * Die domaenenspezifische Seed-Logik isoliert absichern, ohne echte DB-Zugriffe zu benoetigen.
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MANAGED_REPORT_EXCLUSION_TAG_COLOR,
  MANAGED_REPORT_EXCLUSION_TAG_NAME,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
} from "../../../shared/appointmentCancellation";

type EmployeeRow = {
  id: number;
  firstName: string;
  lastName: string;
  isActive: boolean;
  version: number;
};

type ProductCategoryRow = {
  id: number;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  version: number;
};

type ComponentCategoryRow = ProductCategoryRow;

type ProductRow = {
  id: number;
  name: string;
  shortCode?: string | null;
  description: string | null;
  categoryId: number;
  isActive: boolean;
  version: number;
};

type ComponentRow = ProductRow;

type NoteTemplateRow = {
  id: number;
  title: string;
  body: string;
  cardColor: string | null;
  print: boolean;
  sortOrder: number;
  isActive: boolean;
  version: number;
};

type TagRow = {
  id: number;
  name: string;
  color: string;
  isDefault: boolean;
  version: number;
};

const state = vi.hoisted(() => ({
  employees: [] as EmployeeRow[],
  helpTextsYaml: [] as Array<{ help_key: string; title: string; body: string }>,
  helpTextsPreview: {
    fileHash: "preview-hash",
    summary: { totalItems: 0, createCount: 0, silentOverwriteCount: 0, conflictCount: 0 },
    conflicts: [] as Array<{ helpKey: string }>,
  },
  helpTextsApplyResult: {
    createdCount: 0,
    silentOverwrittenCount: 0,
    decisionOverwrittenCount: 0,
    skippedCount: 0,
  },
  productCategories: [] as ProductCategoryRow[],
  componentCategories: [] as ComponentCategoryRow[],
  products: [] as ProductRow[],
  components: [] as ComponentRow[],
  noteTemplates: [] as NoteTemplateRow[],
  tags: [] as TagRow[],
  ids: {
    employee: 1,
    productCategory: 1,
    componentCategory: 1,
    product: 1,
    component: 1,
    noteTemplate: 1,
    tag: 1,
  },
}));

const createEmployeeMock = vi.hoisted(() =>
  vi.fn(async ({ firstName, lastName }: { firstName: string; lastName: string }) => {
    const row: EmployeeRow = {
      id: state.ids.employee++,
      firstName,
      lastName,
      isActive: true,
      version: 1,
    };
    state.employees.push(row);
    return row;
  }),
);

const exportHelpTextsAsYamlMock = vi.hoisted(() =>
  vi.fn(async () =>
    state.helpTextsYaml
      .map((entry) => `- help_key: ${entry.help_key}\n  title: ${entry.title}\n  body: ${entry.body}\n`)
      .join(""),
  ),
);
const previewHelpTextsImportMock = vi.hoisted(() => vi.fn(async () => state.helpTextsPreview));
const applyHelpTextsImportMock = vi.hoisted(() => vi.fn(async () => state.helpTextsApplyResult));

vi.mock("../../../server/services/employeesService", () => ({
  createEmployee: createEmployeeMock,
}));

vi.mock("../../../server/repositories/employeesRepository", () => ({
  getAllEmployees: vi.fn(async () => [...state.employees].sort((a, b) => a.lastName.localeCompare(b.lastName))),
  toggleEmployeeActiveWithVersion: vi.fn(async (id: number, expectedVersion: number, isActive: boolean) => {
    const row = state.employees.find((entry) => entry.id === id && entry.version === expectedVersion);
    if (!row) return { kind: "version_conflict" };
    row.isActive = isActive;
    row.version += 1;
    return { kind: "updated", employee: { ...row } };
  }),
}));

vi.mock("../../../server/services/helpTextsYamlService", () => ({
  exportHelpTextsAsYaml: exportHelpTextsAsYamlMock,
  previewHelpTextsImport: previewHelpTextsImportMock,
  applyHelpTextsImport: applyHelpTextsImportMock,
}));

vi.mock("../../../server/repositories/masterDataRepository", () => ({
  getProductCategoryByName: vi.fn(async (name: string) => state.productCategories.find((entry) => entry.name === name)),
  createProductCategory: vi.fn(async ({ name, isDefault, isActive, version }: { name: string; isDefault: boolean; isActive: boolean; version: number }) => {
    const row: ProductCategoryRow = { id: state.ids.productCategory++, name, isDefault, isActive, version };
    state.productCategories.push(row);
    return row;
  }),
  updateProductCategoryWithVersion: vi.fn(async (id: number, expectedVersion: number, input: { isDefault?: boolean; isActive?: boolean }) => {
    const row = state.productCategories.find((entry) => entry.id === id && entry.version === expectedVersion);
    if (!row) return { kind: "version_conflict" };
    row.isDefault = input.isDefault ?? row.isDefault;
    row.isActive = input.isActive ?? row.isActive;
    row.version += 1;
    return { kind: "updated", row: { ...row } };
  }),
  getComponentCategoryByName: vi.fn(async (name: string) => state.componentCategories.find((entry) => entry.name === name)),
  createComponentCategory: vi.fn(async ({ name, isDefault, isActive, version }: { name: string; isDefault: boolean; isActive: boolean; version: number }) => {
    const row: ComponentCategoryRow = { id: state.ids.componentCategory++, name, isDefault, isActive, version };
    state.componentCategories.push(row);
    return row;
  }),
  updateComponentCategoryWithVersion: vi.fn(async (id: number, expectedVersion: number, input: { isDefault?: boolean; isActive?: boolean }) => {
    const row = state.componentCategories.find((entry) => entry.id === id && entry.version === expectedVersion);
    if (!row) return { kind: "version_conflict" };
    row.isDefault = input.isDefault ?? row.isDefault;
    row.isActive = input.isActive ?? row.isActive;
    row.version += 1;
    return { kind: "updated", row: { ...row } };
  }),
  listProducts: vi.fn(async () => [...state.products]),
  createProduct: vi.fn(async (input: Omit<ProductRow, "id">) => {
    const row: ProductRow = { id: state.ids.product++, ...input };
    state.products.push(row);
    return row;
  }),
  updateProductWithVersion: vi.fn(async (id: number, expectedVersion: number, input: Partial<ProductRow>) => {
    const row = state.products.find((entry) => entry.id === id && entry.version === expectedVersion);
    if (!row) return { kind: "version_conflict" };
    row.shortCode = input.shortCode ?? row.shortCode;
    row.description = input.description ?? row.description;
    row.categoryId = input.categoryId ?? row.categoryId;
    row.isActive = input.isActive ?? row.isActive;
    row.version += 1;
    return { kind: "updated", row: { ...row } };
  }),
  listComponents: vi.fn(async () => [...state.components]),
  createComponent: vi.fn(async (input: Omit<ComponentRow, "id">) => {
    const row: ComponentRow = { id: state.ids.component++, ...input };
    state.components.push(row);
    return row;
  }),
  updateComponentWithVersion: vi.fn(async (id: number, expectedVersion: number, input: Partial<ComponentRow>) => {
    const row = state.components.find((entry) => entry.id === id && entry.version === expectedVersion);
    if (!row) return { kind: "version_conflict" };
    row.shortCode = input.shortCode ?? row.shortCode;
    row.description = input.description ?? row.description;
    row.categoryId = input.categoryId ?? row.categoryId;
    row.isActive = input.isActive ?? row.isActive;
    row.version += 1;
    return { kind: "updated", row: { ...row } };
  }),
  listProductCategories: vi.fn(async () => [...state.productCategories]),
  listComponentCategories: vi.fn(async () => [...state.componentCategories]),
  listTags: vi.fn(async () => [...state.tags].sort((a, b) => a.name.localeCompare(b.name))),
  createTag: vi.fn(async ({ name, color, isDefault }: { name: string; color: string; isDefault?: boolean }) => {
    const row: TagRow = { id: state.ids.tag++, name, color, isDefault: isDefault ?? false, version: 1 };
    state.tags.push(row);
    return row;
  }),
  ensureTagDefinition: vi.fn(async ({ name, color, isDefault }: { name: string; color: string; isDefault?: boolean }) => {
    const normalizedName = name.trim().toLocaleLowerCase("de");
    const existing = state.tags.find((entry) => entry.name.trim().toLocaleLowerCase("de") === normalizedName);
    if (!existing) {
      const row: TagRow = { id: state.ids.tag++, name, color, isDefault: isDefault ?? false, version: 1 };
      state.tags.push(row);
      return row;
    }
    existing.color = color ?? existing.color;
    existing.isDefault = isDefault ?? existing.isDefault;
    existing.version += 1;
    return { ...existing };
  }),
  updateTagWithVersion: vi.fn(async (id: number, expectedVersion: number, input: { color?: string; isDefault?: boolean }) => {
    const row = state.tags.find((entry) => entry.id === id && entry.version === expectedVersion);
    if (!row) return { kind: "version_conflict" };
    row.color = input.color ?? row.color;
    row.isDefault = input.isDefault ?? row.isDefault;
    row.version += 1;
    return { kind: "updated", row: { ...row } };
  }),
}));

vi.mock("../../../server/repositories/noteTemplatesRepository", () => ({
  getNoteTemplates: vi.fn(async () => [...state.noteTemplates]),
  createNoteTemplate: vi.fn(async (input: Omit<NoteTemplateRow, "id">) => {
    const row: NoteTemplateRow = { id: state.ids.noteTemplate++, ...input };
    state.noteTemplates.push(row);
    return row;
  }),
  updateNoteTemplateWithVersion: vi.fn(async (id: number, expectedVersion: number, input: Partial<NoteTemplateRow>) => {
    const row = state.noteTemplates.find((entry) => entry.id === id && entry.version === expectedVersion);
    if (!row) return { kind: "version_conflict" };
    row.body = input.body ?? row.body;
    row.cardColor = input.cardColor ?? row.cardColor;
    row.print = input.print ?? row.print;
    row.sortOrder = input.sortOrder ?? row.sortOrder;
    row.isActive = input.isActive ?? row.isActive;
    row.version += 1;
    return { kind: "updated", template: { ...row } };
  }),
}));

const originalEnv = { ...process.env };

function resetState() {
  state.employees = [];
  state.helpTextsYaml = [];
  state.helpTextsPreview = {
    fileHash: "preview-hash",
    summary: { totalItems: 0, createCount: 0, silentOverwriteCount: 0, conflictCount: 0 },
    conflicts: [],
  };
  state.helpTextsApplyResult = {
    createdCount: 0,
    silentOverwrittenCount: 0,
    decisionOverwrittenCount: 0,
    skippedCount: 0,
  };
  state.productCategories = [];
  state.componentCategories = [];
  state.products = [];
  state.components = [];
  state.noteTemplates = [];
  state.tags = [];
  state.ids = {
    employee: 1,
    productCategory: 1,
    componentCategory: 1,
    product: 1,
    component: 1,
    noteTemplate: 1,
    tag: 1,
  };
}

async function setupExternalSeedRoot() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mugplan-seed-services-unit-"));
  process.env = {
    ...originalEnv,
    NODE_ENV: "test",
    ATTACHMENT_STORAGE_PATH: path.join(tempRoot, "uploads"),
    BACKUP_BASE_PATH: path.join(tempRoot, "backups"),
  };
  vi.clearAllMocks();
  vi.resetModules();
  resetState();
  return tempRoot;
}

async function readSeedFile(tempRoot: string, fileName: string) {
  return fs.readFile(path.join(tempRoot, "uploads", "seed", fileName), "utf8");
}

async function writeSeedFile(tempRoot: string, fileName: string, content: string) {
  const seedDirectory = path.join(tempRoot, "uploads", "seed");
  await fs.mkdir(seedDirectory, { recursive: true });
  await fs.writeFile(path.join(seedDirectory, fileName), content, "utf8");
}

describe("FT27 unit: master data seed services", () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await setupExternalSeedRoot();
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    vi.resetModules();
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("exports and applies employees without duplicate creation", async () => {
    state.employees = [
      { id: 1, firstName: "Ada", lastName: "Lovelace", isActive: true, version: 1 },
    ];
    state.ids.employee = 2;

    const { exportEmployeesSeed, applyEmployeesSeed } = await import("../../../server/services/seedEmployeesService");

    await exportEmployeesSeed();
    await expect(readSeedFile(tempRoot, "employees.csv")).resolves.toContain("Ada;Lovelace;true");

    await writeSeedFile(
      tempRoot,
      "employees.csv",
      "Vorname;Nachname;IsActive\nAda;Lovelace;false\nGrace;Hopper;true\n;Leer;true\n",
    );

    const firstRun = await applyEmployeesSeed();
    const secondRun = await applyEmployeesSeed();

    expect(firstRun.logLines).toEqual([
      "Mitarbeiter aktualisiert: Lovelace, Ada",
      "Mitarbeiter angelegt: Hopper, Grace",
      "Mitarbeiter uebersprungen: Vorname/Nachname fehlt",
    ]);
    expect(secondRun.logLines).toContain("Mitarbeiter bereits vorhanden: Hopper, Grace");
    expect(state.employees).toHaveLength(2);
    expect(state.employees.find((entry) => entry.firstName === "Ada")?.isActive).toBe(false);
  });

  it("defaults employee seed rows to active when the IsActive header is missing", async () => {
    state.employees = [
      { id: 1, firstName: "Ada", lastName: "Lovelace", isActive: false, version: 1 },
    ];

    await writeSeedFile(
      tempRoot,
      "employees.csv",
      "Vorname;Nachname\nAda;Lovelace\nGrace;Hopper\n",
    );

    const { applyEmployeesSeed } = await import("../../../server/services/seedEmployeesService");
    await applyEmployeesSeed();

    expect(state.employees.find((entry) => entry.firstName === "Ada")?.isActive).toBe(true);
    expect(state.employees.find((entry) => entry.firstName === "Grace")?.isActive).toBe(true);
  });

  it("reports missing employees seed files", async () => {
    const { applyEmployeesSeed } = await import("../../../server/services/seedEmployeesService");

    await expect(applyEmployeesSeed()).resolves.toEqual({
      sourceFile: "employees.csv",
      exists: false,
      logLines: ["Quelldatei fehlt: employees.csv"],
    });
  });

  it("exports and applies help texts with overwrite decisions", async () => {
    state.helpTextsYaml = [{ help_key: "alpha", title: "Alpha", body: "Body" }];
    state.helpTextsPreview = {
      fileHash: "preview-hash",
      summary: { totalItems: 2, createCount: 1, silentOverwriteCount: 0, conflictCount: 1 },
      conflicts: [{ helpKey: "alpha" }],
    };
    state.helpTextsApplyResult = {
      createdCount: 1,
      silentOverwrittenCount: 0,
      decisionOverwrittenCount: 1,
      skippedCount: 0,
    };

    const { exportHelpTextsSeed, applyHelpTextsSeed } = await import("../../../server/services/seedHelpTextsService");

    await exportHelpTextsSeed();
    await expect(readSeedFile(tempRoot, "helptexts.yaml")).resolves.toContain("help_key: alpha");

    await writeSeedFile(tempRoot, "helptexts.yaml", "- help_key: alpha\n  title: Alpha\n  body: Updated\n");
    const result = await applyHelpTextsSeed();

    expect(previewHelpTextsImportMock).toHaveBeenCalledTimes(1);
    expect(applyHelpTextsImportMock).toHaveBeenCalledWith(expect.any(Buffer), "preview-hash", [
      { helpKey: "alpha", decision: "OVERWRITE" },
    ]);
    expect(result.logLines).toEqual([
      "Hilfetexte importiert: 2",
      "Hilfetexte angelegt: 1",
      "Hilfetexte ueberschrieben: 1",
      "Hilfetexte uebersprungen: 0",
    ]);
  });

  it("propagates help text import errors for invalid files", async () => {
    previewHelpTextsImportMock.mockRejectedValueOnce(new Error("INVALID_IMPORT_FORMAT"));
    await writeSeedFile(tempRoot, "helptexts.yaml", "not: [valid");
    const { applyHelpTextsSeed } = await import("../../../server/services/seedHelpTextsService");

    await expect(applyHelpTextsSeed()).rejects.toThrow("INVALID_IMPORT_FORMAT");
  });

  it("exports and applies product management data with category upserts", async () => {
    state.productCategories = [{ id: 1, name: "Bestehend", isDefault: false, isActive: true, version: 1 }];
    state.componentCategories = [{ id: 1, name: "Vorhanden", isDefault: false, isActive: true, version: 1 }];
    state.products = [{ id: 1, name: "Produkt A", shortCode: "PA", description: "Alt", categoryId: 1, isActive: true, version: 1 }];
    state.components = [{ id: 1, name: "Komponente A", shortCode: "KA", description: "Alt", categoryId: 1, isActive: true, version: 1 }];
    state.ids.productCategory = 2;
    state.ids.componentCategory = 2;
    state.ids.product = 2;
    state.ids.component = 2;

    const { exportProductManagementSeed, applyProductManagementSeed } = await import("../../../server/services/seedProductManagementService");

    await exportProductManagementSeed();
    await expect(readSeedFile(tempRoot, "product-categories.csv")).resolves.toContain("Bestehend;false;true");
    await expect(readSeedFile(tempRoot, "component-categories.csv")).resolves.toContain("Vorhanden;false;true");
    await expect(readSeedFile(tempRoot, "products.csv")).resolves.toContain("Produkt A;PA;Alt;Bestehend");
    await expect(readSeedFile(tempRoot, "components.csv")).resolves.toContain("Komponente A;KA;Alt;Vorhanden");

    await writeSeedFile(
      tempRoot,
      "product-categories.csv",
      "Name;IsDefault;IsActive\nNeue Kategorie;true;true\nBestehend;false;true\nInaktive Kategorie;false;false\n",
    );
    await writeSeedFile(
      tempRoot,
      "component-categories.csv",
      "Name;IsDefault;IsActive\nNeue Komponentenkategorie;true;true\nVorhanden;false;true\nInaktive Komponentenkategorie;false;false\n",
    );
    await writeSeedFile(
      tempRoot,
      "products.csv",
      "Name;ShortCode;Beschreibung;Kategorie\nProdukt A;PX;Neu;Neue Kategorie\nProdukt B;PB;Beschreibung B;Neue Kategorie\n;LX;Leer;Ignoriert\n",
    );
    await writeSeedFile(
      tempRoot,
      "components.csv",
      "Name;ShortCode;Beschreibung;Kategorie\nKomponente A;KX;Neu;Neue Komponentenkategorie\nKomponente B;KB;Beschreibung B;Neue Komponentenkategorie\n",
    );

    const firstRun = await applyProductManagementSeed();
    const secondRun = await applyProductManagementSeed();

    expect(firstRun.logLines).toContain("Produkt aktualisiert: Produkt A");
    expect(firstRun.logLines).toContain("Produkt angelegt: Produkt B");
    expect(firstRun.logLines).toContain("Produkt uebersprungen: Name fehlt");
    expect(firstRun.logLines).toContain("Komponente aktualisiert: Komponente A");
    expect(firstRun.logLines).toContain("Komponente angelegt: Komponente B");
    expect(state.products.filter((entry) => entry.name === "Produkt B")).toHaveLength(1);
    expect(state.products.find((entry) => entry.name === "Produkt A")?.shortCode).toBe("PX");
    expect(state.components.find((entry) => entry.name === "Komponente B")?.shortCode).toBe("KB");
    expect(secondRun.logLines).toContain("Produkt aktualisiert: Produkt B");
    expect(state.productCategories.some((entry) => entry.name === "Neue Kategorie" && entry.isDefault)).toBe(true);
    expect(state.componentCategories.some((entry) => entry.name === "Neue Komponentenkategorie" && entry.isDefault)).toBe(true);
  });

  it("defaults product and component seed rows to active when the Is Active header is missing", async () => {
    state.productCategories = [{ id: 1, name: "Kategorie A", isDefault: true, isActive: true, version: 1 }];
    state.componentCategories = [{ id: 1, name: "Kategorie B", isDefault: true, isActive: true, version: 1 }];
    state.products = [{ id: 1, name: "Produkt A", shortCode: null, description: "Alt", categoryId: 1, isActive: false, version: 1 }];
    state.components = [{ id: 1, name: "Komponente A", shortCode: null, description: "Alt", categoryId: 1, isActive: false, version: 1 }];
    state.ids.product = 2;
    state.ids.component = 2;

    await writeSeedFile(
      tempRoot,
      "product-categories.csv",
      "Name;IsDefault;IsActive\nKategorie A;true;true\n",
    );
    await writeSeedFile(
      tempRoot,
      "component-categories.csv",
      "Name;IsDefault;IsActive\nKategorie B;true;true\n",
    );
    await writeSeedFile(
      tempRoot,
      "products.csv",
      "Name;Beschreibung;Kategorie\nProdukt A;Neu;Kategorie A\nProdukt B;Beschreibung B;Kategorie A\n",
    );
    await writeSeedFile(
      tempRoot,
      "components.csv",
      "Name;Beschreibung;Kategorie\nKomponente A;Neu;Kategorie B\nKomponente B;Beschreibung B;Kategorie B\n",
    );

    const { applyProductManagementSeed } = await import("../../../server/services/seedProductManagementService");
    await applyProductManagementSeed();

    expect(state.products.find((entry) => entry.name === "Produkt A")?.isActive).toBe(true);
    expect(state.products.find((entry) => entry.name === "Produkt B")?.isActive).toBe(true);
    expect(state.components.find((entry) => entry.name === "Komponente A")?.isActive).toBe(true);
    expect(state.components.find((entry) => entry.name === "Komponente B")?.isActive).toBe(true);
  });

  it("reports missing product management files and surfaces malformed csv", async () => {
    const { applyProductManagementSeed } = await import("../../../server/services/seedProductManagementService");

    await expect(applyProductManagementSeed()).resolves.toEqual(
      expect.objectContaining({
        sourceFile: "product-categories.csv",
        exists: false,
        logLines: expect.arrayContaining([
          "Quelldatei fehlt: product-categories.csv",
          "Quelldatei fehlt: component-categories.csv",
          "Quelldatei fehlt: products.csv",
          "Quelldatei fehlt: components.csv",
        ]),
      }),
    );

    await writeSeedFile(tempRoot, "product-categories.csv", "Name;IsDefault;IsActive\nKategorie A;true;true\n");
    await writeSeedFile(tempRoot, "component-categories.csv", "Name;IsDefault;IsActive\nKategorie B;true;true\n");
    await writeSeedFile(tempRoot, "products.csv", "Name;Beschreibung;Kategorie\n\"offen;kaputt;Kategorie\n");
    await writeSeedFile(tempRoot, "components.csv", "Name;Beschreibung;Kategorie\nKomponente;Okay;Kategorie\n");

    await expect(applyProductManagementSeed()).rejects.toThrow("INVALID_CSV_FORMAT");
  });

  it("rejects product rows that reference unknown categories", async () => {
    await writeSeedFile(tempRoot, "product-categories.csv", "Name;IsDefault;IsActive\nKategorie A;true;true\n");
    await writeSeedFile(tempRoot, "component-categories.csv", "Name;IsDefault;IsActive\nKategorie B;true;true\n");
    await writeSeedFile(tempRoot, "products.csv", "Name;Beschreibung;Kategorie\nProdukt A;Neu;Unbekannt\n");

    const { applyProductManagementSeed } = await import("../../../server/services/seedProductManagementService");

    await expect(applyProductManagementSeed()).rejects.toThrow("Produkt Produkt A verweist auf unbekannte Kategorie: Unbekannt");
  });

  it("exports and applies note templates with duplicate updates and sort fallback", async () => {
    state.noteTemplates = [{
      id: 1,
      title: "Checkliste",
      body: "Alt",
      cardColor: "#111111",
      print: true,
      sortOrder: 7,
      isActive: true,
      version: 1,
    }];
    state.ids.noteTemplate = 2;

    const { exportNoteTemplatesSeed, applyNoteTemplatesSeed } = await import("../../../server/services/seedNoteTemplatesService");

    await exportNoteTemplatesSeed();
    await expect(readSeedFile(tempRoot, "notetemplates.csv")).resolves.toContain("Checkliste;Alt;#111111;true;7;true");

    await writeSeedFile(
      tempRoot,
      "notetemplates.csv",
      "Titel;Inhalt;Farbe;Drucken;Sortierreihenfolge;Status\nCheckliste;Neu;#222222;nein;kaputt;false\nNeu;Body;;ja;5;true\n;Leer;;false;0;false\n",
    );

    const result = await applyNoteTemplatesSeed();

    expect(result.logLines).toEqual([
      "Notiz Vorlage aktualisiert: Checkliste",
      "Notiz Vorlage angelegt: Neu",
      "Notiz Vorlage uebersprungen: Titel fehlt",
    ]);
    expect(state.noteTemplates.find((entry) => entry.title === "Checkliste")?.sortOrder).toBe(7);
    expect(state.noteTemplates.find((entry) => entry.title === "Checkliste")?.print).toBe(false);
  });

  it("defaults note template seed rows to active when the Status header is missing", async () => {
    state.noteTemplates = [{
      id: 1,
      title: "Checkliste",
      body: "Alt",
      cardColor: "#111111",
      print: true,
      sortOrder: 7,
      isActive: false,
      version: 1,
    }];

    await writeSeedFile(
      tempRoot,
      "notetemplates.csv",
      "Titel;Inhalt;Farbe;Drucken;Sortierreihenfolge\nCheckliste;Neu;#222222;nein;3\nNeu;Body;;ja;5\n",
    );

    const { applyNoteTemplatesSeed } = await import("../../../server/services/seedNoteTemplatesService");
    await applyNoteTemplatesSeed();

    expect(state.noteTemplates.find((entry) => entry.title === "Checkliste")?.isActive).toBe(true);
    expect(state.noteTemplates.find((entry) => entry.title === "Neu")?.isActive).toBe(true);
  });

  it("exports and applies tags from the temp seed directory without duplicate creation", async () => {
    state.tags = [{
      id: 1,
      name: "Bestehend",
      color: "#111111",
      isDefault: false,
      version: 1,
    }];
    state.ids.tag = 2;

    const { exportTagsSeed, applyTagsSeed } = await import("../../../server/services/seedTagsService");

    await exportTagsSeed();
    await expect(readSeedFile(tempRoot, "tags.csv")).resolves.toContain("Bestehend;#111111");
    await expect(readSeedFile(tempRoot, "tags.csv")).resolves.not.toContain(RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME);
    await expect(readSeedFile(tempRoot, "tags.csv")).resolves.not.toContain(MANAGED_REPORT_EXCLUSION_TAG_NAME);

    await writeSeedFile(
      tempRoot,
      "tags.csv",
      `Name;Farbe\nBestehend;#222222\nNeu;\n${RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME};#000000\n${MANAGED_REPORT_EXCLUSION_TAG_NAME};#000000\n;#333333\n`,
    );

    const firstRun = await applyTagsSeed();
    const secondRun = await applyTagsSeed();

    expect(firstRun.logLines).toEqual([
      "Tag aktualisiert: Bestehend",
      "Tag angelegt: Neu",
      `System-Tag uebersprungen: ${RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME}`,
      `System-Tag uebersprungen: ${MANAGED_REPORT_EXCLUSION_TAG_NAME}`,
      "Tag uebersprungen: Name fehlt",
    ]);
    expect(secondRun.logLines).toContain("Tag aktualisiert: Neu");
    expect(secondRun.logLines).toContain(`System-Tag uebersprungen: ${RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME}`);
    expect(secondRun.logLines).toContain(`System-Tag uebersprungen: ${MANAGED_REPORT_EXCLUSION_TAG_NAME}`);
    expect(state.tags).toHaveLength(4);
    expect(state.tags.find((entry) => entry.name === "Bestehend")?.color).toBe("#222222");
    expect(state.tags.find((entry) => entry.name === "Neu")?.color).toBe("#2563eb");
    expect(state.tags.find((entry) => entry.name === RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME)).toMatchObject({
      color: RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR,
      isDefault: true,
    });
    expect(state.tags.find((entry) => entry.name === MANAGED_REPORT_EXCLUSION_TAG_NAME)).toMatchObject({
      color: MANAGED_REPORT_EXCLUSION_TAG_COLOR,
      isDefault: true,
    });
  });

  it("reports missing tag seed files", async () => {
    const { applyTagsSeed } = await import("../../../server/services/seedTagsService");

    await expect(applyTagsSeed()).resolves.toEqual({
      sourceFile: "tags.csv",
      exists: false,
      logLines: ["Quelldatei fehlt: tags.csv"],
    });
  });
});
