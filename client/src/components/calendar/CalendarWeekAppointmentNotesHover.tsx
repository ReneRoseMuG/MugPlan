import { StickyNote } from "lucide-react";
import { EntityNotesHoverPreview } from "@/components/notes/EntityNotesHoverPreview";

export function CalendarWeekAppointmentNotesHover({
  appointmentId,
  customerId,
  projectId,
  customerNotesCount,
  projectNotesCount,
  appointmentNotesCount,
}: {
  appointmentId: number;
  customerId: number;
  projectId: number | null;
  customerNotesCount: number;
  projectNotesCount: number;
  appointmentNotesCount: number;
}) {
  const totalNotesCount = customerNotesCount + projectNotesCount + appointmentNotesCount;

  if (totalNotesCount <= 0) {
    return (
      <div
        className="mt-1 rounded-md border border-slate-200/90 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700"
        data-testid="week-appointment-notes-static-trigger"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1">
            <StickyNote className="h-3 w-3" />
            Notizen
          </span>
          <span>0</span>
        </div>
      </div>
    );
  }

  return (
    <EntityNotesHoverPreview
      sourceMode="cumulative"
      sources={{
        customer: { id: customerId, count: customerNotesCount },
        project: projectId ? { id: projectId, count: projectNotesCount } : undefined,
        appointment: { id: appointmentId, count: appointmentNotesCount },
      }}
      triggerLabel="Notizen"
      triggerTestId="week-appointment-notes-hover-trigger"
      maxWidth={360}
      maxHeight={340}
    />
  );
}
