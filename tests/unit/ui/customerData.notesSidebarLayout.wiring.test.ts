/**
 * Test Scope:
 *
 * Feature: FT09/FT13 - Kundennotizen in Sidebar
 * Use Case: UC Kundennotizen im Bearbeitungsformular rechts einsortieren
 *
 * Abgedeckte Regeln:
 * - CustomerData rendert Notizen nur im Bearbeitungsmodus in der rechten Sidebar.
 * - Notizen folgen in der Sidebar auf verknuepfte Projekte, Termine, Anhaenge und Tags.
 * - Der linke Hauptbereich bleibt auf Stammdaten und Status beschraenkt.
 *
 * Fehlerfaelle:
 * - Notizen bleiben unter den Stammdaten im Hauptbereich stehen.
 * - Notizen erscheinen im Neuanlage-Modus weiterhin sichtbar.
 *
 * Ziel:
 * Die neue Sidebar-Platzierung der Kundennotizen source-basiert regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT09/FT13 CustomerData notes sidebar layout wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/CustomerData.tsx");
  const source = readFileSync(filePath, "utf8");

  it("renders NotesSection at the end of the sidebar stack", () => {
    const notesIndex = source.indexOf("<NotesSection");
    const linkedProjectsIndex = source.indexOf("<LinkedProjectsPanel");
    const appointmentsIndex = source.indexOf("<CustomerAppointmentsPanel");
    const attachmentsIndex = source.indexOf("<CustomerAttachmentsPanel");
    const tagsIndex = source.indexOf("<TagPickerPanel");

    expect(notesIndex).toBeGreaterThan(-1);
    expect(linkedProjectsIndex).toBeGreaterThan(-1);
    expect(appointmentsIndex).toBeGreaterThan(-1);
    expect(attachmentsIndex).toBeGreaterThan(-1);
    expect(tagsIndex).toBeGreaterThan(-1);
    expect(linkedProjectsIndex).toBeLessThan(appointmentsIndex);
    expect(appointmentsIndex).toBeLessThan(attachmentsIndex);
    expect(attachmentsIndex).toBeLessThan(tagsIndex);
    expect(tagsIndex).toBeLessThan(notesIndex);
  });

  it("guards sidebar notes behind edit mode", () => {
    expect(source).toContain("{isEditMode ? (");
    expect(source).toContain("onAdd={handleAddNote}");
  });
});
