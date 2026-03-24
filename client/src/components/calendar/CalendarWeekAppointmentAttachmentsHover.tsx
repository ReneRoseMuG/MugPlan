import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Paperclip } from "lucide-react";
import { DraggableAttachmentBadge } from "@/components/ui/badge-previews/attachment-info-badge-preview";
import { useSetting } from "@/hooks/useSettings";
import { parseAttachmentPreviewSize } from "@/components/ui/badge-previews/attachment-info-badge-preview";

type AppointmentAttachmentItem = {
  id: number;
  originalName: string;
  mimeType: string | null;
};

type AppointmentAttachmentContext = {
  appointmentId: number;
  project: {
    id: number;
    name: string;
    orderNumber: string | null;
  } | null;
  customer: {
    id: number;
    customerNumber: string;
    fullName: string | null;
  };
  projectAttachments: AppointmentAttachmentItem[];
  customerAttachments: AppointmentAttachmentItem[];
  appointmentAttachments: AppointmentAttachmentItem[];
};

type PreviewAttachmentItem = AppointmentAttachmentItem & {
  sourceType: "customer" | "project" | "appointment";
  openUrl: string;
  downloadUrl: string;
};

function buildPreviewAttachments(data: AppointmentAttachmentContext | undefined): PreviewAttachmentItem[] {
  if (!data) return [];
  return [
    ...data.customerAttachments.map((a) => ({
      ...a,
      sourceType: "customer" as const,
      openUrl: `/api/customer-attachments/${a.id}/download`,
      downloadUrl: `/api/customer-attachments/${a.id}/download?download=1`,
    })),
    ...data.projectAttachments.map((a) => ({
      ...a,
      sourceType: "project" as const,
      openUrl: `/api/project-attachments/${a.id}/download`,
      downloadUrl: `/api/project-attachments/${a.id}/download?download=1`,
    })),
    ...data.appointmentAttachments.map((a) => ({
      ...a,
      sourceType: "appointment" as const,
      openUrl: `/api/appointment-attachments/${a.id}/download`,
      downloadUrl: `/api/appointment-attachments/${a.id}/download?download=1`,
    })),
  ];
}

export function CalendarWeekAppointmentAttachmentsHover({
  appointmentId,
  totalAttachmentsCount,
}: {
  appointmentId: number;
  totalAttachmentsCount: number;
}) {
  const [shouldLoadPreview, setShouldLoadPreview] = useState(false);
  const attachmentPreviewSize = parseAttachmentPreviewSize(useSetting("attachmentPreviewSize"));
  const normalizedCount = Number.isFinite(totalAttachmentsCount)
    ? Math.max(0, totalAttachmentsCount)
    : 0;

  const attachmentsQuery = useQuery<AppointmentAttachmentContext>({
    queryKey: ["/api/appointments", appointmentId, "attachment-context"],
    enabled: shouldLoadPreview && normalizedCount > 0,
  });
  const attachments = buildPreviewAttachments(attachmentsQuery.data);

  if (normalizedCount <= 0) {
    return null;
  }

  return (
    <div
      className="mt-1"
      onMouseEnter={() => setShouldLoadPreview(true)}
    >
      <div
        className="rounded-md border border-slate-200/90 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700"
        data-testid="week-appointment-attachments-hover-trigger"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1">
            <Paperclip className="h-3 w-3" />
            Anhaenge
          </span>
          <span>{normalizedCount}</span>
        </div>
      </div>
      {attachments.length > 0 && (
        <div className="mt-1 flex flex-col gap-1">
          {attachments.map((attachment) => (
            <DraggableAttachmentBadge
              key={`${attachment.sourceType}-${attachment.id}`}
              originalName={attachment.originalName}
              mimeType={attachment.mimeType}
              openUrl={attachment.openUrl}
              downloadUrl={attachment.downloadUrl}
              previewSize={attachmentPreviewSize}
            />
          ))}
        </div>
      )}
    </div>
  );
}
