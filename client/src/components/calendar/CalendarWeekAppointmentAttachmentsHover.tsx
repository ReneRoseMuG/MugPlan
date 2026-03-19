import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Paperclip } from "lucide-react";
import { HoverPreview } from "@/components/ui/hover-preview";
import { CalendarWeekAppointmentAttachmentsGallery } from "./CalendarWeekAppointmentAttachmentsGallery";
import { CalendarWeekAppointmentAttachmentsSinglePreview } from "./CalendarWeekAppointmentAttachmentsSinglePreview";

type AppointmentAttachmentItem = {
  id: number;
  originalName: string;
  mimeType: string | null;
};

function AttachmentPreviewContent({
  attachments,
  isLoading,
  isError,
}: {
  attachments: AppointmentAttachmentItem[];
  isLoading: boolean;
  isError: boolean;
}) {
  if (isError) {
    return <div className="text-xs text-red-600">Anhaenge konnten nicht geladen werden.</div>;
  }

  if (isLoading) {
    return <div className="text-xs text-slate-500">Anhaenge werden geladen...</div>;
  }

  if (attachments.length <= 1) {
    return <CalendarWeekAppointmentAttachmentsSinglePreview attachment={attachments[0] ?? null} />;
  }

  return <CalendarWeekAppointmentAttachmentsGallery attachments={attachments} />;
}

export function CalendarWeekAppointmentAttachmentsHover({
  appointmentId,
  appointmentAttachmentsCount,
}: {
  appointmentId: number;
  appointmentAttachmentsCount: number;
}) {
  const [shouldLoadPreview, setShouldLoadPreview] = useState(false);
  const normalizedCount = Number.isFinite(appointmentAttachmentsCount)
    ? Math.max(0, appointmentAttachmentsCount)
    : 0;

  const attachmentsQuery = useQuery<AppointmentAttachmentItem[]>({
    queryKey: ["/api/appointments", appointmentId, "attachments"],
    enabled: shouldLoadPreview && normalizedCount > 0,
  });

  if (normalizedCount <= 0) {
    return null;
  }

  return (
    <HoverPreview
      preview={(
        <AttachmentPreviewContent
          attachments={attachmentsQuery.data ?? []}
          isLoading={attachmentsQuery.isLoading}
          isError={attachmentsQuery.isError}
        />
      )}
      closeDelay={200}
      side="right"
      align="start"
      maxWidth={420}
      maxHeight={380}
      className="z-[9999] w-[420px]"
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
