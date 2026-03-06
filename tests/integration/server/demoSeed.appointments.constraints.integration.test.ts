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
 *
 * Fehlerfaelle:
 * - Terminzuweisung enthaelt Mitarbeitende mit abweichender Tour.
 * - Tour-Tag-Slots uebersteigen die erlaubte Obergrenze oder enthalten verbotene Kombinationen.
 *
 * Ziel:
 * Sicherstellen, dass der appointments-Seed realistische Tour-Tagesplanung mit fester Mitarbeiter-Tour-Bindung erzeugt.
 */
import { and, eq, inArray } from "drizzle-orm";
import { existsSync } from "fs";
import path from "path";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "../../../server/db";
import { createSeedRun, purgeSeedRun } from "../../../server/services/demoSeedService";
import { appointments, appointmentEmployees, employees, seedRunEntities } from "../../../shared/schema";

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

beforeEach(() => {
  // resetDatabase() laeuft zentral ueber tests/setup.env.ts vor jedem Integrationstest.
});

describe("FT20 integration: appointments-seed tour/day constraints", () => {
  const hasRequiredDemoSeedFiles = existsSync(
    path.resolve(process.cwd(), "shared/uploads/demodata/fasssauna_modelle.csv"),
  );

  const itIfDemoSeedFilesPresent = hasRequiredDemoSeedFiles ? it : it.skip;

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

      expect(appointmentIds.length).toBeGreaterThan(0);

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
});
