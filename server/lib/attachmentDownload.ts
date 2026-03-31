import path from "path";
import type { Response } from "express";
import { resolveExistingAttachmentPath, sanitizeFilename } from "./attachmentFiles";

type DownloadMeta = {
  mimeType: string | null | undefined;
  filename: string;
  storagePath?: string | null;
  originalName: string;
};

function resolveDisposition(mimeType: string, forceDownload: boolean): "inline" | "attachment" {
  if (forceDownload) return "attachment";
  if (mimeType === "application/pdf" || mimeType.startsWith("image/")) {
    return "inline";
  }
  return "attachment";
}

export async function sendAttachmentDownload(res: Response, meta: DownloadMeta, forceDownload: boolean): Promise<void> {
  const mimeType = meta.mimeType || "application/octet-stream";
  const disposition = resolveDisposition(mimeType, forceDownload);
  const safeName = sanitizeFilename(meta.originalName);
  const filePath = await resolveExistingAttachmentPath(meta.filename, meta.storagePath);

  res.setHeader("Content-Type", mimeType);
  res.setHeader("Content-Disposition", `${disposition}; filename="${safeName}"`);
  res.sendFile(path.resolve(filePath));
}
