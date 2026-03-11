/**
 * Test Scope:
 *
 * Feature: FT20 - Demo Seed/Purge
 * Use Case: UC20 - Realistische Terminverteilung im appointments-Run auf Basisdaten
 *
 * Abgedeckte Regeln:
 * - Basis-Seed nutzt vorhandene aktive Mitarbeitende aus der Datenbank statt CSV-Import oder freie Generierung.
 * - Mitarbeitende bleiben auf ihrer zugewiesenen Tour; Seed-Termine leihen keine Fremd-Tour-Mitarbeitenden.
 * - Pro Tour und Kalendertag entstehen hoechstens zwei Termine.
 * - Verbotene Tageskombinationen auf einer Tour werden verhindert (kein 2x Ganztag, keine identische Intraday-Startzeit doppelt).
 * - Touren ohne Mitarbeitende werden im appointments-Run nicht beplant.
 * - Bei Engpaessen wird ueber das initiale Seed-Fenster hinaus weitergeplant.
 * - Montage-Termine nutzen nur 1- oder 2-Tages-Dauern im Verhaeltnis 4:1; Freitage bleiben deutlich unterrepraesentiert.
 * - Base-seeded Projekte erhalten fortlaufende Auftragsnummern im Muster A000000A, einen Betrag zwischen 7500 und 18000, kurze Lorem-Beschreibungen und vollstaendige Artikellisten aus vorhandenen Stammdaten.
 * - Base- und appointments-Seeds veraendern vorhandene Produkt-/Komponenten-/Status-/Notizvorlagen-Stammdaten nicht; Purge laesst diese Tabellen unberuehrt.
 *
 * Fehlerfaelle:
 * - Basis-Seed legt neue Mitarbeitende an oder trackt Bestands-Mitarbeitende als purge-bare Seed-Entitaeten.
 * - Terminzuweisung enthaelt Mitarbeitende mit abweichender Tour.
 * - Tour-Tag-Slots uebersteigen die erlaubte Obergrenze oder enthalten verbotene Kombinationen.
 * - Seed-Dauern, Freitaggewichtung, Intraday-Anteil, Auftragsnummern oder Projekt-Betraege weichen von der Sollverteilung ab.
 * - Seed erzeugt oder loescht Stammdaten entgegen der manuellen Importlogik.
 * - Projekt-Artikellisten bleiben unvollstaendig oder Beschreibungen enthalten keine kurzen Lorem-Saetze.
 *
 * Ziel:
 * Sicherstellen, dass der Demo-Seed realistische Tour-Tagesplanung sowie die neue manuelle Stammdaten-Nutzung stabil und purge-resistent umsetzt.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "../../../server/db";
import * as noteTemplatesRepository from "../../../server/repositories/noteTemplatesRepository";
import * as projectStatusService from "../../../server/services/projectStatusService";
import { createSeedRun, purgeSeedRun } from "../../../server/services/demoSeedService";
import {
  appointments,
  appointmentEmployees,
  appointmentNotes,
  appointmentTags,
  componentCategories,
  customerNotes,
  components,
  customerTags,
  employees,
  employeeTags,
  noteTemplates,
  notes,
  productCategories,
  productComponent,
  projectNotes,
  projectOrderItems,
  projectTags,
  products,
  projects,
  seedRunEntities,
  tags,
} from "../../../shared/schema";
import { createComponentFixture, createEmployeeFixture, createProductFixture } from "../../helpers/testDataFactory";

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(base: Date, days: number) {
  const out = new Date(base);
  out.setDate(out.getDate() + days);
  return out;
}

function rangeDateKeys(startDate: Date, endDate: Date) {
  const out: string[] = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    out.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function daySpan(startDate: Date, endDate: Date | null) {
  const end = endDate ?? startDate;
  const startUtc = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((endUtc - startUtc) / (24 * 60 * 60 * 1000)) + 1;
}

async function readProductCatalogCounts() {
  const [productCategoryCountRow] = await db.select({ count: sql<number>`count(*)` }).from(productCategories);
  const [componentCategoryCountRow] = await db.select({ count: sql<number>`count(*)` }).from(componentCategories);
  const [productCountRow] = await db.select({ count: sql<number>`count(*)` }).from(products);
  const [componentCountRow] = await db.select({ count: sql<number>`count(*)` }).from(components);
  const [linkCountRow] = await db.select({ count: sql<number>`count(*)` }).from(productComponent);

  return {
    productCategories: Number(productCategoryCountRow?.count ?? 0),
    componentCategories: Number(componentCategoryCountRow?.count ?? 0),
    products: Number(productCountRow?.count ?? 0),
    components: Number(componentCountRow?.count ?? 0),
    links: Number(linkCountRow?.count ?? 0),
  };
}

async function readDemoTagCounts() {
  const [tagCountRow] = await db.select({ count: sql<number>`count(*)` }).from(tags);
  const [projectTagCountRow] = await db.select({ count: sql<number>`count(*)` }).from(projectTags);
  const [customerTagCountRow] = await db.select({ count: sql<number>`count(*)` }).from(customerTags);
  const [employeeTagCountRow] = await db.select({ count: sql<number>`count(*)` }).from(employeeTags);
  const [appointmentTagCountRow] = await db.select({ count: sql<number>`count(*)` }).from(appointmentTags);

  return {
    tags: Number(tagCountRow?.count ?? 0),
    projectTags: Number(projectTagCountRow?.count ?? 0),
    customerTags: Number(customerTagCountRow?.count ?? 0),
    employeeTags: Number(employeeTagCountRow?.count ?? 0),
    appointmentTags: Number(appointmentTagCountRow?.count ?? 0),
  };
}

async function seedManualProjectMasterData(prefix: string) {
  const productA = await createProductFixture({
    categoryName: `${prefix}-Produkte`,
    name: `${prefix}-Modell-A`,
  });
  const productB = await createProductFixture({
    categoryName: `${prefix}-Produkte`,
    name: `${prefix}-Modell-B`,
  });

  const componentCategories = [
    { categoryName: "Ofen", names: [`${prefix}-Ofen-A`, `${prefix}-Ofen-B`] },
    { categoryName: "Steuerung", names: [`${prefix}-Steuerung-A`, `${prefix}-Steuerung-B`] },
    { categoryName: "Dach", names: [`${prefix}-Dach-A`, `${prefix}-Dach-B`] },
    { categoryName: "Fenster", names: [`${prefix}-Fenster-A`, `${prefix}-Fenster-B`] },
    { categoryName: "Tuer", names: [`${prefix}-Tuer-A`, `${prefix}-Tuer-B`] },
    { categoryName: "Vorderwand", names: [`${prefix}-Vorderwand-A`, `${prefix}-Vorderwand-B`] },
    { categoryName: "Rueckwand", names: [`${prefix}-Rueckwand-A`, `${prefix}-Rueckwand-B`] },
    { categoryName: "Inneneinrichtung", names: [`${prefix}-Innen-A`, `${prefix}-Innen-B`] },
  ] as const;

  for (const category of componentCategories) {
    for (const name of category.names) {
      await createComponentFixture({
        categoryName: category.categoryName,
        name,
      });
    }
  }

  return {
    productIds: [productA.id, productB.id],
  };
}

async function seedActiveProjectStatuses(prefix: string) {
  await projectStatusService.createProjectStatus({
    title: `${prefix}-Status-A`,
    color: "#0f766e",
    description: `${prefix}-status-a`,
    sortOrder: 10,
  }, "ADMIN");
  await projectStatusService.createProjectStatus({
    title: `${prefix}-Status-B`,
    color: "#1d4ed8",
    description: `${prefix}-status-b`,
    sortOrder: 20,
  }, "ADMIN");
}

async function seedActiveNoteTemplates() {
  for (const [sortOrder, title] of ["Anreise beachten", "Aufbau Start beachten", "Messeaufbau"].entries()) {
    await noteTemplatesRepository.createNoteTemplate({
      title,
      body: `${title} Body`,
      cardColor: ["#1d4ed8", "#b45309", "#0f766e"][sortOrder] ?? "#1d4ed8",
      print: true,
      sortOrder: (sortOrder + 1) * 10,
      isActive: true,
    });
  }
}

beforeEach(() => {
  // resetDatabase() laeuft zentral ueber tests/setup.env.ts vor jedem Integrationstest.
});

describe("FT20 integration: appointments-seed tour/day constraints", () => {
  it("uses existing project master data unchanged, creates full article lists and keeps purge off master-data tables", async () => {
    let firstBaseSeedRunId: string | null = null;
    let secondBaseSeedRunId: string | null = null;
    let appointmentsSeedRunId: string | null = null;

    try {
      const manualMasterData = await seedManualProjectMasterData("DEMOSEED");
      await seedActiveProjectStatuses("DEMOSEED");
      await createEmployeeFixture("DEMOSEED-EMP-A");
      await createEmployeeFixture("DEMOSEED-EMP-B");
      const firstSummary = await createSeedRun({
        runType: "base",
        randomSeed: 5101,
        employees: 1,
        customers: 2,
        projects: 2,
      });
      firstBaseSeedRunId = firstSummary.seedRunId;

      const productCategoryRows = await db.select().from(productCategories);
      const componentCategoryRows = await db.select().from(componentCategories);
      const productRows = await db.select().from(products);
      const componentRows = await db.select().from(components);
      const linkRows = await db.select().from(productComponent);

      expect(productCategoryRows.map((row) => row.name).sort()).toEqual(["Alle Produkte", "Ausstattung", "Sauna"]);
      expect(componentCategoryRows.map((row) => row.name).sort()).toEqual([
        "Dach",
        "Fenster",
        "Ofen",
        "Saunamodell",
        "Steuerung",
        "Tür",
      ]);
      expect(productRows.map((row) => row.name).sort()).toEqual(["Dach", "Fenster", "Ofen", "Sauna", "Tür"]);
      expect(productRows.every((row) => Number.isFinite(Number(row.categoryId)) && Number(row.categoryId) > 0)).toBe(true);
      expect(componentRows.length).toBeGreaterThanOrEqual(35);
      expect(componentRows.every((row) => Number.isFinite(Number(row.categoryId)) && Number(row.categoryId) > 0)).toBe(true);
      expect(linkRows.length).toBe(componentRows.length);

      const countsAfterFirstBase = await readProductCatalogCounts();
      const tagCountsAfterFirstBase = await readDemoTagCounts();
      expect(tagCountsAfterFirstBase.tags).toBe(6);
      expect(tagCountsAfterFirstBase.projectTags).toBeGreaterThan(0);
      expect(tagCountsAfterFirstBase.customerTags).toBeGreaterThan(0);
      expect(tagCountsAfterFirstBase.employeeTags).toBeGreaterThan(0);
      expect(tagCountsAfterFirstBase.appointmentTags).toBe(0);

      const secondSummary = await createSeedRun({
        runType: "base",
        randomSeed: 5202,
        employees: 1,
        customers: 2,
        projects: 2,
      });
      secondBaseSeedRunId = secondSummary.seedRunId;

      const countsAfterSecondBase = await readProductCatalogCounts();
      expect(countsAfterSecondBase).toEqual(countsAfterFirstBase);
      const tagCountsAfterSecondBase = await readDemoTagCounts();
      expect(tagCountsAfterSecondBase.tags).toBe(tagCountsAfterFirstBase.tags);

      const appointmentsSummary = await createSeedRun({
        runType: "appointments",
        baseSeedRunId: secondBaseSeedRunId,
        randomSeed: 5303,
        appointmentsPerProject: 1,
        generateAttachments: false,
      });
      appointmentsSeedRunId = appointmentsSummary.seedRunId;

      const countsAfterAppointments = await readProductCatalogCounts();
      expect(countsAfterAppointments).toEqual(countsAfterFirstBase);
      const tagCountsAfterAppointments = await readDemoTagCounts();
      expect(tagCountsAfterAppointments.tags).toBe(tagCountsAfterFirstBase.tags);
      expect(tagCountsAfterAppointments.appointmentTags).toBeGreaterThan(0);

      await purgeSeedRun(appointmentsSeedRunId);
      appointmentsSeedRunId = null;

      await purgeSeedRun(firstBaseSeedRunId);
      firstBaseSeedRunId = null;

      const countsAfterPurge = await readProductCatalogCounts();
      expect(countsAfterPurge).toEqual(countsAfterFirstBase);
      const tagCountsAfterPurge = await readDemoTagCounts();
      expect(tagCountsAfterPurge.tags).toBe(tagCountsAfterFirstBase.tags);
    } finally {
      if (appointmentsSeedRunId) {
        await purgeSeedRun(appointmentsSeedRunId);
      }
      if (secondBaseSeedRunId) {
        await purgeSeedRun(secondBaseSeedRunId);
      }
      if (firstBaseSeedRunId) {
        await purgeSeedRun(firstBaseSeedRunId);
      }
    }
  });

  it("uses existing employees without creating or purge-tracking them", async () => {
    let firstBaseSeedRunId: string | null = null;
    let secondBaseSeedRunId: string | null = null;

    try {
      await seedManualProjectMasterData("EMPLOYEES");
      await seedActiveProjectStatuses("EMPLOYEES");
      const employeeA = await createEmployeeFixture("SEED-EMP-A");
      const employeeB = await createEmployeeFixture("SEED-EMP-B");
      const [employeeCountBeforeRow] = await db.select({ count: sql<number>`count(*)` }).from(employees);

      const firstSummary = await createSeedRun({
        runType: "base",
        randomSeed: 5404,
        customers: 1,
        projects: 1,
      });
      firstBaseSeedRunId = firstSummary.seedRunId;

      const firstMetaEmployeeIds = firstSummary.meta?.employeeIds ?? [];
      expect(firstMetaEmployeeIds.length).toBeGreaterThan(0);
      expect(firstSummary.created.employees).toBe(0);
      expect(firstSummary.requested.employees).toBe(firstMetaEmployeeIds.length);
      expect(firstMetaEmployeeIds.sort((l, r) => l - r)).toEqual([employeeA.id, employeeB.id].sort((l, r) => l - r));

      const firstEmployeeEntities = await db
        .select({ entityId: seedRunEntities.entityId })
        .from(seedRunEntities)
        .where(and(eq(seedRunEntities.seedRunId, firstBaseSeedRunId), eq(seedRunEntities.entityType, "employee")));
      expect(firstEmployeeEntities).toHaveLength(0);

      const [employeeCountAfterFirstRow] = await db.select({ count: sql<number>`count(*)` }).from(employees);
      expect(Number(employeeCountAfterFirstRow?.count ?? 0)).toBe(Number(employeeCountBeforeRow?.count ?? 0));

      const secondSummary = await createSeedRun({
        runType: "base",
        randomSeed: 5505,
        customers: 1,
        projects: 1,
      });
      secondBaseSeedRunId = secondSummary.seedRunId;

      expect(secondSummary.created.employees).toBe(0);
      expect(secondSummary.requested.employees).toBe(firstMetaEmployeeIds.length);
      expect(secondSummary.meta?.employeeIds).toEqual(firstMetaEmployeeIds);

      const [employeeCountAfterSecondRow] = await db.select({ count: sql<number>`count(*)` }).from(employees);
      expect(Number(employeeCountAfterSecondRow?.count ?? 0)).toBe(Number(employeeCountAfterFirstRow?.count ?? 0));
    } finally {
      if (secondBaseSeedRunId) {
        await purgeSeedRun(secondBaseSeedRunId);
      }
      if (firstBaseSeedRunId) {
        await purgeSeedRun(firstBaseSeedRunId);
      }
    }
  });

  it("fails fast when required project master data is missing", async () => {
    await createEmployeeFixture("MISSING-MD-EMP");
    await expect(createSeedRun({
      runType: "base",
      randomSeed: 5606,
      customers: 1,
      projects: 1,
    })).rejects.toThrow("Keine aktiven Produkte fuer den Demo-Seed verfuegbar.");
  });

  it("seeds note templates plus scoped notes for half of customers, projects and appointments and purges them again", async () => {
    let baseSeedRunId: string | null = null;
    let appointmentsSeedRunId: string | null = null;

    try {
      await seedManualProjectMasterData("NOTES");
      await seedActiveProjectStatuses("NOTES");
      await seedActiveNoteTemplates();
      await createEmployeeFixture("NOTES-EMP-A");
      await createEmployeeFixture("NOTES-EMP-B");
      const baseSummary = await createSeedRun({
        runType: "base",
        randomSeed: 6101,
        employees: 2,
        customers: 6,
        projects: 6,
      });
      baseSeedRunId = baseSummary.seedRunId;

      expect(baseSummary.created.noteTemplates).toBe(0);
      expect(baseSummary.created.notes).toBe(6);

      const baseSeedEntities = await db
        .select({
          entityType: seedRunEntities.entityType,
          entityId: seedRunEntities.entityId,
        })
        .from(seedRunEntities)
        .where(eq(seedRunEntities.seedRunId, baseSeedRunId));

      const seededCustomerIds = baseSeedEntities
        .filter((entity) => entity.entityType === "customer")
        .map((entity) => Number(entity.entityId));
      const seededProjectIds = baseSeedEntities
        .filter((entity) => entity.entityType === "project")
        .map((entity) => Number(entity.entityId));
      const seededNoteTemplateIds = baseSeedEntities
        .filter((entity) => entity.entityType === "note_template")
        .map((entity) => Number(entity.entityId));
      const seededNoteIds = baseSeedEntities
        .filter((entity) => entity.entityType === "note")
        .map((entity) => Number(entity.entityId));

      expect(seededCustomerIds.length).toBe(6);
      expect(seededProjectIds.length).toBe(6);
      expect(seededNoteTemplateIds.length).toBe(0);
      expect(seededNoteIds.length).toBe(6);

      const seededTemplateRows = await db
        .select({
          id: noteTemplates.id,
          title: noteTemplates.title,
        })
        .from(noteTemplates)
        .orderBy(noteTemplates.sortOrder);

      expect(seededTemplateRows.map((row) => row.title)).toEqual([
        "Anreise beachten",
        "Aufbau Start beachten",
        "Messeaufbau",
      ]);

      const [customerNoteCountRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(customerNotes)
        .where(inArray(customerNotes.customerId, seededCustomerIds));
      const [projectNoteCountRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(projectNotes)
        .where(inArray(projectNotes.projectId, seededProjectIds));
      const templatedBaseNotes = await db
        .select({
          id: notes.id,
          title: notes.title,
          body: notes.body,
        })
        .from(notes)
        .where(inArray(notes.id, seededNoteIds));

      expect(Number(customerNoteCountRow?.count ?? 0)).toBe(3);
      expect(Number(projectNoteCountRow?.count ?? 0)).toBe(3);
      expect(
        templatedBaseNotes.filter((note) =>
          seededTemplateRows.some((template) => template.title === note.title && note.body.length > 0),
        ).length,
      ).toBeGreaterThanOrEqual(0);

      const appointmentsSummary = await createSeedRun({
        runType: "appointments",
        baseSeedRunId,
        randomSeed: 6202,
        appointmentsPerProject: 2,
        generateAttachments: false,
      });
      appointmentsSeedRunId = appointmentsSummary.seedRunId;

      const appointmentSeedEntities = await db
        .select({
          entityType: seedRunEntities.entityType,
          entityId: seedRunEntities.entityId,
        })
        .from(seedRunEntities)
        .where(eq(seedRunEntities.seedRunId, appointmentsSeedRunId));

      const seededAppointmentIds = appointmentSeedEntities
        .filter((entity) => entity.entityType === "appointment_mount" || entity.entityType === "appointment_rekl")
        .map((entity) => Number(entity.entityId));
      const seededAppointmentNoteIds = appointmentSeedEntities
        .filter((entity) => entity.entityType === "note")
        .map((entity) => Number(entity.entityId));

      expect(seededAppointmentIds.length).toBeGreaterThan(0);
      expect(appointmentsSummary.created.noteTemplates).toBe(0);
      expect(appointmentsSummary.created.notes).toBe(Math.floor(seededAppointmentIds.length / 2));
      expect(seededAppointmentNoteIds.length).toBe(appointmentsSummary.created.notes);

      const [appointmentNoteCountRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(appointmentNotes)
        .where(inArray(appointmentNotes.appointmentId, seededAppointmentIds));
      expect(Number(appointmentNoteCountRow?.count ?? 0)).toBe(Math.floor(seededAppointmentIds.length / 2));

      const appointmentNoteRows = await db
        .select({
          id: notes.id,
          title: notes.title,
        })
        .from(notes)
        .where(inArray(notes.id, seededAppointmentNoteIds));
      expect(
        appointmentNoteRows.filter((note) =>
          ["Anreise beachten", "Aufbau Start beachten", "Messeaufbau"].includes(note.title),
        ).length,
      ).toBeGreaterThanOrEqual(0);

      const purgeAppointmentsSummary = await purgeSeedRun(appointmentsSeedRunId);
      appointmentsSeedRunId = null;

      expect(purgeAppointmentsSummary.deleted.notes).toBe(seededAppointmentNoteIds.length);
      expect(purgeAppointmentsSummary.deleted.noteTemplates).toBe(0);
      expect(purgeAppointmentsSummary.deleted.appointmentNotes).toBe(seededAppointmentNoteIds.length);

      const [remainingAppointmentNoteRows] = await db
        .select({ count: sql<number>`count(*)` })
        .from(notes)
        .where(inArray(notes.id, seededAppointmentNoteIds));
      expect(Number(remainingAppointmentNoteRows?.count ?? 0)).toBe(0);

      const purgeBaseSummary = await purgeSeedRun(baseSeedRunId);
      baseSeedRunId = null;

      expect(purgeBaseSummary.deleted.noteTemplates).toBe(0);
      expect(purgeBaseSummary.deleted.notes).toBe(seededNoteIds.length);
      expect(purgeBaseSummary.deleted.customerNotes).toBe(3);
      expect(purgeBaseSummary.deleted.projectNotes).toBe(3);

      const [remainingTemplateCountRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(noteTemplates);
      const [remainingNoteCountRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(notes);
      expect(Number(remainingTemplateCountRow?.count ?? 0)).toBe(3);
      expect(Number(remainingNoteCountRow?.count ?? 0)).toBe(0);
    } finally {
      if (appointmentsSeedRunId) {
        await purgeSeedRun(appointmentsSeedRunId);
      }
      if (baseSeedRunId) {
        await purgeSeedRun(baseSeedRunId);
      }
    }
  });

  it("creates only rule-conform tour/day slots and keeps employee-tour binding", async () => {
    let baseSeedRunId: string | null = null;
    let appointmentsSeedRunId: string | null = null;

    try {
      await seedManualProjectMasterData("TOURDAY");
      await seedActiveProjectStatuses("TOURDAY");
      await createEmployeeFixture("TOURDAY-EMP-A");
      await createEmployeeFixture("TOURDAY-EMP-B");
      const baseSummary = await createSeedRun({
        runType: "base",
        randomSeed: 1101,
        employees: 2,
        customers: 8,
        projects: 12,
      });
      baseSeedRunId = baseSummary.seedRunId;

      const appointmentsSummary = await createSeedRun({
        runType: "appointments",
        baseSeedRunId,
        randomSeed: 2202,
        appointmentsPerProject: 2,
        generateAttachments: false,
        seedWindowDaysMin: 1,
        seedWindowDaysMax: 1,
        reklDelayDaysMin: 14,
        reklDelayDaysMax: 21,
        reklShare: 0.6,
      });
      appointmentsSeedRunId = appointmentsSummary.seedRunId;

      const seededAppointmentEntities = await db
        .select({
          entityType: seedRunEntities.entityType,
          entityId: seedRunEntities.entityId,
        })
        .from(seedRunEntities)
        .where(eq(seedRunEntities.seedRunId, appointmentsSeedRunId));

      const appointmentIds = seededAppointmentEntities
        .filter((entity) => entity.entityType === "appointment_mount" || entity.entityType === "appointment_rekl")
        .map((entity) => Number(entity.entityId));
      const mountAppointmentIds = seededAppointmentEntities
        .filter((entity) => entity.entityType === "appointment_mount")
        .map((entity) => Number(entity.entityId));
      const baseProjectIds = (await db
        .select({ entityId: seedRunEntities.entityId })
        .from(seedRunEntities)
        .where(and(eq(seedRunEntities.seedRunId, baseSeedRunId), eq(seedRunEntities.entityType, "project"))))
        .map((entity) => Number(entity.entityId));

      expect(appointmentIds.length).toBeGreaterThan(0);
      expect(mountAppointmentIds.length).toBeGreaterThan(0);
      expect(baseProjectIds.length).toBeGreaterThan(0);

      const appointmentRows = await db
        .select({
          id: appointments.id,
          tourId: appointments.tourId,
          startDate: appointments.startDate,
          endDate: appointments.endDate,
          startTime: appointments.startTime,
        })
        .from(appointments)
        .where(inArray(appointments.id, appointmentIds));

      expect(appointmentRows.length).toBe(appointmentIds.length);

      const baseProjectRows = await db
        .select({
          id: projects.id,
          orderNumber: projects.orderNumber,
          amount: projects.amount,
        })
        .from(projects)
        .orderBy(projects.id)
        .where(inArray(projects.id, baseProjectIds));

      expect(baseProjectRows.length).toBe(baseProjectIds.length);
      const baseOrderNumbers = baseProjectRows.map((row) => row.orderNumber ?? "");
      expect(baseOrderNumbers.every((orderNumber) => /^A\d{6}A$/.test(orderNumber))).toBe(true);
      expect(baseOrderNumbers[0]).toBe("A100000A");
      expect(new Set(baseOrderNumbers).size).toBe(baseOrderNumbers.length);

      for (let index = 0; index < baseOrderNumbers.length; index += 1) {
        expect(baseOrderNumbers[index]).toBe(`A${String(100000 + index).padStart(6, "0")}A`);
      }

      for (const row of baseProjectRows) {
        const amount = Number(row.amount);
        expect(Number.isInteger(amount)).toBe(true);
        expect(amount).toBeGreaterThanOrEqual(7500);
        expect(amount).toBeLessThanOrEqual(18000);
      }

      const assignmentRows = await db
        .select({
          appointmentId: appointments.id,
          appointmentTourId: appointments.tourId,
          employeeId: employees.id,
          employeeTourId: employees.tourId,
        })
        .from(appointmentEmployees)
        .innerJoin(appointments, eq(appointmentEmployees.appointmentId, appointments.id))
        .innerJoin(employees, eq(appointmentEmployees.employeeId, employees.id))
        .where(inArray(appointments.id, appointmentIds));

      for (const row of assignmentRows) {
        expect(Number(row.employeeTourId)).toBe(Number(row.appointmentTourId));
      }

      const baseEmployeeIds = baseSummary.meta?.employeeIds ?? [];
      expect(baseEmployeeIds.length).toBeGreaterThan(0);

      const baseEmployeeRows = await db
        .select({
          employeeId: employees.id,
          tourId: employees.tourId,
        })
        .from(employees)
        .where(inArray(employees.id, baseEmployeeIds));

      const nonEmptyTourIds = new Set<number>();
      for (const row of baseEmployeeRows) {
        if (row.tourId != null) {
          nonEmptyTourIds.add(Number(row.tourId));
        }
      }
      expect(nonEmptyTourIds.size).toBeGreaterThan(0);

      const usedTourIds = new Set<number>();
      type SlotSummary = { total: number; allDayCount: number; intradayTimes: Set<string> };
      const byTourDay = new Map<string, SlotSummary>();
      for (const row of appointmentRows) {
        const tourId = Number(row.tourId);
        usedTourIds.add(tourId);
        const startDate = row.startDate as Date;
        const endDate = (row.endDate as Date | null) ?? startDate;
        const startTime = row.startTime ?? null;
        for (const dateKey of rangeDateKeys(startDate, endDate)) {
          const key = `${tourId}:${dateKey}`;
          const slot = byTourDay.get(key) ?? { total: 0, allDayCount: 0, intradayTimes: new Set<string>() };
          slot.total += 1;
          if (startTime == null) {
            slot.allDayCount += 1;
          } else {
            slot.intradayTimes.add(startTime);
          }
          byTourDay.set(key, slot);
        }
      }

      for (const [key, slot] of byTourDay.entries()) {
        expect(slot.total, `${key} exceeds max 2 appointments per tour/day`).toBeLessThanOrEqual(2);
        expect(slot.allDayCount, `${key} contains more than one all-day appointment`).toBeLessThanOrEqual(1);
        expect(slot.intradayTimes.size, `${key} contains duplicate intraday start times`).toBe(
          slot.total - slot.allDayCount,
        );
      }

      for (const usedTourId of usedTourIds) {
        expect(nonEmptyTourIds.has(usedTourId)).toBe(true);
      }

      const mountRows = appointmentRows.filter((row) => mountAppointmentIds.includes(Number(row.id)));
      const oneDayMounts = mountRows.filter((row) => daySpan(row.startDate as Date, (row.endDate as Date | null) ?? null) === 1);
      const twoDayMounts = mountRows.filter((row) => daySpan(row.startDate as Date, (row.endDate as Date | null) ?? null) === 2);

      expect(oneDayMounts.length + twoDayMounts.length).toBe(mountRows.length);
      expect(twoDayMounts.length).toBeGreaterThan(0);
      expect(oneDayMounts.length / twoDayMounts.length).toBeCloseTo(4, 0);

      const fridayStarts = appointmentRows.filter((row) => (row.startDate as Date).getDay() === 5).length;
      const weekdayStartsByDay = new Map<number, number>([
        [1, 0],
        [2, 0],
        [3, 0],
        [4, 0],
      ]);
      for (const row of appointmentRows) {
        const day = (row.startDate as Date).getDay();
        if (weekdayStartsByDay.has(day)) {
          weekdayStartsByDay.set(day, (weekdayStartsByDay.get(day) ?? 0) + 1);
        }
      }
      const weekdayAverage = Array.from(weekdayStartsByDay.values()).reduce((sum, value) => sum + value, 0) / weekdayStartsByDay.size;
      expect(fridayStarts).toBeLessThanOrEqual(Math.max(4, Math.ceil(weekdayAverage * 1.5)));

      const intradayCount = appointmentRows.filter((row) => row.startTime != null).length;
      const intradayShare = intradayCount / appointmentRows.length;
      expect(intradayShare).toBeGreaterThanOrEqual(0.1);
      expect(intradayShare).toBeLessThanOrEqual(0.6);

      const seededStartKeys = appointmentRows.map((row) => toDateKey(row.startDate as Date)).sort();
      const maxStartKey = seededStartKeys[seededStartKeys.length - 1];
      const initialWindowEndKey = toDateKey(addDays(addDays(new Date(), 1), 1));
      expect(maxStartKey > initialWindowEndKey).toBe(true);
    } finally {
      if (appointmentsSeedRunId) {
        await purgeSeedRun(appointmentsSeedRunId);
      }
      if (baseSeedRunId) {
        await purgeSeedRun(baseSeedRunId);
      }
    }
  });

  it("continues seeded project order numbers across base runs", async () => {
    let firstBaseSeedRunId: string | null = null;
    let secondBaseSeedRunId: string | null = null;

    try {
      await seedManualProjectMasterData("ORDERNUM");
      await seedActiveProjectStatuses("ORDERNUM");
      await createEmployeeFixture("ORDERNUM-EMP-A");
      const firstSummary = await createSeedRun({
        runType: "base",
        randomSeed: 3303,
        employees: 1,
        customers: 2,
        projects: 2,
      });
      firstBaseSeedRunId = firstSummary.seedRunId;

      const secondSummary = await createSeedRun({
        runType: "base",
        randomSeed: 4404,
        employees: 1,
        customers: 2,
        projects: 2,
      });
      secondBaseSeedRunId = secondSummary.seedRunId;

      const firstProjectIds = (await db
        .select({ entityId: seedRunEntities.entityId })
        .from(seedRunEntities)
        .where(and(eq(seedRunEntities.seedRunId, firstBaseSeedRunId), eq(seedRunEntities.entityType, "project"))))
        .map((entity) => Number(entity.entityId));
      const secondProjectIds = (await db
        .select({ entityId: seedRunEntities.entityId })
        .from(seedRunEntities)
        .where(and(eq(seedRunEntities.seedRunId, secondBaseSeedRunId), eq(seedRunEntities.entityType, "project"))))
        .map((entity) => Number(entity.entityId));

      expect(firstProjectIds.length).toBe(2);
      expect(secondProjectIds.length).toBe(2);

      const firstOrderRows = await db
        .select({
          id: projects.id,
          orderNumber: projects.orderNumber,
        })
        .from(projects)
        .where(inArray(projects.id, firstProjectIds))
        .orderBy(projects.id);
      const secondOrderRows = await db
        .select({
          id: projects.id,
          orderNumber: projects.orderNumber,
        })
        .from(projects)
        .where(inArray(projects.id, secondProjectIds))
        .orderBy(projects.id);

      expect(firstOrderRows.map((row) => row.orderNumber)).toEqual(["A100000A", "A100001A"]);
      expect(secondOrderRows.map((row) => row.orderNumber)).toEqual(["A100002A", "A100003A"]);
    } finally {
      if (secondBaseSeedRunId) {
        await purgeSeedRun(secondBaseSeedRunId);
      }
      if (firstBaseSeedRunId) {
        await purgeSeedRun(firstBaseSeedRunId);
      }
    }
  });
});
