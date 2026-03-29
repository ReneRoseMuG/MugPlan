import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Paperclip } from "lucide-react";
import { CalendarWeekAppointmentAttachmentsGallery } from "@/components/calendar/CalendarWeekAppointmentAttachmentsGallery";
import {
  AttachmentInfoBadgePreview,
  AttachmentPreviewTrigger,
  parseAttachmentPreviewSize,
  resolveAttachmentPreviewDimensions,
} from "@/components/ui/badge-previews/attachment-info-badge-preview";
import { FooterChildCollectionBadge } from "@/components/ui/footer-child-collection-badge";
import { HoverPreview } from "@/components/ui/hover-preview";
import { useSetting } from "@/hooks/useSettings";

type CustomerAttachmentItem = {
  id: number;
  originalName: string;
  mimeType: string | null;
};

type PreviewAttachmentItem = CustomerAttachmentItem & {
  sourceType: "customer";
  sourceLabel: string;
  openUrl: string;
  downloadUrl: string;
};

function buildPreviewAttachments(items: CustomerAttachmentItem[] | undefined): PreviewAttachmentItem[] {
  if (!items) return [];
  return items.map((attachment) => ({
    ...attachment,
    sourceType: "customer" as const,
    sourceLabel: "Kunde",
    openUrl: `/api/customer-attachments/${attachment.id}/download`,
    downloadUrl: `/api/customer-attachments/${attachment.id}/download?download=1`,
  }));
}

function AttachmentGalleryPreviewContent({
  attachments,
  isLoading,
  isError,
}: {
  attachments: PreviewAttachmentItem[];
  isLoading: boolean;
  isError: boolean;
}) {
  if (isError) {
    return <div className="text-xs text-red-600">Anhänge konnten nicht geladen werden.</div>;
  }
  if (isLoading) {
    return <div className="text-xs text-slate-500">Anhänge werden geladen...</div>;
  }
  if (attachments.length === 0) {
    return <div className="text-xs text-slate-500">Keine Anhänge vorhanden.</div>;
  }
  return <CalendarWeekAppointmentAttachmentsGallery attachments={attachments} />;
}

export function CustomerAttachmentsHover({
  customerId,
  totalAttachmentsCount,
  fullWidth = false,
}: {
  customerId: number;
  totalAttachmentsCount: number;
  fullWidth?: boolean;
}) {
  const [shouldLoadPreview, setShouldLoadPreview] = useState(false);
  const attachmentPreviewSize = parseAttachmentPreviewSize(useSetting("attachmentPreviewSize"));
  const previewDimensions = resolveAttachmentPreviewDimensions(attachmentPreviewSize);
  const normalizedCount = Number.isFinite(totalAttachmentsCount)
    ? Math.max(0, totalAttachmentsCount)
    : 0;

  const attachmentsQuery = useQuery<CustomerAttachmentItem[]>({
    queryKey: ["/api/customers", customerId, "attachments"],
    enabled: shouldLoadPreview && normalizedCount > 0,
  });

  const attachments = buildPreviewAttachments(attachmentsQuery.data);
  const singleAttachment = normalizedCount === 1 ? (attachments[0] ?? null) : null;

  const triggerContent = (
    <FooterChildCollectionBadge
      icon={<Paperclip className="h-3 w-3" />}
      label="Anhänge"
      count={normalizedCount}
      testId={`customer-attachments-hover-trigger-${customerId}`}
      onHoverStart={() => setShouldLoadPreview(true)}
      fullWidth={fullWidth}
      inactive={normalizedCount <= 0}
    />
  );

  if (normalizedCount <= 0) {
    return (
      <HoverPreview
        preview={<div className="text-xs text-slate-500">Keine Anhänge vorhanden.</div>}
        closeDelay={120}
        side="right"
        align="start"
        maxWidth={260}
        className="z-[9999] w-[260px]"
      >
        {triggerContent}
      </HoverPreview>
    );
  }

  if (normalizedCount === 1) {
    return (
      <AttachmentPreviewTrigger
        originalName={singleAttachment?.originalName ?? "Anhang"}
        mimeType={singleAttachment?.mimeType ?? null}
        openUrl={singleAttachment?.openUrl ?? `#customer-${customerId}-attachment-preview`}
        downloadUrl={singleAttachment?.downloadUrl ?? `#customer-${customerId}-attachment-download`}
        previewSize={attachmentPreviewSize}
        renderPreviewContent={({ onClose, onDragHandleMouseDown }) => {
          if (attachmentsQuery.isError) {
            return <div className="text-xs text-red-600">Anhang konnte nicht geladen werden.</div>;
          }
          if (attachmentsQuery.isLoading) {
            return <div className="text-xs text-slate-500">Anhang wird geladen...</div>;
          }
          if (!singleAttachment) {
            return <div className="text-xs text-slate-500">Keine Anhänge vorhanden.</div>;
          }

          return (
            <AttachmentInfoBadgePreview
              originalName={singleAttachment.originalName}
              mimeType={singleAttachment.mimeType}
              openUrl={singleAttachment.openUrl}
              downloadUrl={singleAttachment.downloadUrl}
              previewSize={attachmentPreviewSize}
              onClose={onClose}
              onDragHandleMouseDown={onDragHandleMouseDown}
            />
          );
        }}
      >
        {triggerContent}
      </AttachmentPreviewTrigger>
    );
  }

  return (
    <HoverPreview
      preview={(
        <AttachmentGalleryPreviewContent
          attachments={attachments}
          isLoading={attachmentsQuery.isLoading}
          isError={attachmentsQuery.isError}
        />
      )}
      closeDelay={800}
      side="right"
      align="end"
      sideOffset={10}
      collisionPadding={24}
      maxWidth={previewDimensions.popoverMaxWidth}
      className="z-[9999] w-auto"
      contentClassName="w-fit space-y-2"
    >
      {triggerContent}
    </HoverPreview>
  );
}
