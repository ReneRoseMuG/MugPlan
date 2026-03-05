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
  projectId: number;
  customerNotesCount: number;
  projectNotesCount: number;
  appointmentNotesCount: number;
}) {
  return (
    <EntityNotesHoverPreview
      sourceMode="cumulative"
      sources={{
        customer: { id: customerId, count: customerNotesCount },
        project: { id: projectId, count: projectNotesCount },
        appointment: { id: appointmentId, count: appointmentNotesCount },
      }}
      triggerLabel="Notizen"
      triggerTestId="week-appointment-notes-hover-trigger"
      maxWidth={360}
      maxHeight={340}
    />
  );
}
