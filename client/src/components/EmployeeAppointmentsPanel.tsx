import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppointmentsPanel, type AppointmentPanelItem } from "@/components/AppointmentsPanel";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import type { CalendarAppointment } from "@/lib/calendar-appointments";

interface EmployeeAppointmentsPanelProps {
  employeeId?: number | null;
  employeeName?: string | null;
  onOpenEmployeeAppointmentsView?: (employeeId: number) => void;
}

type EmployeeAppointmentSummary = CalendarAppointment & { startTimeHour: number | null };

export function EmployeeAppointmentsPanel({ employeeId, onOpenEmployeeAppointmentsView }: EmployeeAppointmentsPanelProps) {
  const today = getBerlinTodayDateString();
  const upcomingFromDate = today;

  const upcomingUrl = employeeId
    ? `/api/employees/${employeeId}/current-appointments?fromDate=${upcomingFromDate}`
    : null;

  const { data: upcomingAppointments = [], isLoading: upcomingLoading } = useQuery<EmployeeAppointmentSummary[]>({
    queryKey: [upcomingUrl ?? ""],
    enabled: !!upcomingUrl,
  });

  const sortedUpcomingAppointments = useMemo(() => {
    return [...upcomingAppointments].sort((a, b) => {
      if (a.startDate !== b.startDate) {
        return a.startDate > b.startDate ? 1 : -1;
      }

      const aHour = a.startTimeHour ?? Number.MAX_SAFE_INTEGER;
      const bHour = b.startTimeHour ?? Number.MAX_SAFE_INTEGER;
      if (aHour !== bHour) {
        return aHour - bHour;
      }

      return a.id - b.id;
    });
  }, [upcomingAppointments]);

  const limitedAppointments = sortedUpcomingAppointments.slice(0, 5);

  const items = useMemo<AppointmentPanelItem[]>(() => {
    return limitedAppointments.map((appointment) => ({
      id: appointment.id,
      startDate: appointment.startDate,
      endDate: appointment.endDate ?? null,
      startTimeHour: appointment.startTimeHour ?? null,
      projectName: appointment.projectName ?? null,
      customerName: appointment.customer.fullName ?? null,
      previewAppointment: appointment,
    }));
  }, [limitedAppointments]);

  const shouldShowMoreButton = Boolean(employeeId && onOpenEmployeeAppointmentsView);

  const sidebarFooter = shouldShowMoreButton ? (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={() => onOpenEmployeeAppointmentsView?.(employeeId as number)}
      data-testid="button-open-employee-appointments-view"
    >
      Tabelle Ã¶ffnen
    </Button>
  ) : null;

  return (
    <AppointmentsPanel
      title="Termine"
      icon={<Calendar className="w-4 h-4" />}
      compact
      items={items}
      isLoading={upcomingLoading}
      emptyStateLabel="Keine Termine ab heute"
      sidebarFooter={sidebarFooter}
    />
  );
}
