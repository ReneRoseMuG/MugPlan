/**
 * Test Scope:
 *
 * Feature: FT02 - Projektverwaltung
 * Use Case: UC Projekt-Kunde Relation im Projektformular
 *
 * Abgedeckte Regeln:
 * - Kundenrelation wird ueber den RelationSlot gerendert.
 * - Empty/Active Zustand wird ueber selectedCustomer abgeleitet.
 * - Add/Remove Aktionen sind auf Dialog oeffnen bzw. customerId reset verdrahtet.
 * - Pflichtvalidierung fuer customerId bleibt erhalten.
 *
 * Fehlerfaelle:
 * - Fehlende Verdrahtung der Slot-Aktionen.
 *
 * Ziel:
 * Sicherstellen, dass das Projektformular die neue Slot-Relation korrekt verwendet.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT02 project form customer relation slot wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/ProjectForm.tsx");
  const source = readFileSync(filePath, "utf8");

  it("uses relation slot with customer state mapping", () => {
    expect(source).toContain("<RelationSlot");
    expect(source).toContain("testId=\"slot-customer-relation-project\"");
    expect(source).toContain("state={selectedCustomer ? \"active\" : \"empty\"}");
  });

  it("wires add and remove actions to expected handlers", () => {
    expect(source).toContain("onAdd={() => setCustomerDialogOpen(true)}");
    expect(source).toContain("onRemove={() => setCustomerId(null)}");
    expect(source).toContain("addActionTestId=\"button-select-customer\"");
    expect(source).toContain("removeActionTestId=\"button-change-customer\"");
  });

  it("keeps customer required validation", () => {
    expect(source).toContain("if (!customerId) {");
    expect(source).toContain("Kunde muss ausgew");
  });
});

