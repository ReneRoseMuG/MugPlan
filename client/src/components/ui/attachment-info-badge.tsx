import { FileText, Image as ImageIcon, Paperclip } from "lucide-react";
import type { ProjectAttachment } from "@shared/schema";
import { InfoBadge } from "@/components/ui/info-badge";
import { createAttachmentInfoBadgePreview } from "@/components/ui/badge-previews/attachment-info-badge-preview";

interface AttachmentInfoBadgeProps {
  attachment: ProjectAttachment;
  onRemove?: () => void;
  actionDisabled?: boolean;
  downloadUrl: string;
  openUrl: string;
  testId?: string;
}

function resolveAttachmentIcon(attachment: ProjectAttachment) {
  const mimeType = attachment.mimeType ?? "";
  const name = attachment.originalName.toLowerCase();
  const isPdf = mimeType === "application/pdf" || name.endsWith(".pdf");
  const isImage = mimeType.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(name);

  if (isImage) {
    return <ImageIcon className="h-4 w-4" />;
  }
  if (isPdf) {
    return <FileText className="h-4 w-4" />;
  }
  return <Paperclip className="h-4 w-4" />;
}

export function AttachmentInfoBadge({
  attachment,
  onRemove,
  actionDisabled,
  downloadUrl,
  openUrl,
  testId,
}: AttachmentInfoBadgeProps) {
  return (
    <InfoBadge
      icon={resolveAttachmentIcon(attachment)}
      label={<span className="truncate">{attachment.originalName}</span>}
      action="remove"
      onRemove={onRemove}
      actionDisabled={actionDisabled}
      fullWidth
      testId={testId}
      preview={createAttachmentInfoBadgePreview({
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        openUrl,
        downloadUrl,
      })}
    />
  );
}
