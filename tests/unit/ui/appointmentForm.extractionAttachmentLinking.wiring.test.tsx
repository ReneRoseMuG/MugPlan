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
  const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentForm.tsx");
  const source = readFileSync(filePath, "utf8");

  it("stores selected extraction file in component state", () => {
    expect(source).toContain("const [documentExtractionFile, setDocumentExtractionFile] = useState<File | null>(null);");
    expect(source).toContain("setDocumentExtractionFile(file);");
  });

  it("checks duplicates and uploads extraction file via existing project attachments endpoint", () => {
    expect(source).toContain("/api/attachments/duplicates/check-original-name");
    expect(source).toContain("body: JSON.stringify({ originalName: documentExtractionFile.name })");
    expect(source).toContain("window.confirm(");
    expect(source).toContain("uploadData.append(\"file\", documentExtractionFile);");
    expect(source).toContain("fetch(`/api/projects/${createdProject.id}/attachments`");
    expect(source).toContain("invalidateQueries({ queryKey: [\"/api/projects\", createdProject.id, \"attachments\"] })");
  });
});
