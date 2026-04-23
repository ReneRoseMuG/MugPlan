import { CalendarMonthSheetView } from "@/components/calendar/CalendarMonthSheetView";
import type { MonitoringConflictMeta } from "@/lib/monitoring-ui";

interface MonthSheetGridProps {
  currentDate: Date;
  employeeFilterId?: number | null;
  readOnly?: boolean;
  conflictHighlightActive?: boolean;
  conflictAppointmentMap?: Map<number, MonitoringConflictMeta>;
  onNewAppointment?: (date: string, options?: { scrollLeft?: number | null }) => void;
  onOpenAppointment?: (appointmentId: number, options?: { scrollLeft?: number | null }) => void;
}

export function MonthSheetGrid({
  currentDate,
  employeeFilterId,
  readOnly = false,
  conflictHighlightActive = false,
  conflictAppointmentMap = new Map<number, MonitoringConflictMeta>(),
  onNewAppointment,
  onOpenAppointment,
}: MonthSheetGridProps) {
  return (
    <CalendarMonthSheetView
      currentDate={currentDate}
      employeeFilterId={employeeFilterId}
      readOnly={readOnly}
      conflictHighlightActive={conflictHighlightActive}
      conflictAppointmentMap={conflictAppointmentMap}
      onNewAppointment={onNewAppointment}
      onOpenAppointment={onOpenAppointment}
    />
  );
}
