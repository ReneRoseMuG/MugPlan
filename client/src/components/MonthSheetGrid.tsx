import { CalendarMonthSheetView } from "@/components/calendar/CalendarMonthSheetView";
import type { CalendarMoveRequest, CalendarMoveSelection } from "@/lib/calendar-move";
import type { MonitoringConflictMeta } from "@/lib/monitoring-ui";
import type { ReactNode } from "react";

interface MonthSheetGridProps {
  currentDate: Date;
  employeeFilterId?: number | null;
  readOnly?: boolean;
  visibleWeekCount?: number;
  showMonthHeader?: boolean;
  headerAction?: ReactNode;
  absenceVisibility?: "planning" | "absences" | "include";
  onPreviousWeek?: () => void;
  onNextWeek?: () => void;
  conflictHighlightActive?: boolean;
  conflictAppointmentMap?: Map<number, MonitoringConflictMeta>;
  onNewAppointment?: (date: string, options?: { scrollLeft?: number | null }) => void;
  onOpenAppointment?: (appointmentId: number, options?: { scrollLeft?: number | null }) => void;
  onOpenProject?: (projectId: number) => void;
  selectedMoveAppointment?: CalendarMoveSelection | null;
  onSelectMoveAppointment?: (appointment: CalendarMoveSelection) => void;
  onRequestMoveAppointment?: (request: CalendarMoveRequest) => void | Promise<void>;
  onFooterActionChange?: (action: ReactNode | null) => void;
}

export function MonthSheetGrid({
  currentDate,
  employeeFilterId,
  readOnly = false,
  visibleWeekCount,
  showMonthHeader,
  headerAction,
  absenceVisibility = "planning",
  onPreviousWeek,
  onNextWeek,
  conflictHighlightActive = false,
  conflictAppointmentMap = new Map<number, MonitoringConflictMeta>(),
  onNewAppointment,
  onOpenAppointment,
  onOpenProject,
  selectedMoveAppointment,
  onSelectMoveAppointment,
  onRequestMoveAppointment,
  onFooterActionChange,
}: MonthSheetGridProps) {
  return (
    <CalendarMonthSheetView
      currentDate={currentDate}
      employeeFilterId={employeeFilterId}
      readOnly={readOnly}
      visibleWeekCount={visibleWeekCount}
      showMonthHeader={showMonthHeader}
      headerAction={headerAction}
      absenceVisibility={absenceVisibility}
      onPreviousWeek={onPreviousWeek}
      onNextWeek={onNextWeek}
      conflictHighlightActive={conflictHighlightActive}
      conflictAppointmentMap={conflictAppointmentMap}
      onNewAppointment={onNewAppointment}
      onOpenAppointment={onOpenAppointment}
      onOpenProject={onOpenProject}
      selectedMoveAppointment={selectedMoveAppointment}
      onSelectMoveAppointment={onSelectMoveAppointment}
      onRequestMoveAppointment={onRequestMoveAppointment}
      onFooterActionChange={onFooterActionChange}
    />
  );
}
