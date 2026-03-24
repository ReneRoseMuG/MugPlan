import type { ReactNode } from "react";
import { FileText, Image as ImageIcon, Paperclip } from "lucide-react";
import { InfoBadge } from "@/components/ui/info-badge";
import {
  AttachmentPreviewTrigger,
  createAttachmentInfoBadgePreview,
} from "@/components/ui/badge-previews/attachment-info-badge-preview";
import { useSetting } from "@/hooks/useSettings";

export interface AttachmentBadgeItem {
  id: number;
  originalName: string;
  mimeType: string | null;
}

interface AttachmentInfoBadgeProps {
  attachment: AttachmentBadgeItem;
  onRemove?: () => void;
  actionDisabled?: boolean;
  actionSlot?: ReactNode;
  downloadUrl: string;
  openUrl: string;
  testId?: string;
  draggable?: boolean;
}

function resolveAttachmentIcon(attachment: AttachmentBadgeItem) {
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
  actionSlot,
  downloadUrl,
  openUrl,
  testId,
  draggable = true,
}: AttachmentInfoBadgeProps) {
  const previewSize = useSetting("attachmentPreviewSize");

  const badge = (
    <InfoBadge
      icon={resolveAttachmentIcon(attachment)}
      label={<span className="block max-w-full truncate">{attachment.originalName}</span>}
      action={onRemove ? "remove" : "none"}
      onRemove={onRemove}
      actionDisabled={actionDisabled}
      customAction={actionSlot}
      fullWidth
      testId={testId}
    />
  );

  if (draggable) {
    return (
      <AttachmentPreviewTrigger
        originalName={attachment.originalName}
        mimeType={attachment.mimeType}
        openUrl={openUrl}
        downloadUrl={downloadUrl}
        previewSize={previewSize}
        testId={testId}
      >
        {badge}
      </AttachmentPreviewTrigger>
    );
  }

  return (
    <InfoBadge
      icon={resolveAttachmentIcon(attachment)}
      label={<span className="block max-w-full truncate">{attachment.originalName}</span>}
      action={onRemove ? "remove" : "none"}
      onRemove={onRemove}
      actionDisabled={actionDisabled}
      customAction={actionSlot}
      fullWidth
      testId={testId}
      preview={createAttachmentInfoBadgePreview({
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        openUrl,
        downloadUrl,
        previewSize,
      })}
    />
  );
}
