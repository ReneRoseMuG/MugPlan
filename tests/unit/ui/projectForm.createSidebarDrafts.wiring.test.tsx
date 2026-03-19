/**
 * Test Scope:
 *
 * Feature: FT02/FT13/FT24 - Neues Projekt Sidebar-Drafts
 *
 * Abgedeckte Regeln:
 * - Das Projektformular fuehrt Tags, Notizen und Projektanhaenge im Create-Fall lokal als Draft.
 * - Die rechte Sidebar bleibt auch ohne projectId aktiv und verdrahtet die Draft-Daten in die bestehenden Panels.
 * - Der erste erfolgreiche Create-Save persistiert die Draft-Inhalte anschliessend ueber die bestehenden Projekt-Endpunkte.
 * - Dokumentextraktion legt die Extraktionsdatei im Create-Fall zusaetzlich als pending Projektanhang ab.
 *
 * Fehlerfaelle:
 * - Create-Sidebar verschwindet erneut oder bleibt read-only.
 * - Draft-Tags, Draft-Notizen oder pending Projektanhaenge werden vor dem ersten Save nicht angezeigt.
 * - Nach dem ersten Save werden die Draft-Daten nicht an das erzeugte Projekt nachpersistiert.
 *
 * Ziel:
 * Die Create-spezifische Sidebar-Orchestrierung des Projektformulars repo-konform ueber Source-Wiring absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT02 UI: project form create sidebar drafts wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/ProjectForm.tsx");
  const source = readFileSync(filePath, "utf8");

  it("keeps local draft state for create tags, notes and attachments", () => {
    expect(source).toContain("const [draftProjectTags, setDraftProjectTags] = useState<TagRelationItem[]>([]);");
    expect(source).toContain("const [draftProjectNotes, setDraftProjectNotes] = useState<DraftProjectNote[]>([]);");
    expect(source).toContain("const [draftProjectAttachments, setDraftProjectAttachments] = useState<PendingProjectAttachmentItem[]>([]);");
    expect(source).toContain("const visibleProjectTags = isEditing ? assignedTags : draftProjectTags;");
    expect(source).toContain("const visibleProjectNotes = isEditing ? projectNotes : draftProjectNotes;");
  });

  it("loads the tag catalog for create mode and wires sidebar panels to draft handlers", () => {
    expect(source).toContain("queryKey: ['/api/tags']");
    expect(source).not.toContain("queryKey: ['/api/tags'],\n    enabled: isEditing,");
    expect(source).toContain("pendingProjectAttachments={isEditing ? undefined : draftProjectAttachments}");
    expect(source).toContain("onUploadPendingProjectAttachment={isEditing ? undefined : addDraftProjectAttachment}");
    expect(source).toContain("addDraftProjectTag(tagId);");
    expect(source).toContain("removeDraftProjectTag(item);");
    expect(source).toContain("addDraftProjectNote(data);");
    expect(source).toContain("updateDraftProjectNote(noteId, data);");
    expect(source).toContain("toggleDraftProjectNotePin(id, isPinned);");
    expect(source).toContain("deleteDraftProjectNote(noteId);");
  });

  it("persists create sidebar drafts after the first successful project create", () => {
    expect(source).toContain("const persistDraftProjectTags = async (targetProjectId: number) => {");
    expect(source).toContain("const persistDraftProjectNotes = async (targetProjectId: number) => {");
    expect(source).toContain("const persistDraftProjectAttachments = async (targetProjectId: number) => {");
    expect(source).toContain("const persistCreateSidebarDrafts = async (targetProjectId: number) => {");
    expect(source).toContain("await persistDraftProjectTags(targetProjectId);");
    expect(source).toContain("await persistDraftProjectNotes(targetProjectId);");
    expect(source).toContain("return persistDraftProjectAttachments(targetProjectId);");
    expect(source).toContain("extractionAttachmentLinked = await persistCreateSidebarDrafts(createdProject.id);");
    expect(source).toContain("setDraftProjectTags([]);");
    expect(source).toContain("setDraftProjectNotes([]);");
    expect(source).toContain("setDraftProjectAttachments([]);");
  });

  it("adds a successful extraction file to the pending project attachments", () => {
    expect(source).toContain("const runDocumentExtraction = async (file: File) => {");
    expect(source).toContain("setDocumentExtractionFile(file);");
    expect(source).toContain("addDraftProjectAttachment(file);");
    expect(source).toContain("setDocumentExtractionOpen(true);");
  });
});
