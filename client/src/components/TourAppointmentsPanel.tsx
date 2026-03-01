import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppointmentsPanel, type AppointmentPanelItem } from "@/components/AppointmentsPanel";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import type { CalendarAppointment } from "@/lib/calendar-appointments";

interface TourAppointmentsPanelProps {
  tourId?: number | null;
  onOpenTourAppointmentsView?: (tourId: number) => void;
}

type TourAppointmentSummary = CalendarAppointment & { startTimeHour: number | null };

export function TourAppointmentsPanel({ tourId, onOpenTourAppointmentsView }: TourAppointmentsPanelProps) {
  const today = getBerlinTodayDateString();
  const upcomingUrl = tourId ? `/api/tours/${tourId}/current-appointments?fromDate=${today}` : null;

  const { data: upcomingAppointments = [], isLoading } = useQuery<TourAppointmentSummary[]>({
    queryKey: [upcomingUrl ?? ""],
    enabled: !!upcomingUrl,
  });

  const sortedAppointments = useMemo(() => {
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

  const items = useMemo<AppointmentPanelItem[]>(() => {
    return sortedAppointments.map((appointment) => ({
      id: appointment.id,
      startDate: appointment.startDate,
      endDate: appointment.endDate ?? null,
      startTimeHour: appointment.startTimeHour ?? null,
      projectName: appointment.projectName ?? null,
      customerName: appointment.customer.fullName ?? null,
      previewAppointment: appointment,
    }));
  }, [sortedAppointments]);

  const sidebarFooter = tourId && onOpenTourAppointmentsView ? (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => onOpenTourAppointmentsView(tourId)}
        data-testid="button-open-tour-appointments-view"
      >
        Tabelle anzeigen
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled
        data-testid="button-open-tour-calendar-view"
      >
        Kalender anzeigen
      </Button>
    </div>
  ) : null;

  return (
    <AppointmentsPanel
      title="Termine"
      icon={<Calendar className="w-4 h-4" />}
      helpKey="tours.sidebar.appointments"
      compact
      items={items}
      isLoading={isLoading}
      emptyStateLabel="Keine Termine ab heute"
      sidebarFooter={sidebarFooter}
    />
  );
}
