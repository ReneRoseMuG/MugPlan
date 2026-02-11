import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import type { Project } from "@shared/schema";
import { AppointmentsPanel, type AppointmentPanelItem } from "@/components/AppointmentsPanel";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import type { CalendarAppointment } from "@/lib/calendar-appointments";

interface CustomerAppointmentsPanelProps {
  customerId?: number | null;
  customerName?: string | null;
}

type ProjectAppointmentSummary = CalendarAppointment & { startTimeHour: number | null };

export function CustomerAppointmentsPanel({ customerId }: CustomerAppointmentsPanelProps) {
  const projectsUrl = customerId ? `/api/projects?customerId=${customerId}&filter=all` : null;
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: [projectsUrl ?? ""],
    enabled: !!projectsUrl,
  });

  const today = getBerlinTodayDateString();
  const projectIds = projects.map((project) => project.id).join("-");

  const upcomingAppointmentsQuery = useQuery<ProjectAppointmentSummary[]>({
    queryKey: ["customerAppointments", customerId, today, projectIds],
    enabled: projects.length > 0,
    queryFn: async () => {
      const responses = await Promise.all(
        projects.map(async (project) => {
          const response = await fetch(`/api/projects/${project.id}/appointments?fromDate=${today}`, {
            credentials: "include",
          });
          if (!response.ok) {
            throw new Error(response.statusText);
          }
          const payload = await response.json();
          return payload as ProjectAppointmentSummary[];
        }),
      );
      return responses.flat();
    },
  });

  const items = useMemo<AppointmentPanelItem[]>(() => {
    const appointmentSource = upcomingAppointmentsQuery.data ?? [];
    const toHourSort = (value: number | null) => (value == null ? Number.MAX_SAFE_INTEGER : value);
    return appointmentSource
      .map((appointment) => ({
        id: appointment.id,
        startDate: appointment.startDate,
        endDate: appointment.endDate,
        startTimeHour: appointment.startTimeHour,
        projectName: appointment.projectName ?? null,
        customerName: appointment.customer.fullName ?? null,
        previewAppointment: appointment,
      }))
      .sort((a, b) => {
        if (a.startDate !== b.startDate) {
          return a.startDate > b.startDate ? 1 : -1;
        }
        const aHour = toHourSort(a.startTimeHour ?? null);
        const bHour = toHourSort(b.startTimeHour ?? null);
        if (aHour !== bHour) {
          return aHour - bHour;
        }
        return Number(a.id) - Number(b.id);
      });
  }, [upcomingAppointmentsQuery.data]);

  const isLoading = projectsLoading || upcomingAppointmentsQuery.isLoading;

  return (
    <AppointmentsPanel
      title="Termine"
      icon={<Calendar className="w-4 h-4" />}
      compact
      items={items}
      isLoading={isLoading}
      emptyStateLabel="Keine Termine ab heute"
    />
  );
}
