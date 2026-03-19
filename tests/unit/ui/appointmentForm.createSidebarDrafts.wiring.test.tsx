/**
 * Test Scope:
 *
 * Feature: FT01/FT20/FT24 - Neuer Termin Sidebar-Drafts
 *
 * Abgedeckte Regeln:
 * - Das Terminformular fuehrt Tags, Notizen und Terminanhaenge im Create-Fall lokal als Draft.
 * - Die rechte Sidebar bleibt auch ohne appointmentId aktiv und verdrahtet die Draft-Daten in die bestehenden Panels.
 * - Der erste erfolgreiche Create-Save persistiert die Draft-Inhalte anschliessend ueber die bestehenden Termin-Endpunkte.
 * - Dokumentextraktion legt die Extraktionsdatei im Create-Fall zusaetzlich als pending Terminanhang ab.
 *
 * Fehlerfaelle:
 * - Create-Sidebar verschwindet erneut oder bleibt read-only.
 * - Draft-Tags, Draft-Notizen oder pending Terminanhaenge werden vor dem ersten Save nicht angezeigt.
 * - Nach dem ersten Save werden die Draft-Daten nicht an den erzeugten Termin nachpersistiert.
 *
 * Ziel:
 * Die Create-spezifische Sidebar-Orchestrierung repo-konform ueber Source-Wiring regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT01 UI: appointment form create sidebar drafts wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentForm.tsx");
  const source = readFileSync(filePath, "utf8");

  it("keeps local draft state for create tags, notes and attachments", () => {
    expect(source).toContain("const [draftAppointmentTags, setDraftAppointmentTags] = useState<TagRelationItem[]>([]);");
    expect(source).toContain("const [draftAppointmentNotes, setDraftAppointmentNotes] = useState<DraftAppointmentNote[]>([]);");
    expect(source).toContain("const [draftAppointmentAttachments, setDraftAppointmentAttachments] = useState<PendingAppointmentAttachmentItem[]>([]);");
    expect(source).toContain("const visibleAppointmentTags = isEditing ? appointmentTagRelations : draftAppointmentTags;");
    expect(source).toContain("const visibleAppointmentNotes = isEditing ? appointmentNotes : draftAppointmentNotes;");
  });

  it("loads the tag catalog for create mode and wires sidebar panels to draft handlers", () => {
    expect(source).toContain("queryKey: [\"/api/tags\"]");
    expect(source).toContain("queryFn: () => fetchJson<Tag[]>(\"/api/tags\")");
    expect(source).not.toContain("queryFn: () => fetchJson<Tag[]>(\"/api/tags\"),\n    enabled: Boolean(appointmentId),");
    expect(source).toContain("pendingAppointmentAttachments={isEditing ? undefined : draftAppointmentAttachments}");
    expect(source).toContain("onUploadPendingAppointmentAttachment={isEditing ? undefined : addDraftAppointmentAttachment}");
    expect(source).toContain("addDraftAppointmentTag(tagId);");
    expect(source).toContain("removeDraftAppointmentTag(item);");
    expect(source).toContain("addDraftAppointmentNote(data);");
    expect(source).toContain("updateDraftAppointmentNote(noteId, data);");
    expect(source).toContain("toggleDraftAppointmentNotePin(id, isPinned);");
    expect(source).toContain("deleteDraftAppointmentNote(noteId);");
  });

  it("persists create sidebar drafts after the first successful appointment create", () => {
    expect(source).toContain("const persistDraftAppointmentTags = async (targetAppointmentId: number) => {");
    expect(source).toContain("const persistDraftAppointmentNotes = async (targetAppointmentId: number) => {");
    expect(source).toContain("const persistDraftAppointmentAttachments = async (targetAppointmentId: number) => {");
    expect(source).toContain("const persistCreateSidebarDrafts = async (targetAppointmentId: number) => {");
    expect(source).toContain("await persistDraftAppointmentTags(targetAppointmentId);");
    expect(source).toContain("await persistDraftAppointmentNotes(targetAppointmentId);");
    expect(source).toContain("await persistDraftAppointmentAttachments(targetAppointmentId);");
    expect(source).toContain("if (!isEditing) {");
    expect(source).toContain("await persistCreateSidebarDrafts(savedAppointmentId);");
    expect(source).toContain("setDraftAppointmentTags([]);");
    expect(source).toContain("setDraftAppointmentNotes([]);");
    expect(source).toContain("setDraftAppointmentAttachments([]);");
  });

  it("adds a successful extraction file to the pending appointment attachments", () => {
    expect(source).toContain("const runDocumentExtraction = async (file: File) => {");
    expect(source).toContain("if (!response.ok) {");
    expect(source).toContain("addDraftAppointmentAttachment(file);");
    expect(source).toContain("setDocumentExtractionOpen(true);");
  });

  it("removes the extraction draft attachment only after a linked project handoff", () => {
    expect(source).toContain("const matchesAttachmentFileSignature = (attachment: PendingAppointmentAttachmentItem, file: File) =>");
    expect(source).toContain("const removeDraftAppointmentAttachmentForFile = (file: File) => {");
    expect(source).toContain("current.filter((attachment) => !matchesAttachmentFileSignature(attachment, file))");
    expect(source).toContain("if (result?.attachmentLinked && pendingProjectDraft?.documentFile) {");
  });
});
