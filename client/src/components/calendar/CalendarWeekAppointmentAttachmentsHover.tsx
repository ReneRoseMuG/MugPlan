import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Paperclip } from "lucide-react";
import { HoverPreview } from "@/components/ui/hover-preview";
import {
  parseAttachmentPreviewSize,
  resolveAttachmentPreviewDimensions,
} from "@/components/ui/badge-previews/attachment-info-badge-preview";
import { useSetting } from "@/hooks/useSettings";
import { CalendarWeekAppointmentAttachmentsGallery } from "./CalendarWeekAppointmentAttachmentsGallery";
import { CalendarWeekAppointmentAttachmentsSinglePreview } from "./CalendarWeekAppointmentAttachmentsSinglePreview";

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
  sourceLabel: string;
  openUrl: string;
  downloadUrl: string;
};

function buildPreviewAttachments(data: AppointmentAttachmentContext | undefined): PreviewAttachmentItem[] {
  if (!data) return [];

  return [
    ...data.customerAttachments.map((attachment) => ({
      ...attachment,
      sourceType: "customer" as const,
      sourceLabel: "Kunde",
      openUrl: `/api/customer-attachments/${attachment.id}/download`,
      downloadUrl: `/api/customer-attachments/${attachment.id}/download?download=1`,
    })),
    ...data.projectAttachments.map((attachment) => ({
      ...attachment,
      sourceType: "project" as const,
      sourceLabel: "Projekt",
      openUrl: `/api/project-attachments/${attachment.id}/download`,
      downloadUrl: `/api/project-attachments/${attachment.id}/download?download=1`,
    })),
    ...data.appointmentAttachments.map((attachment) => ({
      ...attachment,
      sourceType: "appointment" as const,
      sourceLabel: "Termin",
      openUrl: `/api/appointment-attachments/${attachment.id}/download`,
      downloadUrl: `/api/appointment-attachments/${attachment.id}/download?download=1`,
    })),
  ];
}

function AttachmentPreviewContent({
  attachments,
  isLoading,
  isError,
}: {
  attachments: PreviewAttachmentItem[];
  isLoading: boolean;
  isError: boolean;
}) {
  if (isError) {
    return <div className="text-xs text-red-600">Anhaenge konnten nicht geladen werden.</div>;
  }

  if (isLoading) {
    return <div className="text-xs text-slate-500">Anhaenge werden geladen...</div>;
  }

  if (attachments.length === 0) {
    return <div className="text-xs text-slate-500">Keine Anhaenge vorhanden.</div>;
  }

  if (attachments.length <= 1) {
    return <CalendarWeekAppointmentAttachmentsSinglePreview attachment={attachments[0] ?? null} />;
  }

  return <CalendarWeekAppointmentAttachmentsGallery attachments={attachments} />;
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
  const previewDimensions = resolveAttachmentPreviewDimensions(attachmentPreviewSize);
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
    <HoverPreview
      preview={(
        <AttachmentPreviewContent
          attachments={attachments}
          isLoading={attachmentsQuery.isLoading}
          isError={attachmentsQuery.isError}
        />
      )}
      closeDelay={200}
      side="right"
      align="end"
      sideOffset={10}
      collisionPadding={24}
      maxWidth={previewDimensions.popoverMaxWidth}
      minWidth={previewDimensions.popoverMaxWidth}
      maxHeight={previewDimensions.popoverMaxHeight}
      className="z-[9999]"
      contentClassName="space-y-2"
    >
      <div
        className="mt-1 cursor-pointer rounded-md border border-slate-200/90 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100"
        data-testid="week-appointment-attachments-hover-trigger"
        onMouseEnter={() => setShouldLoadPreview(true)}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1">
            <Paperclip className="h-3 w-3" />
            Anhaenge
          </span>
          <span>{normalizedCount}</span>
        </div>
      </div>
    </HoverPreview>
  );
}
