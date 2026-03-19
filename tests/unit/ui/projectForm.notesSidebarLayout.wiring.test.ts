/**
 * Test Scope:
 *
 * Feature: FT02/FT13 - Projektformular Notizen in Sidebar
 * Use Case: UC Projektnotizen im Bearbeitungsformular rechts einsortieren
 *
 * Abgedeckte Regeln:
 * - ProjectForm rendert Notizen im Bearbeitungsmodus in der rechten Sidebar.
 * - Notizen folgen in der Sidebar auf Termine, Anhaenge und Tags.
 * - Im Hauptbereich bleibt keine inline-Notizsektion zurueck.
 *
 * Fehlerfaelle:
 * - Notizen erscheinen weiterhin im linken Formularfluss.
 * - Die Sidebar-Reihenfolge driftet und Notizen stehen nicht mehr am Ende.
 *
 * Ziel:
 * Die geplante Umsortierung der Projektnotizen source-basiert regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT02/FT13 ProjectForm notes sidebar layout wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/ProjectForm.tsx");
  const source = readFileSync(filePath, "utf8");

  it("renders NotesSection after the sidebar panels in edit mode", () => {
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

  it("keeps the notes block out of the former inline left-column slot", () => {
    expect(source).not.toContain("/* Notizen - nur bei Bearbeitung */");
    expect(source).toContain("{isEditing ? (");
  });
});
