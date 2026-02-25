/**
 * Test Scope:
 *
 * Feature: FT04 - Termin-Sidebar Kapselung
 * Use Case: UC Mitarbeiter-/Kundenformular mit kombinierter Sidebar und Alle-Termine-Dialog
 *
 * Abgedeckte Regeln:
 * - Die gekapselte Komponente zeigt den Footer-Button mit Label "Alle Termine".
 * - Mitarbeiterpfad nutzt Upcoming-Endpoint ab heute sowie Kalender-Range fuer alle Termine.
 * - Kundenpfad nutzt projektbasierte Abfragen fuer Upcoming und alle Termine (historisch ab 1900-01-01).
 * - Dialog-Open-State ist intern in der Komponente gekapselt.
 * - EmployeesPage und CustomerData binden die neue Komponente statt separatem Panel/Dialog ein.
 *
 * Fehlerfaelle:
 * - Buttonlabel oder Query-Pfade weichen vom Soll ab.
 * - Interner Dialog-State fehlt.
 * - Integrationen referenzieren weiterhin alte, nicht gekapselte Komponenten.
 *
 * Ziel:
 * Die Verdrahtung der neuen wiederverwendbaren Kapsel-Komponente regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT04 EntityAppointmentsSidebarWithDialog wiring", () => {
  const componentPath = path.resolve(process.cwd(), "client/src/components/EntityAppointmentsSidebarWithDialog.tsx");
  const employeesPagePath = path.resolve(process.cwd(), "client/src/components/EmployeesPage.tsx");
  const customerDataPath = path.resolve(process.cwd(), "client/src/components/CustomerData.tsx");

  const componentSource = readFileSync(componentPath, "utf8");
  const employeesPageSource = readFileSync(employeesPagePath, "utf8");
  const customerDataSource = readFileSync(customerDataPath, "utf8");

  it("uses shared button label and internal dialog state", () => {
    expect(componentSource).toContain("const [allAppointmentsDialogOpen, setAllAppointmentsDialogOpen] = useState(false);");
    expect(componentSource).toContain("Alle Termine");
    expect(componentSource).toContain("<Dialog open={allAppointmentsDialogOpen} onOpenChange={setAllAppointmentsDialogOpen}>");
  });

  it("wires employee upcoming and all-appointments data sources", () => {
    expect(componentSource).toContain("/api/employees/${entityId}/current-appointments?fromDate=${today}");
    expect(componentSource).toContain("fromDate: ALL_APPOINTMENTS_FROM_DATE");
    expect(componentSource).toContain("toDate: ALL_APPOINTMENTS_TO_DATE");
    expect(componentSource).toContain("employeeId: entityType === \"employee\" ? (entityId ?? undefined) : undefined");
  });

  it("wires customer project-based upcoming and all-appointments loading", () => {
    expect(componentSource).toContain("/api/projects?customerId=${entityId}&filter=all");
    expect(componentSource).toContain("/api/projects/${project.id}/appointments?fromDate=${fromDate}");
    expect(componentSource).toContain("queryKey: [\"customer-entity-appointments-upcoming\", entityId, today, customerProjectIds]");
    expect(componentSource).toContain("queryKey: [\"customer-entity-appointments-all\", entityId, ALL_APPOINTMENTS_FROM_DATE, customerProjectIds]");
  });

  it("wires new component in employees page and customer data", () => {
    expect(employeesPageSource).toContain("import { EntityAppointmentsSidebarWithDialog } from \"@/components/EntityAppointmentsSidebarWithDialog\";");
    expect(employeesPageSource).toContain("<EntityAppointmentsSidebarWithDialog");
    expect(employeesPageSource).toContain("entityType=\"employee\"");

    expect(customerDataSource).toContain("import { EntityAppointmentsSidebarWithDialog } from \"@/components/EntityAppointmentsSidebarWithDialog\";");
    expect(customerDataSource).toContain("<EntityAppointmentsSidebarWithDialog");
    expect(customerDataSource).toContain("entityType=\"customer\"");
  });
});
