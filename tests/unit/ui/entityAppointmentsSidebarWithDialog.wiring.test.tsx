/**
 * Test Scope:
 *
 * Feature: FT04 - Termin-Sidebar Kapselung
 * Use Case: UC Mitarbeiter-/Kundenformular mit kombinierter Sidebar und Alle-Termine-Dialog
 *
 * Abgedeckte Regeln:
 * - Die gekapselte Komponente zeigt den Footer-Button mit Label "Alle Termine".
 * - Die gekapselte Komponente setzt panel-spezifische HelpKeys je Entitaetstyp.
 * - Mitarbeiterpfad nutzt den einheitlichen Entity-Endpoint mit scope=upcoming/all.
 * - Kundenpfad nutzt denselben einheitlichen Entity-Endpoint mit scope=upcoming/all.
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
    expect(componentSource).toContain("helpKey={entityType === \"employee\" ? \"employees.sidebar.appointments\" : \"customers.sidebar.appointments\"}");
  });

  it("wires unified entity endpoint for employee scopes", () => {
    expect(componentSource).toContain("const entityPath = entityType === \"employee\" ? \"employees\" : \"customers\";");
    expect(componentSource).toContain("`/api/${entityPath}/${entityId}/appointments?scope=upcoming`");
    expect(componentSource).toContain("`/api/${entityPath}/${entityId}/appointments?scope=all`");
    expect(componentSource).not.toContain("fromDate=");
    expect(componentSource).toContain("queryKey: [\"entityAppointments\", entityType, entityId ?? null, \"upcoming\"]");
    expect(componentSource).toContain("queryKey: [\"entityAppointments\", entityType, entityId ?? null, \"all\"]");
  });

  it("does not use project fan-out loading in customer mode anymore", () => {
    expect(componentSource).not.toContain("/api/projects?customerId=");
    expect(componentSource).not.toContain("/api/projects/${project.id}/appointments");
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
