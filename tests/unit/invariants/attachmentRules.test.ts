import { describe, expect, it, vi } from "vitest";

vi.mock("../../../server/services/projectAttachmentsService", () => ({
  listProjectAttachments: vi.fn(),
  createProjectAttachment: vi.fn(),
  getProjectAttachmentById: vi.fn(),
}));

vi.mock("../../../server/lib/attachmentFiles", () => ({
  MAX_UPLOAD_BYTES: 10 * 1024 * 1024,
  buildStoredFilename: vi.fn(),
  resolveMimeType: vi.fn(),
  sanitizeFilename: vi.fn((name: string) => name),
  writeAttachmentBuffer: vi.fn(),
}));

vi.mock("../../../server/lib/multipart", () => ({
  parseMultipartFile: vi.fn(),
}));

import { deleteProjectAttachment } from "../../../server/controllers/projectAttachmentsController";
import { sendAttachmentDownload } from "../../../server/lib/attachmentDownload";

describe("PKG-05 Invariant: attachment security rules", () => {
  it("returns 405 for project attachment delete endpoint", async () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await deleteProjectAttachment({} as any, res, next);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ message: "Attachment deletion is disabled" });
    expect(next).not.toHaveBeenCalled();
  });

  it("uses inline disposition for PDF when download is not forced", () => {
    const res = {
      setHeader: vi.fn(),
      sendFile: vi.fn(),
    } as any;

    sendAttachmentDownload(
      res,
      {
        mimeType: "application/pdf",
        storagePath: "./server/uploads/a.pdf",
        originalName: "a.pdf",
      },
      false,
    );

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
    expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", 'inline; filename="a.pdf"');
    expect(res.sendFile).toHaveBeenCalledOnce();
  });

  it("uses inline disposition for image mime types when download is not forced", () => {
    const res = {
      setHeader: vi.fn(),
      sendFile: vi.fn(),
    } as any;

    sendAttachmentDownload(
      res,
      {
        mimeType: "image/png",
        storagePath: "./server/uploads/image.png",
        originalName: "image.png",
      },
      false,
    );

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/png");
    expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", 'inline; filename="image.png"');
    expect(res.sendFile).toHaveBeenCalledOnce();
  });

  it("uses attachment disposition for non-inline mimes when download is not forced", () => {
    const res = {
      setHeader: vi.fn(),
      sendFile: vi.fn(),
    } as any;

    sendAttachmentDownload(
      res,
      {
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
    expect(res.sendFile).toHaveBeenCalledOnce();
  });

  it("forces attachment disposition regardless of mime type when download flag is set", () => {
    const res = {
      setHeader: vi.fn(),
      sendFile: vi.fn(),
    } as any;

    sendAttachmentDownload(
      res,
      {
        mimeType: "application/pdf",
        storagePath: "./server/uploads/forced.pdf",
        originalName: "forced.pdf",
      },
      true,
    );

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
    expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", 'attachment; filename="forced.pdf"');
    expect(res.sendFile).toHaveBeenCalledOnce();
  });
});
