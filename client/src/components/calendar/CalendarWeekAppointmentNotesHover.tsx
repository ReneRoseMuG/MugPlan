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
