/**
 * Test Scope:
 *
 * Feature: FT01/FT09/FT13 - Terminformular Notizen
 * Use Case: UC Terminformular bindet Notizen auf Termin-Ebene mit bestehender NotesSection an
 *
 * Abgedeckte Regeln:
 * - AppointmentForm laedt Terminnotizen ueber /api/appointments/:id/notes.
 * - AppointmentForm nutzt NotesSection im Edit-Modus.
 * - Create/Delete laufen ueber termin-spezifische Notes-Endpunkte.
 * - Pin-Update laeuft ueber den zentralen /api/notes/:id/pin-Endpunkt.
 * - Notiz-Mutationen invalidieren Terminnotizen sowie Terminprojektionen.
 *
 * Fehlerfaelle:
 * - Terminnotizen werden nicht im Formular geladen.
 * - Mutationen laufen nicht ueber die vorgesehenen Endpunkte.
 *
 * Ziel:
 * Verdrahtung der neuen Termin-Notizen im AppointmentForm regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT01 UI: appointment form notes wiring", () => {
  it("loads and mutates appointment scoped notes via dedicated endpoints", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentForm.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("queryKey: [\"/api/appointments\", appointmentId, \"notes\"]");
    expect(source).toContain("fetchJson<Note[]>(`/api/appointments/${appointmentId}/notes`)");
    expect(source).toContain("apiRequest(\"POST\", `/api/appointments/${appointmentId}/notes`");
    expect(source).toContain("apiRequest(\"PATCH\", `/api/notes/${noteId}/pin`");
    expect(source).toContain("apiRequest(\"DELETE\", `/api/appointments/${appointmentId}/notes/${noteId}`");
    expect(source).toContain("invalidateAppointmentNotesQueries");
    expect(source).toContain("invalidateRelatedAppointmentQueries");
    expect(source).toContain("<NotesSection");
  });
});
