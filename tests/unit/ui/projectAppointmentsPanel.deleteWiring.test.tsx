/**
 * Test Scope:
 *
 * Feature: FT04 - Terminverwaltung
 * Use Case: UC Projektseiten-Panel lädt Termine read-only
 *
 * Abgedeckte Regeln:
 * - Das Panel laedt alle Termine ueber den Sidebar-Endpunkt mit fromDate-Override.
 * - Das Panel bietet keinen eigenen Delete-Mutationspfad.
 * - Das Panel setzt den projektspezifischen helpKey.
 *
 * Fehlerfaelle:
 * - Fehlender fromDate-Override fuehrt zu unvollstaendiger Terminliste.
 * - Ein versehentlich eingefuehrter Delete-Pfad umgeht den zentralen Termin-Flow.
 *
 * Ziel:
 * Sicherstellen, dass das Projektseiten-Panel als read-only Liste korrekt verdrahtet bleibt.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT04 project appointments panel wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/ProjectAppointmentsPanel.tsx");
  const source = readFileSync(filePath, "utf8");

  it("uses all-appointments fromDate override for sidebar list", () => {
    expect(source).toContain("const queryFromDate = PROJECT_APPOINTMENTS_ALL_FROM_DATE;");
    expect(source).toContain("const url = `/api/projects/${projectId}/appointments?fromDate=${queryFromDate}`;");
  });

  it("does not define local delete mutation path", () => {
    expect(source).not.toContain("deleteAppointmentMutation");
    expect(source).not.toContain("JSON.stringify({ version })");
  });

  it("sets panel-specific helpKey for project sidebar appointments", () => {
    expect(source).toContain("helpKey=\"projects.sidebar.appointments\"");
  });
});
