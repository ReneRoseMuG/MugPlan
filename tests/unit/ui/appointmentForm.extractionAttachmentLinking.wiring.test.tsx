/**
 * Test Scope:
 *
 * Feature: FT21/FT24 - Dokumentextraktion mit Attachment-Linking
 * Use Case: UC Terminformular Projektuebernahme
 *
 * Abgedeckte Regeln:
 * - Extraktionsdatei wird im State gehalten.
 * - Nach Projektanlage wird Duplikatpruefung fuer originalName aufgerufen.
 * - Bei Freigabe wird bestehender Projekt-Upload-Endpunkt mit multipart genutzt.
 *
 * Fehlerfaelle:
 * - Fehlende Attachment-Verknuepfung nach Projektanlage aus dem Extraktionsdialog.
 *
 * Ziel:
 * Verdrahtung des Datei-Reuse-Flows im Terminformular regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT21/FT24 unit: appointment extraction attachment linking", () => {
  const appointmentFormPath = path.resolve(process.cwd(), "client/src/components/AppointmentForm.tsx");
  const projectFormPath = path.resolve(process.cwd(), "client/src/components/ProjectForm.tsx");
  const appointmentSource = readFileSync(appointmentFormPath, "utf8");
  const projectSource = readFileSync(projectFormPath, "utf8");

  it("stores selected extraction file in component state", () => {
    expect(appointmentSource).toContain("const [documentExtractionFile, setDocumentExtractionFile] = useState<File | null>(null);");
    expect(appointmentSource).toContain("setDocumentExtractionFile(file);");
  });

  it("passes the extraction file into the project form and keeps duplicate-check upload on save", () => {
    expect(appointmentSource).toContain("documentFile: documentExtractionFile,");
    expect(appointmentSource).toContain("initialDocumentExtractionFile={pendingProjectDraft.documentFile}");

    expect(projectSource).toContain("if (createdProjectId && documentExtractionFile)");
    expect(projectSource).toContain("/api/attachments/duplicates/check-original-name");
    expect(projectSource).toContain("body: JSON.stringify({ originalName: documentExtractionFile.name })");
    expect(projectSource).toContain("window.confirm(");
    expect(projectSource).toContain("uploadData.append(\"file\", documentExtractionFile);");
    expect(projectSource).toContain("fetch(`/api/projects/${createdProjectId}/attachments`");
    expect(projectSource).toContain("invalidateQueries({ queryKey: [\"/api/projects\", createdProjectId, \"attachments\"] })");
  });
});
