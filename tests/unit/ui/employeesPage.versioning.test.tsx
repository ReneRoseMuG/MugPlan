/**
 * Test Scope:
 *
 * Feature: FT05+ - Mitarbeiter Locking im Frontend
 * Use Case: UC Mitarbeiter speichern in EmployeeForm und aktiv/deaktivieren aus Listenkontext
 *
 * Abgedeckte Regeln:
 * - EmployeeForm sendet beim PUT auf Mitarbeiter verpflichtend die Version.
 * - EmployeesPage sendet fuer PATCH toggleActive verpflichtend die Version.
 * - VERSION_CONFLICT und FORBIDDEN werden codebasiert gemappt.
 *
 * Fehlerfaelle:
 * - Toggle ohne Version fuehrt zu VALIDATION_ERROR/VERSION_CONFLICT.
 * - Rollenfehler ohne FORBIDDEN-Mapping sind fuer Nutzer nicht eindeutig.
 *
 * Ziel:
 * Sicherstellen, dass EmployeesPage die Multi-User-Locking- und Rechtevertraege einhaelt.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT05+ employees page versioning wiring", () => {
  const employeeFormPath = path.resolve(process.cwd(), "client/src/components/EmployeeForm.tsx");
  const employeesPagePath = path.resolve(process.cwd(), "client/src/components/EmployeesPage.tsx");
  const employeeFormSource = readFileSync(employeeFormPath, "utf8");
  const employeesPageSource = readFileSync(employeesPagePath, "utf8");

  it("sends version for employee update in EmployeeForm", () => {
    expect(employeeFormSource).toContain("data: { firstName?: string; lastName?: string; phone?: string | null; email?: string | null; version: number }");
    expect(employeeFormSource).toContain("return apiRequest(\"PUT\", `/api/employees/${id}`, data);");
    expect(employeeFormSource).toContain("const version = employeeDetails.employee.version;");
    expect(employeeFormSource).toContain("version,");
  });

  it("sends version for toggle active endpoint in EmployeesPage", () => {
    expect(employeesPageSource).toContain("mutationFn: async ({ id, isActive, version }: { id: number; isActive: boolean; version: number }) => {");
    expect(employeesPageSource).toContain("apiRequest(\"PATCH\", `/api/employees/${id}/active`, { isActive, version })");
    expect(employeesPageSource).toContain("toggleActiveMutation.mutate({ id: employee.id, isActive: !employee.isActive, version: employee.version });");
  });

  it("maps VERSION_CONFLICT and FORBIDDEN to dedicated toasts across form and page", () => {
    expect(employeeFormSource).toContain("if (code === \"VERSION_CONFLICT\")");
    expect(employeeFormSource).toContain("if (code === \"FORBIDDEN\")");
    expect(employeesPageSource).toContain("if (code === \"VERSION_CONFLICT\")");
    expect(employeesPageSource).toContain("if (code === \"FORBIDDEN\")");
    expect(employeesPageSource).toContain("Nur Admin darf den Aktiv-Status aendern.");
  });
});
