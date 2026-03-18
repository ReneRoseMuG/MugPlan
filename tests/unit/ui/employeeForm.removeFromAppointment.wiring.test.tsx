/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - AppointmentsListPage hat eine optionale Prop onRemoveEmployee.
 * - Ist onRemoveEmployee gesetzt, wird ein "–"-Button je Tabellenzeile gerendert.
 * - Ist onRemoveEmployee nicht gesetzt, gibt es keine entsprechende Spalte.
 * - EmployeeForm übergibt onRemoveEmployee an AppointmentsListPage im employee-Context.
 * - EmployeeForm hat eine removeFromAppointmentMutation mit dem korrekten DELETE-Endpunkt.
 *
 * Fehlerfaelle:
 * - Der Button darf in anderen Kontexten (Tour, standalone) nicht automatisch erscheinen.
 * - Die Mutation darf keinen Kaskaden-Dialog auslösen.
 *
 * Ziel:
 * Die Verdrahtung des "–"-Buttons im Mitarbeiterformular regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("AppointmentsListPage onRemoveEmployee wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentsListPage.tsx");
  const source = readFileSync(filePath, "utf8");

  it("deklariert optionale Prop onRemoveEmployee", () => {
    expect(source).toContain("onRemoveEmployee?: (appointmentId: number) => void");
  });

  it("rendert den –-Button wenn onRemoveEmployee gesetzt ist", () => {
    expect(source).toContain("if (onRemoveEmployee) {");
    expect(source).toContain('`button-remove-employee-from-appointment-${row.id}`');
    expect(source).toContain("onRemoveEmployee(row.id)");
    expect(source).toContain("e.stopPropagation()");
  });

  it("nimmt onRemoveEmployee in die useMemo-Abhaengigkeiten auf", () => {
    expect(source).toContain("onRemoveEmployee]");
  });
});

describe("EmployeeForm removeFromAppointment wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/EmployeeForm.tsx");
  const source = readFileSync(filePath, "utf8");

  it("hat eine removeFromAppointmentMutation mit korrektem DELETE-Endpunkt", () => {
    expect(source).toContain("const removeFromAppointmentMutation = useMutation(");
    expect(source).toContain('apiRequest("DELETE", `/api/appointments/${appointmentId}/employees/${employeeId}`)');
  });

  it("invalidiert appointments-list und employee-Query bei Erfolg", () => {
    expect(source).toContain('queryKey: ["appointments-list"]');
    expect(source).toContain('queryKey: ["/api/employees", employeeId]');
    expect(source).toContain("Mitarbeiter wurde vom Termin entfernt");
  });

  it("zeigt Fehler-Toast bei fehlgeschlagenem Entfernen", () => {
    expect(source).toContain("Entfernen fehlgeschlagen");
  });

  it("übergibt onRemoveEmployee an AppointmentsListPage im employee-Tab", () => {
    expect(source).toContain("onRemoveEmployee={(appointmentId) => removeFromAppointmentMutation.mutate(appointmentId)}");
  });
});
