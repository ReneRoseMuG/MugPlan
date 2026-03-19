import { FileText, Image as ImageIcon, Paperclip } from "lucide-react";

type AppointmentAttachmentItem = {
  id: number;
  originalName: string;
  mimeType: string | null;
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

  const openUrl = `/api/appointment-attachments/${attachment.id}/download`;
  const downloadUrl = `${openUrl}?download=1`;
  const isImage = resolveIsImage(attachment);
  const isPdf = resolveIsPdf(attachment);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800">
          {isImage ? <ImageIcon className="h-4 w-4 text-slate-500" /> : isPdf ? <FileText className="h-4 w-4 text-slate-500" /> : <Paperclip className="h-4 w-4 text-slate-500" />}
          <span className="truncate">{attachment.originalName}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <a className="text-primary underline" href={openUrl} target="_blank" rel="noreferrer">Oeffnen</a>
          <a className="text-primary underline" href={downloadUrl} target="_blank" rel="noreferrer" download>Download</a>
        </div>
      </div>

      <div className="overflow-auto rounded-md border border-border bg-background p-2" style={{ maxHeight: 320 }}>
        {isPdf ? (
          <iframe
            title={`Vorschau ${attachment.originalName}`}
            src={openUrl}
            className="w-full border-0"
            style={{ height: 280 }}
          />
        ) : isImage ? (
          <img src={openUrl} alt={attachment.originalName} className="h-auto max-w-full rounded-sm" />
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
