/**
 * Test Scope:
 *
 * Feature: FT05+ - Rollenbasierte Filter-UX fuer Mitarbeiter
 * Use Case: UC Mitarbeiterliste mit Inaktive-Switch nur fuer Admin
 *
 * Abgedeckte Regeln:
 * - Admin sieht den Scope-Switch "Inaktive".
 * - Nicht-Admin erhaelt keinen Scope-Switch im Filterpanel.
 * - Alter "Alle"-Scope ist entfernt.
 *
 * Fehlerfaelle:
 * - Scope "all" bleibt verdrahtet und umgeht FT05+ Regel.
 * - Nicht-Admin sieht unnoetige Inaktive-Steuerung.
 *
 * Ziel:
 * Absichern, dass die Mitarbeiterlisten-UX die neuen Rollenregeln einhaelt.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT05+ employees scope UX wiring", () => {
  const pagePath = path.resolve(process.cwd(), "client/src/components/EmployeesPage.tsx");
  const panelPath = path.resolve(process.cwd(), "client/src/components/ui/filter-panels/employee-filter-panel.tsx");
  const inputPath = path.resolve(process.cwd(), "client/src/components/filters/employee-inactive-scope-filter-input.tsx");
  const pageSource = readFileSync(pagePath, "utf8");
  const panelSource = readFileSync(panelPath, "utf8");
  const inputSource = readFileSync(inputPath, "utf8");

  it("wires admin-only scope switch in employees page", () => {
    expect(pageSource).toContain("const [employeeScope, setEmployeeScope] = useState<\"active\" | \"inactive\">(\"active\")");
    expect(pageSource).toContain("const effectiveEmployeeScope = isAdmin ? employeeScope : \"active\"");
    expect(pageSource).toContain("employeeScope={isAdmin ? employeeScope : undefined}");
    expect(pageSource).toContain("onEmployeeScopeChange={isAdmin ? setEmployeeScope : undefined}");
  });

  it("uses inactive toggle label and removes all-scope remnants", () => {
    expect(panelSource).toContain("EmployeeInactiveScopeFilterInput");
    expect(inputSource).toContain("label=\"Inaktive\"");
    expect(pageSource).not.toContain("scope=all");
    expect(pageSource).not.toContain("\"active\" | \"all\"");
  });
});
