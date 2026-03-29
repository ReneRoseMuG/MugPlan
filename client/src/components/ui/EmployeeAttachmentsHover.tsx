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
import type { EmployeeAttachment } from "@shared/schema";

type PreviewAttachmentItem = Pick<EmployeeAttachment, "id" | "originalName" | "mimeType"> & {
  sourceType: "employee";
  sourceLabel: string;
  openUrl: string;
  downloadUrl: string;
};

function buildPreviewAttachments(items: EmployeeAttachment[] | undefined): PreviewAttachmentItem[] {
  if (!items) return [];

  return items.map((attachment) => ({
    id: attachment.id,
    originalName: attachment.originalName,
    mimeType: attachment.mimeType,
    sourceType: "employee" as const,
    sourceLabel: "Mitarbeiter",
    openUrl: `/api/employee-attachments/${attachment.id}/download`,
    downloadUrl: `/api/employee-attachments/${attachment.id}/download?download=1`,
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

export function EmployeeAttachmentsHover({
  employeeId,
  totalAttachmentsCount,
  fullWidth = false,
  triggerTestId,
}: {
  employeeId: number;
  totalAttachmentsCount: number;
  fullWidth?: boolean;
  triggerTestId?: string;
}) {
  const [shouldLoadPreview, setShouldLoadPreview] = useState(false);
  const attachmentPreviewSize = parseAttachmentPreviewSize(useSetting("attachmentPreviewSize"));
  const previewDimensions = resolveAttachmentPreviewDimensions(attachmentPreviewSize);
  const normalizedCount = Number.isFinite(totalAttachmentsCount)
    ? Math.max(0, totalAttachmentsCount)
    : 0;

  const attachmentsQuery = useQuery<EmployeeAttachment[]>({
    queryKey: ["/api/employees", employeeId, "attachments"],
    enabled: shouldLoadPreview && normalizedCount > 0,
  });

  const attachments = buildPreviewAttachments(attachmentsQuery.data);
  const singleAttachment = normalizedCount === 1 ? (attachments[0] ?? null) : null;

  const badge = (
    <FooterChildCollectionBadge
      icon={<Paperclip className="h-3 w-3" />}
      label="Anhänge"
      count={normalizedCount}
      testId={triggerTestId ?? `employee-attachments-hover-trigger-${employeeId}`}
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
        {badge}
      </HoverPreview>
    );
  }

  if (normalizedCount === 1) {
    return (
      <AttachmentPreviewTrigger
        originalName={singleAttachment?.originalName ?? "Anhang"}
        mimeType={singleAttachment?.mimeType ?? null}
        openUrl={singleAttachment?.openUrl ?? `#employee-${employeeId}-attachment-preview`}
        downloadUrl={singleAttachment?.downloadUrl ?? `#employee-${employeeId}-attachment-download`}
        previewSize={attachmentPreviewSize}
        testId={triggerTestId ?? `employee-attachments-hover-trigger-${employeeId}`}
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
        {badge}
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
      {badge}
    </HoverPreview>
  );
}
