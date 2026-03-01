/**
 * Test Scope:
 *
 * Feature: FT04 - Mitarbeiterformular Migration
 * Use Case: UC EmployeesPage rendert EmployeeForm statt gekapselter Sidebar-Dialog-Loesung
 *
 * Abgedeckte Regeln:
 * - EmployeesPage verwendet EmployeeForm als Detail-/Create-Ansicht.
 * - EmployeeForm rendert AppointmentsListPage im employee-Kontext nur bei bestehender employeeId.
 * - EmployeesPage nutzt EntityAppointmentsSidebarWithDialog nicht mehr.
 *
 * Fehlerfaelle:
 * - EmployeesPage haengt weiterhin am Legacy-Sidebar-Dialog-Pattern.
 * - EmployeeForm rendert Terminliste ohne employee-Kontext oder ohne Edit-Guard.
 *
 * Ziel:
 * Regressionssichere Verdrahtung des neuen EmployeeForm-Flows absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT04 EmployeeForm wiring", () => {
  const employeeFormPath = path.resolve(process.cwd(), "client/src/components/EmployeeForm.tsx");
  const employeesPagePath = path.resolve(process.cwd(), "client/src/components/EmployeesPage.tsx");
  const employeeFormSource = readFileSync(employeeFormPath, "utf8");
  const employeesPageSource = readFileSync(employeesPagePath, "utf8");

  it("wires employee appointments list with employee context in EmployeeForm", () => {
    expect(employeeFormSource).toContain("<AppointmentsListPage");
    expect(employeeFormSource).toContain("context={{ type: \"employee\", employeeId }}");
    expect(employeeFormSource).toContain("helpKey=\"appointments.list.employeeForm\"");
    expect(employeeFormSource).toContain("{employeeId ? (");
  });

  it("uses EmployeeForm in EmployeesPage and removes legacy sidebar integration", () => {
    expect(employeesPageSource).toContain("import { EmployeeForm } from \"@/components/EmployeeForm\";");
    expect(employeesPageSource).toContain("if (isCreating || selectedEmployeeId !== null)");
    expect(employeesPageSource).toContain("<EmployeeForm");
    expect(employeesPageSource).not.toContain("EntityAppointmentsSidebarWithDialog");
  });
});
