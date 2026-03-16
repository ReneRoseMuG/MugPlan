/**
 * Test Scope:
 *
 * Feature: FT01 - Verfuegbarkeitslogik fuer Termine
 *
 * Abgedeckte Regeln:
 * - Verfuegbarkeit kann fuer einen einzelnen Tag oder fuer eine komplette Terminspanne bewertet werden.
 * - Abwesenheit und exit_date fuehren mit korrektem Grund zum Ausschluss.
 * - Die Rueckgabe trennt stabil in verfuegbare IDs und ausgeschlossene Mitarbeiter.
 *
 * Fehlerfaelle:
 * - Mehrtagestermine pruefen nur das Startdatum.
 * - Mehrere Treffer erzeugen doppelte ausgeschlossene Mitarbeiter.
 *
 * Ziel:
 * Die gemeinsame Availability-Service-Logik fuer Tages- und Range-Pruefungen isoliert absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbRowsMock } = vi.hoisted(() => ({
  dbRowsMock: vi.fn(),
}));

vi.mock("../../../server/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        leftJoin: () => ({
          where: () => ({
            orderBy: async () => dbRowsMock(),
          }),
        }),
      }),
    }),
  },
}));

import {
  getExcludedEmployeesForDateRange,
  previewEmployeeAvailabilityForDateRange,
} from "../../../server/services/employeeAvailabilityService";

describe.skip("FT01 unit: employeeAvailabilityService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns no exclusions when the data source reports no conflicts", async () => {
    dbRowsMock.mockResolvedValueOnce([]);

    await expect(getExcludedEmployeesForDateRange([1, 2], "2099-07-01", "2099-07-03")).resolves.toEqual([]);
  });

  it("deduplicates multiple matching rows for the same employee in a date range", async () => {
    dbRowsMock.mockResolvedValueOnce([
      { id: 7, fullName: "Range Employee", exitDate: null, absenceId: 11 },
      { id: 7, fullName: "Range Employee", exitDate: null, absenceId: 12 },
      { id: 8, fullName: "Exited Employee", exitDate: "2099-07-02", absenceId: null },
    ]);

    await expect(getExcludedEmployeesForDateRange([7, 8], "2099-07-01", "2099-07-05")).resolves.toEqual([
      { id: 7, fullName: "Range Employee", reason: "absence" },
      { id: 8, fullName: "Exited Employee", reason: "exit_date" },
    ]);
  });

  it("splits available and unavailable employee IDs for multiday ranges", async () => {
    dbRowsMock.mockResolvedValueOnce([
      { id: 2, fullName: "Absent Person", exitDate: null, absenceId: 55 },
      { id: 3, fullName: "Exited Person", exitDate: "2099-07-03", absenceId: null },
    ]);

    await expect(previewEmployeeAvailabilityForDateRange([1, 2, 3], "2099-07-01", "2099-07-05")).resolves.toEqual({
      availableEmployeeIds: [1],
      unavailableEmployees: [
        { id: 2, fullName: "Absent Person", reason: "absence" },
        { id: 3, fullName: "Exited Person", reason: "exit_date" },
      ],
    });
  });
});
