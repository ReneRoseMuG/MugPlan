/**
 * Test Scope:
 *
 * Feature: FT02/FT13/FT24 - Projektformular Sidebar-Layout
 * Use Case: UC Projekt-Sidebar in Create und Edit mit Notizen am Ende
 *
 * Abgedeckte Regeln:
 * - ProjectForm definiert eine explizite Hauptspalte und rechte Sidebar.
 * - Notizen folgen in der Sidebar auf Termine, Anhaenge und Tags.
 * - Im Hauptbereich bleibt keine inline-Notizsektion zurueck.
 *
 * Fehlerfaelle:
 * - Notizen erscheinen weiterhin im linken Formularfluss.
 * - Die Sidebar-Reihenfolge driftet und Notizen stehen nicht mehr am Ende.
 *
 * Ziel:
 * Das Sidebar-Layout des Projektformulars source-basiert regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT02/FT13 ProjectForm notes sidebar layout wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/ProjectForm.tsx");
  const source = readFileSync(filePath, "utf8");

  it("renders NotesSection after the sidebar panels", () => {
    const notesIndex = source.indexOf("<NotesSection");
    const appointmentsIndex = source.indexOf("<ProjectAppointmentsPanel");
    const attachmentsIndex = source.indexOf("<ProjectAttachmentsPanel");
    const tagsIndex = source.indexOf("<TagPickerPanel");

    expect(notesIndex).toBeGreaterThan(-1);
    expect(appointmentsIndex).toBeGreaterThan(-1);
    expect(attachmentsIndex).toBeGreaterThan(-1);
    expect(tagsIndex).toBeGreaterThan(-1);
    expect(appointmentsIndex).toBeLessThan(attachmentsIndex);
    expect(attachmentsIndex).toBeLessThan(tagsIndex);
    expect(tagsIndex).toBeLessThan(notesIndex);
  });

  it("defines explicit main-column and sidebar markers and keeps notes out of the left flow", () => {
    expect(source).toContain('data-testid="project-form-main-column"');
    expect(source).toContain('data-testid="project-form-sidebar"');
    expect(source).not.toContain("/* Notizen - nur bei Bearbeitung */");
    expect(source.indexOf("<NotesSection")).toBeGreaterThan(source.indexOf('data-testid="project-form-sidebar"'));
  });
});
