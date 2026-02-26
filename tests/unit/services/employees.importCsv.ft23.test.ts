/**
 * Test Scope:
 *
 * Feature: FT23 - CSV-Import Mitarbeitende
 * Use Case: UC23/01 CSV Upload, Validierung, Duplikaterkennung und Report
 *
 * Abgedeckte Regeln:
 * - CSV akzeptiert Header-basiert Vorname/Nachname mit Auto-Delimiter (; oder ,).
 * - Duplikatpruefung arbeitet trim + case-insensitive gegen Bestand und innerhalb der CSV.
 * - Zeilenfehler werden als INVALID/ERROR reportet und blockieren den Gesamtimport nicht.
 *
 * Fehlerfaelle:
 * - Fehlende Pflichtheader liefern INVALID_CSV_HEADER.
 * - Ungueltige Feldinhalte (leer, >100 Zeichen, kaputte Quotes) werden als INVALID gemeldet.
 *
 * Ziel:
 * Den Servicevertrag fuer den CSV-Import stabil und regressionssicher absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getEmployeesMock,
  getEmployeeMock,
  createEmployeeRepoMock,
  updateEmployeeWithVersionMock,
  toggleEmployeeActiveWithVersionMock,
  getAllEmployeesMock,
  getTeamMock,
  getTourMock,
} = vi.hoisted(() => ({
  getEmployeesMock: vi.fn(),
  getEmployeeMock: vi.fn(),
  createEmployeeRepoMock: vi.fn(),
  updateEmployeeWithVersionMock: vi.fn(),
  toggleEmployeeActiveWithVersionMock: vi.fn(),
  getAllEmployeesMock: vi.fn(),
  getTeamMock: vi.fn(),
  getTourMock: vi.fn(),
}));

vi.mock("../../../server/repositories/employeesRepository", () => ({
  getEmployees: getEmployeesMock,
  getEmployee: getEmployeeMock,
  createEmployee: createEmployeeRepoMock,
  updateEmployeeWithVersion: updateEmployeeWithVersionMock,
  toggleEmployeeActiveWithVersion: toggleEmployeeActiveWithVersionMock,
  getAllEmployees: getAllEmployeesMock,
}));

vi.mock("../../../server/repositories/teamsRepository", () => ({
  getTeam: getTeamMock,
}));

vi.mock("../../../server/repositories/toursRepository", () => ({
  getTour: getTourMock,
}));

import { EmployeeImportError, importEmployeesFromCsv } from "../../../server/services/employeesService";

describe("FT23 unit: employees csv import service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllEmployeesMock.mockResolvedValue([]);
    createEmployeeRepoMock.mockImplementation(async (data: { firstName: string; lastName: string; fullName: string }) => ({
      id: 1,
      firstName: data.firstName,
      lastName: data.lastName,
      fullName: data.fullName,
      phone: null,
      email: null,
      isActive: true,
      teamId: null,
      tourId: null,
      version: 1,
    }));
  });

  it("imports valid semicolon csv rows and returns summary", async () => {
    const csv = Buffer.from("Vorname;Nachname\nMax;Muster\nAnna;Beispiel\n", "utf8");
    const result = await importEmployeesFromCsv(csv);

    expect(result.summary.totalRows).toBe(2);
    expect(result.summary.importedRows).toBe(2);
    expect(result.summary.duplicateRows).toBe(0);
    expect(result.summary.invalidRows).toBe(0);
  });

  it("accepts comma delimiter and trims values", async () => {
    const csv = Buffer.from("Vorname,Nachname\n  Max  ,  Muster \n", "utf8");
    const result = await importEmployeesFromCsv(csv);
    expect(result.summary.importedRows).toBe(1);
    expect(createEmployeeRepoMock).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: "Max", lastName: "Muster", fullName: "Muster, Max" }),
    );
  });

  it("marks duplicate against existing employees case-insensitive", async () => {
    getAllEmployeesMock.mockResolvedValueOnce([
      {
        id: 1,
        firstName: "max",
        lastName: "muster",
        fullName: "muster, max",
        phone: null,
        email: null,
        isActive: true,
        teamId: null,
        tourId: null,
        version: 1,
      },
    ]);
    const csv = Buffer.from("Vorname;Nachname\n Max ;MUSTER \n", "utf8");
    const result = await importEmployeesFromCsv(csv);

    expect(result.summary.importedRows).toBe(0);
    expect(result.summary.duplicateRows).toBe(1);
    expect(result.rows[0]?.status).toBe("DUPLICATE");
  });

  it("marks duplicate within CSV file", async () => {
    const csv = Buffer.from("Vorname;Nachname\nMax;Muster\n max ; Muster \n", "utf8");
    const result = await importEmployeesFromCsv(csv);

    expect(result.summary.importedRows).toBe(1);
    expect(result.summary.duplicateRows).toBe(1);
  });

  it("marks invalid row when name too long", async () => {
    const longName = "A".repeat(101);
    const csv = Buffer.from(`Vorname;Nachname\n${longName};Muster\n`, "utf8");
    const result = await importEmployeesFromCsv(csv);

    expect(result.summary.invalidRows).toBe(1);
    expect(result.summary.importedRows).toBe(0);
  });

  it("marks invalid row on broken quotes", async () => {
    const csv = Buffer.from('Vorname;Nachname\n"Max;Muster\n', "utf8");
    const result = await importEmployeesFromCsv(csv);

    expect(result.summary.invalidRows).toBe(1);
    expect(result.rows[0]?.status).toBe("INVALID");
  });

  it("throws INVALID_CSV_HEADER when required header is missing", async () => {
    const csv = Buffer.from("Name;Nachname\nMax;Muster\n", "utf8");
    await expect(importEmployeesFromCsv(csv)).rejects.toMatchObject<EmployeeImportError>({
      status: 400,
      code: "INVALID_CSV_HEADER",
    });
  });
});
