import path from "path";
import type { Response } from "express";
import { sanitizeFilename } from "./attachmentFiles";

type DownloadMeta = {
  mimeType: string | null | undefined;
  storagePath: string;
  originalName: string;
};

function resolveDisposition(mimeType: string, forceDownload: boolean): "inline" | "attachment" {
  if (forceDownload) return "attachment";
  if (mimeType === "application/pdf" || mimeType.startsWith("image/")) {
    return "inline";
  }
  return "attachment";
}

export function sendAttachmentDownload(res: Response, meta: DownloadMeta, forceDownload: boolean): void {
  const mimeType = meta.mimeType || "application/octet-stream";
  const disposition = resolveDisposition(mimeType, forceDownload);
  const safeName = sanitizeFilename(meta.originalName);

  res.setHeader("Content-Type", mimeType);
  res.setHeader("Content-Disposition", `${disposition}; filename="${safeName}"`);
  res.sendFile(path.resolve(meta.storagePath));
}
