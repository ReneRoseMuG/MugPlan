/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Projektattachment-Delete ist nur fuer ADMIN und DISPONENT erlaubt.
 * - Erfolgreicher Projektattachment-Delete fuehrt den Soft-Delete-Flow aus.
 * - Downloadpfade werden aus dem gespeicherten Dateinamen statt aus Legacy-Pfaden aufgeloest.
 *
 * Fehlerfaelle:
 * - Unberechtigte Rollen koennen Attachments loeschen.
 *
 * Ziel:
 * Zentrale Attachment-Sicherheitsregeln absichern.
 */
import { describe, expect, it, vi } from "vitest";
import path from "path";

vi.mock("../../../server/services/projectAttachmentsService", () => ({
  listProjectAttachments: vi.fn(),
  createProjectAttachment: vi.fn(),
  getProjectAttachmentById: vi.fn(),
  softDeleteProjectAttachment: vi.fn(),
}));

vi.mock("../../../server/lib/attachmentFiles", () => ({
  MAX_UPLOAD_BYTES: 10 * 1024 * 1024,
  buildStoredFilename: vi.fn(),
  deleteAttachmentFile: vi.fn(),
  resolveExistingAttachmentPath: vi.fn(),
  resolveMimeType: vi.fn(),
  sanitizeFilename: vi.fn((name: string) => name),
  writeAttachmentBuffer: vi.fn(),
}));

vi.mock("../../../server/lib/multipart", () => ({
  parseMultipartFile: vi.fn(),
}));

import { deleteProjectAttachment } from "../../../server/controllers/projectAttachmentsController";
import { sendAttachmentDownload } from "../../../server/lib/attachmentDownload";
import * as attachmentFiles from "../../../server/lib/attachmentFiles";
import * as projectAttachmentsService from "../../../server/services/projectAttachmentsService";

describe("PKG-05 Invariant: attachment security rules", () => {
  it("returns 403 for project attachment delete when role is not allowed", async () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await deleteProjectAttachment({ userContext: { roleKey: "READER" } } as any, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ code: "FORBIDDEN" });
    expect(projectAttachmentsService.getProjectAttachmentById).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("soft-deletes an existing project attachment for privileged roles", async () => {
    vi.mocked(projectAttachmentsService.getProjectAttachmentById).mockResolvedValueOnce({
      id: 42,
      storagePath: "./server/uploads/test.pdf",
    } as any);
    vi.mocked(projectAttachmentsService.softDeleteProjectAttachment).mockResolvedValueOnce(undefined as never);

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await deleteProjectAttachment(
      {
        userContext: { roleKey: "ADMIN" },
        params: { id: "42" },
        query: {},
      } as any,
      res,
      next,
    );

    expect(projectAttachmentsService.getProjectAttachmentById).toHaveBeenCalledWith(42);
    expect(projectAttachmentsService.softDeleteProjectAttachment).toHaveBeenCalledWith(42);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Anhang gelöscht" });
    expect(next).not.toHaveBeenCalled();
  });

  it("uses inline disposition for PDF when download is not forced", async () => {
    const res = {
      setHeader: vi.fn(),
      sendFile: vi.fn(),
    } as any;
    vi.mocked(attachmentFiles.resolveExistingAttachmentPath).mockResolvedValueOnce("/resolved/a.pdf");

    await sendAttachmentDownload(
      res,
      {
        filename: "a.pdf",
        mimeType: "application/pdf",
        storagePath: "./server/uploads/a.pdf",
        originalName: "a.pdf",
      },
      false,
    );

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
    expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", 'inline; filename="a.pdf"');
    expect(attachmentFiles.resolveExistingAttachmentPath).toHaveBeenCalledWith("a.pdf", "./server/uploads/a.pdf");
    expect(res.sendFile).toHaveBeenCalledWith(path.resolve("/resolved/a.pdf"));
  });

  it("uses inline disposition for image mime types when download is not forced", async () => {
    const res = {
      setHeader: vi.fn(),
      sendFile: vi.fn(),
    } as any;
    vi.mocked(attachmentFiles.resolveExistingAttachmentPath).mockResolvedValueOnce("/resolved/image.png");

    await sendAttachmentDownload(
      res,
      {
        filename: "image.png",
        mimeType: "image/png",
        storagePath: "./server/uploads/image.png",
        originalName: "image.png",
      },
      false,
    );

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/png");
    expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", 'inline; filename="image.png"');
    expect(res.sendFile).toHaveBeenCalledWith(path.resolve("/resolved/image.png"));
  });

  it("uses attachment disposition for non-inline mimes when download is not forced", async () => {
    const res = {
      setHeader: vi.fn(),
      sendFile: vi.fn(),
    } as any;
    vi.mocked(attachmentFiles.resolveExistingAttachmentPath).mockResolvedValueOnce("/resolved/file.docx");

    await sendAttachmentDownload(
      res,
      {
        filename: "file.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        storagePath: "./server/uploads/file.docx",
        originalName: "file.docx",
      },
      false,
    );

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", 'attachment; filename="file.docx"');
    expect(res.sendFile).toHaveBeenCalledWith(path.resolve("/resolved/file.docx"));
  });

  it("forces attachment disposition regardless of mime type when download flag is set", async () => {
    const res = {
      setHeader: vi.fn(),
      sendFile: vi.fn(),
    } as any;
    vi.mocked(attachmentFiles.resolveExistingAttachmentPath).mockResolvedValueOnce("/resolved/forced.pdf");

    await sendAttachmentDownload(
      res,
      {
        filename: "forced.pdf",
        mimeType: "application/pdf",
        storagePath: "./server/uploads/forced.pdf",
        originalName: "forced.pdf",
      },
      true,
    );

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
    expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", 'attachment; filename="forced.pdf"');
    expect(res.sendFile).toHaveBeenCalledWith(path.resolve("/resolved/forced.pdf"));
  });
});
