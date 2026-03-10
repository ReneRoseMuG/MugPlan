/**
 * Test Scope:
 *
 * Feature: FT-UI - Einheitlicher Plus-Action-Button
 * Use Case: UC Plus-Action in Formularen, Dialogen, Slots, Filtern und Badges
 *
 * Abgedeckte Regeln:
 * - Alle definierten Scope-Stellen verwenden PlusActionButton.
 * - Legacy-Plusbuttons mit Outline-Rand bleiben im Scope nicht bestehen.
 *
 * Fehlerfaelle:
 * - Einzelne Plus-Aktionen weichen wieder auf lokale Button+Plus-Kombinationen aus.
 * - Outline-Varianten tauchen in den scope-relevanten Plus-Aktionen erneut auf.
 *
 * Ziel:
 * Sicherstellen, dass die Plus-Standardisierung in allen vereinbarten Dateien konsistent verdrahtet bleibt.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const scopeFiles = [
  "client/src/components/AppointmentEmployeeSlot.tsx",
  "client/src/components/DocumentExtractionDropzone.tsx",
  "client/src/components/ui/employee-select-entity-edit-dialog.tsx",
  "client/src/components/ui/relation-slot.tsx",
  "client/src/components/ui/sidebar-child-panel.tsx",
  "client/src/components/filters/project-status-filter-input.tsx",
  "client/src/components/ui/info-badge.tsx",
] as const;

describe("FT-UI plus action button wiring usages", () => {
  it("uses PlusActionButton across the agreed scope", () => {
    for (const relativePath of scopeFiles) {
      const absolutePath = path.resolve(process.cwd(), relativePath);
      const source = readFileSync(absolutePath, "utf8");
      expect(source).toContain("PlusActionButton");
    }
  });

  it("keeps outline-style plus buttons out of scoped files", () => {
    for (const relativePath of scopeFiles) {
      const absolutePath = path.resolve(process.cwd(), relativePath);
      const source = readFileSync(absolutePath, "utf8");
      expect(source).not.toContain("variant=\"outline\"");
    }
  });
});
