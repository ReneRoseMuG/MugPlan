import { FileText, Paperclip } from "lucide-react";
import {
  AttachmentPreviewTrigger,
  parseAttachmentPreviewSize,
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

function AttachmentThumbnail({ attachment }: { attachment: AppointmentAttachmentItem }) {
  const isImage = resolveIsImage(attachment);
  const isPdf = resolveIsPdf(attachment);

  return (
    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
      {isImage ? (
        <img src={attachment.openUrl} alt={attachment.originalName} className="h-full w-full object-cover" />
      ) : isPdf ? (
        <FileText className="h-7 w-7 text-red-600" />
      ) : (
        <div className="flex flex-col items-center gap-1 text-slate-500">
          <Paperclip className="h-5 w-5" />
          <span className="text-[9px] font-semibold">Datei</span>
        </div>
      )}
    </div>
  );
}

export function CalendarWeekAppointmentAttachmentsGallery({
  attachments,
}: {
  attachments: AppointmentAttachmentItem[];
}) {
  const attachmentPreviewSize = parseAttachmentPreviewSize(useSetting("attachmentPreviewSize"));
  const visibleAttachments = attachments.slice(0, 4);
  const hiddenCount = Math.max(0, attachments.length - visibleAttachments.length);

  return (
    <div className="inline-flex flex-col gap-2">
      <div className="text-[10px] font-semibold tracking-wide text-slate-500">
        Anhaenge ({attachments.length})
      </div>
      <div className="flex flex-wrap gap-2">
        {visibleAttachments.map((attachment) => (
          <AttachmentPreviewTrigger
            key={`${attachment.sourceType}-${attachment.id}`}
            originalName={attachment.originalName}
            mimeType={attachment.mimeType}
            openUrl={attachment.openUrl}
            downloadUrl={attachment.downloadUrl}
            previewSize={attachmentPreviewSize}
          >
            <div className="cursor-pointer space-y-1">
              <AttachmentThumbnail attachment={attachment} />
              <div className="w-16 truncate text-[9px] font-semibold text-slate-600">{attachment.sourceLabel}</div>
              <div className="w-16 truncate text-[9px] text-slate-500">{attachment.originalName}</div>
            </div>
          </AttachmentPreviewTrigger>
        ))}
        {hiddenCount > 0 ? (
          <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-xs font-semibold text-slate-500">
            +{hiddenCount}
          </div>
        ) : null}
      </div>
    </div>
  );
}
