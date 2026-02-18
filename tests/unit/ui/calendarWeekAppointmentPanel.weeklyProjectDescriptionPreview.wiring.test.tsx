/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Termin-Karten
 * Use Case: UC FT03 - Weekly-only Projektname und Vollbeschreibung-Preview
 *
 * Abgedeckte Regeln:
 * - CalendarWeekAppointmentPanel nutzt parseProjectStoredName fuer den Wochenkalender-Kontext.
 * - Weekly-Kontext aktiviert den Full-Description-Hover ueber enableFullDescriptionPreview.
 * - Project-Panel enthaelt die HoverPreview-Verdrahtung fuer den Description-Block.
 * - Vollbeschreibung rendert weiterhin HTML via dangerouslySetInnerHTML.
 *
 * Fehlerfaelle:
 * - Kundenpraefix bleibt im Weekly-Projektnamen sichtbar.
 * - Full-Description-Hover wird nicht nur im Weekly-Kontext aktiviert.
 *
 * Ziel:
 * Sicherstellen, dass Projektname/Description-Preview in der Wochenkarte weekly-only angepasst sind.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT03 UI: weekly project description preview wiring", () => {
  it("parses project name for weekly context and wires weekly-only preview flag", () => {
    const panelPath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentPanel.tsx");
    const source = readFileSync(panelPath, "utf8");

    expect(source).toContain("parseProjectStoredName(appointment.projectName).isolatedProjectName");
    expect(source).toContain('context === "week-calendar"');
    expect(source).toContain("enableFullDescriptionPreview={context === \"week-calendar\"}");
  });

  it("contains hover preview wiring for project description", () => {
    const projectPath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentPanelProject.tsx");
    const source = readFileSync(projectPath, "utf8");

    expect(source).toContain("enableFullDescriptionPreview = false");
    expect(source).toContain("<HoverPreview");
    expect(source).toContain("data-testid=\"week-project-description-hover-trigger\"");
    expect(source).toContain("dangerouslySetInnerHTML={{ __html: projectDescription }}");
  });
});
