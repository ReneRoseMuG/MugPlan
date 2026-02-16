/**
 * Test Scope:
 *
 * Feature: FT01 - Terminverwaltung
 * Use Case: UC Termin-Projekt/Kunde Relationen in Slots
 *
 * Abgedeckte Regeln:
 * - Projektrelation im Terminformular nutzt RelationSlot.
 * - Projektdatenquelle des Formulars nutzt scope=all, damit ausgewaehlte Projekte aus allen Picker-Sichten angezeigt werden.
 * - Lock-Zustand erzwingt readonly fuer den Projekt-Slot.
 * - Tour-Auswahlbadges werden nur angezeigt, wenn keine Tour zugeordnet ist.
 * - Kunden-Slot ist readonly und links in der Hauptspalte verortet.
 *
 * Fehlerfaelle:
 * - Projekt-Slot zeigt trotz Lock Add/Remove.
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

  it("uses project relation slot with lock-aware readonly state", () => {
    expect(source).toContain("testId=\"slot-project-relation\"");
    expect(source).toContain("state={isLocked ? \"readonly\" : selectedProject ? \"active\" : \"empty\"}");
    expect(source).toContain("onAdd={isLocked ? undefined : () => setProjectPickerOpen(true)}");
    expect(source).toContain("onRemove={isLocked ? undefined : () => setSelectedProjectId(null)}");
  });

  it("keeps legacy project select test id", () => {
    expect(source).toContain("addActionTestId=\"button-select-project\"");
  });

  it("renders customer relation as readonly slot", () => {
    expect(source).toContain("testId=\"slot-customer-relation\"");
    expect(source).toContain("title=\"Kunde\"");
    expect(source).toContain("state=\"readonly\"");
    expect(source).toContain("<CustomerDetailCard customer={selectedCustomer} testId=\"badge-customer\" />");
  });

  it("loads projects with scope=all for stable post-selection rendering", () => {
    expect(source).toContain("queryKey: [\"/api/projects?filter=all&scope=all\"]");
    expect(source).toContain("fetchJson<Project[]>(\"/api/projects?filter=all&scope=all\")");
  });

  it("shows tour selection badges only when no tour is selected", () => {
    expect(source).toContain("{!selectedTour && (");
    expect(source).toContain("testId={`badge-tour-select-${tour.id}`}");
  });
});
