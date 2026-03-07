/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Betroffene Listen verdrahten explizite Empty- und Filter-Empty-helpKeys als Literale.
 * - AppointmentsListPage, CustomersPage, ProjectsPage, EmployeesPage und HelpTextsPage folgen dem festen Key-Schema.
 *
 * Fehlerfaelle:
 * - Empty-helpKeys werden dynamisch gebaut und vom Frontend-Scan nicht erfasst.
 *
 * Ziel:
 * Die Literal-Verdrahtung fuer den Help-Text-Seed und die konfigurierbaren Empty-States absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT28 list layout empty state help key wiring", () => {
  const files = [
    "client/src/components/CustomersPage.tsx",
    "client/src/components/ProjectsPage.tsx",
    "client/src/components/EmployeesPage.tsx",
    "client/src/components/AppointmentsListPage.tsx",
    "client/src/components/HelpTextsPage.tsx",
  ].map((relativePath) => ({
    relativePath,
    source: readFileSync(path.resolve(process.cwd(), relativePath), "utf8"),
  }));

  it("uses explicit empty and filtered empty help keys for each affected list", () => {
    expect(files.find((file) => file.relativePath.endsWith("CustomersPage.tsx"))?.source).toContain('helpKey="customers.emptyFiltered"');
    expect(files.find((file) => file.relativePath.endsWith("CustomersPage.tsx"))?.source).toContain('helpKey="customers.empty"');

    expect(files.find((file) => file.relativePath.endsWith("ProjectsPage.tsx"))?.source).toContain('helpKey="projects.emptyFiltered"');
    expect(files.find((file) => file.relativePath.endsWith("ProjectsPage.tsx"))?.source).toContain('helpKey="projects.empty"');

    expect(files.find((file) => file.relativePath.endsWith("EmployeesPage.tsx"))?.source).toContain('helpKey="employees.emptyFiltered"');
    expect(files.find((file) => file.relativePath.endsWith("EmployeesPage.tsx"))?.source).toContain('helpKey="employees.empty"');

    expect(files.find((file) => file.relativePath.endsWith("AppointmentsListPage.tsx"))?.source).toContain('helpKey="appointments.emptyFiltered"');
    expect(files.find((file) => file.relativePath.endsWith("AppointmentsListPage.tsx"))?.source).toContain('helpKey="appointments.empty"');

    expect(files.find((file) => file.relativePath.endsWith("HelpTextsPage.tsx"))?.source).toContain('helpKey="helptexts.emptyFiltered"');
    expect(files.find((file) => file.relativePath.endsWith("HelpTextsPage.tsx"))?.source).toContain('helpKey="helptexts.empty"');
  });
});
