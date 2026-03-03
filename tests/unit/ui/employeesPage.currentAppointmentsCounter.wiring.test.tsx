/**
 * Test Scope:
 *
 * Feature: FT05+ - Mitarbeiterverwaltung
 * Use Case: UC Mitarbeiterkarte zeigt aktuelle Termine im Footer
 *
 * Abgedeckte Regeln:
 * - Die Mitarbeiterkarte zeigt den Footer-Text "Aktuelle Termine".
 * - Der Counter basiert auf Terminen ab heute (startDate >= berlinToday).
 * - Der Kartenfooter ist explizit sichtbar geschaltet.
 *
 * Fehlerfälle:
 * - Historische Termine werden im Counter mitgezaehlt.
 * - Footer bleibt unsichtbar und der Counter wird nicht angezeigt.
 *
 * Ziel:
 * Sicherstellen, dass der Footer-Counter in EmployeesPage korrekt verdrahtet ist.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT05+ employees page current appointments counter wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/EmployeesPage.tsx");
  const source = readFileSync(filePath, "utf8");

  it("renders the current appointments footer label", () => {
    expect(source).toContain("Aktuelle Termine:");
    expect(source).toContain("data-testid={`text-employee-current-appointments-${employee.id}`}");
  });

  it("derives the counter from appointments starting today or later", () => {
    expect(source).toContain("const appointments = appointmentsByEmployeeId.get(employee.id) ?? [];");
    expect(source).toContain("const currentAppointmentsCount = appointments.filter((appointment) => appointment.startDate >= berlinToday).length;");
  });

  it("forces the entity card footer to be visible", () => {
    expect(source).toContain("footerVisibility=\"visible\"");
  });
});

