/**
 * Test Scope:
 *
 * Feature: FT01 - Terminverwaltung
 * Use Case: UC Termin-Projekt/Kunde Relationen in Slots
 *
 * Abgedeckte Regeln:
 * - Projektrelation im Terminformular nutzt RelationSlot.
 * - ProjectDetailCard wird im Projektslot mit Projekt- und Statusdaten verdrahtet.
 * - Projektdatenquelle des Formulars nutzt scope=all, damit ausgewaehlte Projekte aus allen Picker-Sichten angezeigt werden.
 * - Projekt-Readonly wird ueber Lock und explizite readOnlyFields gesteuert.
 * - Formular koppelt Projekt/Zeitpunkt, Kunde/Dokumente und Mitarbeiter/Tour als parallele Zeilen.
 * - Tour-Auswahlbadges werden nur angezeigt, wenn keine Tour zugeordnet ist.
 * - Kunden-Slot ist readonly und links in der Hauptspalte verortet.
 *
 * Fehlerfaelle:
 * - Projekt-Slot zeigt trotz ReadOnly Add/Remove.
 * - Kunden-Slot wird nicht aus Projektrelation angezeigt.
 *
 * Ziel:
 * Sicherstellen, dass die neue Slot-Relation im Terminformular korrekt verdrahtet ist.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT01 appointment form relation slot wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentForm.tsx");
  const source = readFileSync(filePath, "utf8");

  it("uses project relation slot with readonly-aware state", () => {
    expect(source).toContain("testId=\"slot-project-relation\"");
    expect(source).toContain("state={isProjectReadOnly ? \"readonly\" : selectedProject ? \"active\" : \"empty\"}");
    expect(source).toContain("onAdd={isProjectReadOnly ? undefined : () => setProjectPickerOpen(true)}");
    expect(source).toContain("onRemove={isProjectReadOnly ? undefined : () => setSelectedProjectId(null)}");
  });

  it("keeps legacy project select test id", () => {
    expect(source).toContain("addActionTestId=\"button-select-project\"");
  });

  it("renders customer relation as readonly slot", () => {
    expect(source).toContain("testId=\"slot-customer-relation\"");
    expect(source).toContain("title=\"Kunde\"");
    expect(source).toContain("state={isCustomerReadOnly ? \"readonly\" : selectedCustomer ? \"active\" : \"empty\"}");
    expect(source).toContain("<CustomerDetailCard customer={selectedCustomer} testId=\"badge-customer\" variant=\"relationCompact\" />");
  });

  it("renders project detail card inside project relation slot", () => {
    expect(source).toContain("<ProjectDetailCard");
    expect(source).toContain("project={selectedProject}");
    expect(source).toContain("projectStatuses={selectedProjectStatuses.map((item) => item.status)}");
    expect(source).toContain("testId=\"badge-project\"");
  });

  it("couples the three appointment form rows via shared grid placement", () => {
    expect(source).toContain('className="col-span-2 min-h-[18rem] h-full"');
    expect(source).toContain('className="col-span-2 h-full"');
    expect(source).toContain('<AppointmentEmployeeSlot');
    expect(source).toContain('className="col-span-2"');
    expect(source).toContain('{appointmentId ? <div className="h-full"><AppointmentAttachmentsPanel appointmentId={appointmentId} /></div> : <div />}');
    expect(source).toContain('className="sub-panel space-y-3 h-full"');
  });

  it("loads projects with scope=all for stable post-selection rendering", () => {
    expect(source).toContain("const projectsQueryKey = [\"/api/projects?filter=all&scope=all\"] as const;");
    expect(source).toContain("queryKey: projectsQueryKey");
    expect(source).toContain("fetchJson<Project[]>(\"/api/projects?filter=all&scope=all\")");
  });

  it("shows tour selection badges only when no tour is selected", () => {
    expect(source).toContain("{!selectedTour && (");
    expect(source).toContain("testId={`badge-tour-select-${tour.id}`}");
  });
});
