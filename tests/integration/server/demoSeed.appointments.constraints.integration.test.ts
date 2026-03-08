/**
 * Test Scope:
 *
 * Feature: FT20 - Demo Seed/Purge
 * Use Case: UC20 - Realistische Terminverteilung im appointments-Run auf Basisdaten
 *
 * Abgedeckte Regeln:
 * - Mitarbeitende bleiben auf ihrer zugewiesenen Tour; Seed-Termine leihen keine Fremd-Tour-Mitarbeitenden.
 * - Pro Tour und Kalendertag entstehen hoechstens zwei Termine.
 * - Verbotene Tageskombinationen auf einer Tour werden verhindert (kein 2x Ganztag, keine identische Intraday-Startzeit doppelt).
 * - Touren ohne Mitarbeitende werden im appointments-Run nicht beplant.
 * - Bei Engpaessen wird ueber das initiale Seed-Fenster hinaus weitergeplant.
 * - Montage-Termine nutzen nur 1- oder 2-Tages-Dauern im Verhaeltnis 4:1; Freitage bleiben deutlich unterrepraesentiert.
 * - Base-seeded Projekte erhalten fortlaufende Auftragsnummern im Muster A000000A, einen Betrag zwischen 7500 und 18000, und nur ein begrenzter Anteil aller Seed-Termine ist intraday.
 * - Base- und legacy-Seeds befuellen den FT27-Produktkatalog idempotent; Purge laesst die Katalogtabellen unberuehrt.
 *
 * Fehlerfaelle:
 * - Terminzuweisung enthaelt Mitarbeitende mit abweichender Tour.
 * - Tour-Tag-Slots uebersteigen die erlaubte Obergrenze oder enthalten verbotene Kombinationen.
 * - Seed-Dauern, Freitaggewichtung, Intraday-Anteil, Auftragsnummern oder Projekt-Betraege weichen von der Sollverteilung ab.
 * - Produktkatalog wird doppelt angelegt, im appointments-Run veraendert oder beim Purge eines Seed-Runs geloescht.
 *
 * Ziel:
 * Sicherstellen, dass der Demo-Seed realistische Tour-Tagesplanung sowie den FT27-Produktkatalog stabil, idempotent und purge-resistent erzeugt.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { existsSync } from "fs";
import path from "path";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "../../../server/db";
import { createSeedRun, purgeSeedRun } from "../../../server/services/demoSeedService";
import {
  appointments,
  appointmentEmployees,
  appointmentTags,
  componentCategories,
  components,
  customerTags,
  employees,
  employeeTags,
  productCategories,
  productComponent,
  projectTags,
  products,
  projects,
  seedRunEntities,
  tags,
} from "../../../shared/schema";

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

beforeEach(() => {
  // resetDatabase() laeuft zentral ueber tests/setup.env.ts vor jedem Integrationstest.
});

describe("FT20 integration: appointments-seed tour/day constraints", () => {
  const hasRequiredDemoSeedFiles = existsSync(
    path.resolve(process.cwd(), "shared/uploads/demodata/fasssauna_modelle.csv"),
  );

  const itIfDemoSeedFilesPresent = hasRequiredDemoSeedFiles ? it : it.skip;

  itIfDemoSeedFilesPresent("seeds FT27 product catalog once, keeps purge off catalog tables and skips appointments-only runs", async () => {
    let firstBaseSeedRunId: string | null = null;
    let secondBaseSeedRunId: string | null = null;
    let appointmentsSeedRunId: string | null = null;

    try {
      const firstSummary = await createSeedRun({
        runType: "base",
        randomSeed: 5101,
        employees: 1,
        customers: 2,
        projects: 2,
        projectStatuses: [
          { title: "SeedStatus-Catalog-A", color: "#0f766e", description: "seed-status-catalog-a" },
        ],
      });
      firstBaseSeedRunId = firstSummary.seedRunId;

      const productCategoryRows = await db.select().from(productCategories);
      const componentCategoryRows = await db.select().from(componentCategories);
      const productRows = await db.select().from(products);
      const componentRows = await db.select().from(components);
      const linkRows = await db.select().from(productComponent);

      expect(productCategoryRows.map((row) => row.name).sort()).toEqual(["Ausstattung", "Sauna"]);
      expect(componentCategoryRows.map((row) => row.name).sort()).toEqual([
        "Dachvariante",
        "Fenster",
        "Ofen",
        "Saunatyp",
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
        projectStatuses: [
          { title: "SeedStatus-Catalog-B", color: "#1d4ed8", description: "seed-status-catalog-b" },
        ],
      });
      secondBaseSeedRunId = secondSummary.seedRunId;

      const countsAfterSecondBase = await readProductCatalogCounts();
      expect(countsAfterSecondBase).toEqual(countsAfterFirstBase);
      const tagCountsAfterSecondBase = await readDemoTagCounts();
      expect(tagCountsAfterSecondBase.tags).toBe(tagCountsAfterFirstBase.tags);

      const appointmentsSummary = await createSeedRun({
        runType: "appointments",
        baseSeedRunId: firstBaseSeedRunId,
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

  itIfDemoSeedFilesPresent("creates only rule-conform tour/day slots and keeps employee-tour binding", async () => {
    let baseSeedRunId: string | null = null;
    let appointmentsSeedRunId: string | null = null;

    try {
      const baseSummary = await createSeedRun({
        runType: "base",
        randomSeed: 1101,
        employees: 2,
        customers: 8,
        projects: 12,
        projectStatuses: [
          { title: "SeedStatus", color: "#0f766e", description: "seed-status" },
        ],
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

      const baseEmployeeEntities = await db
        .select({ entityId: seedRunEntities.entityId })
        .from(seedRunEntities)
        .where(and(eq(seedRunEntities.seedRunId, baseSeedRunId), eq(seedRunEntities.entityType, "employee")));

      const baseEmployeeIds = baseEmployeeEntities.map((entity) => Number(entity.entityId));
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
      expect(fridayStarts).toBeLessThanOrEqual(Math.max(1, Math.floor(weekdayAverage * 0.35)));

      const intradayCount = appointmentRows.filter((row) => row.startTime != null).length;
      const intradayShare = intradayCount / appointmentRows.length;
      expect(intradayShare).toBeGreaterThanOrEqual(0.1);
      expect(intradayShare).toBeLessThanOrEqual(0.3);

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

  itIfDemoSeedFilesPresent("continues seeded project order numbers across base runs", async () => {
    let firstBaseSeedRunId: string | null = null;
    let secondBaseSeedRunId: string | null = null;

    try {
      const firstSummary = await createSeedRun({
        runType: "base",
        randomSeed: 3303,
        employees: 1,
        customers: 2,
        projects: 2,
        projectStatuses: [
          { title: "SeedStatus-First", color: "#0f766e", description: "seed-status-first" },
        ],
      });
      firstBaseSeedRunId = firstSummary.seedRunId;

      const secondSummary = await createSeedRun({
        runType: "base",
        randomSeed: 4404,
        employees: 1,
        customers: 2,
        projects: 2,
        projectStatuses: [
          { title: "SeedStatus-Second", color: "#1d4ed8", description: "seed-status-second" },
        ],
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
