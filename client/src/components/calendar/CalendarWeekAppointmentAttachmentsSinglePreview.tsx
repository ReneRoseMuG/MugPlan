import { FileText, Image as ImageIcon, Paperclip } from "lucide-react";

import {
  parseAttachmentPreviewSize,
  resolveAttachmentPreviewDimensions,
} from "@/components/ui/badge-previews/attachment-info-badge-preview";
import { useSetting } from "@/hooks/useSettings";

type AppointmentAttachmentItem = {
  id: number;
  originalName: string;
  mimeType: string | null;
  sourceType: "customer" | "project" | "appointment";
  sourceLabel: string;
  openUrl: string;
  downloadUrl: string;
};

function resolveIsPdf(attachment: AppointmentAttachmentItem) {
  const mimeType = attachment.mimeType ?? "";
  return mimeType === "application/pdf" || attachment.originalName.toLowerCase().endsWith(".pdf");
}

function resolveIsImage(attachment: AppointmentAttachmentItem) {
  const mimeType = attachment.mimeType ?? "";
  return mimeType.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(attachment.originalName);
}

export function CalendarWeekAppointmentAttachmentsSinglePreview({
  attachment,
}: {
  attachment?: AppointmentAttachmentItem | null;
}) {
  if (!attachment) {
    return <div className="text-xs text-slate-500">Anhang konnte nicht geladen werden.</div>;
  }

  const attachmentPreviewSize = parseAttachmentPreviewSize(useSetting("attachmentPreviewSize"));
  const dimensions = resolveAttachmentPreviewDimensions(attachmentPreviewSize);
  const isImage = resolveIsImage(attachment);
  const isPdf = resolveIsPdf(attachment);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-600">
            {attachment.sourceLabel}
          </div>
          <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800">
            {isImage ? <ImageIcon className="h-4 w-4 text-slate-500" /> : isPdf ? <FileText className="h-4 w-4 text-slate-500" /> : <Paperclip className="h-4 w-4 text-slate-500" />}
            <span className="truncate">{attachment.originalName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <a className="text-primary underline" href={attachment.openUrl} target="_blank" rel="noreferrer">Oeffnen</a>
          <a className="text-primary underline" href={attachment.downloadUrl} target="_blank" rel="noreferrer" download>Download</a>
        </div>
      </div>

      <div
        className="overflow-auto rounded-md border border-border bg-background p-2"
        style={{ maxHeight: dimensions.contentMaxHeight }}
      >
        {isPdf ? (
          <iframe
            title={`Vorschau ${attachment.originalName}`}
            src={attachment.openUrl}
            className="w-full border-0"
            style={{ height: dimensions.iframeHeight }}
          />
        ) : isImage ? (
          <img src={attachment.openUrl} alt={attachment.originalName} className="h-auto max-w-full rounded-sm" />
        ) : (
          <div className="space-y-2 text-sm text-slate-600">
            <p>Keine Inline-Vorschau verfuegbar.</p>
            <p className="truncate">{attachment.originalName}</p>
          </div>
        )}
      </div>
    </div>
  );
}
