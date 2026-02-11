import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import type { Project } from "@shared/schema";
import { AppointmentsPanel, type AppointmentPanelItem } from "@/components/AppointmentsPanel";
import { getBerlinTodayDateString } from "@/lib/project-appointments";

interface CustomerAppointmentsPanelProps {
  customerId?: number | null;
  customerName?: string | null;
}

interface ProjectAppointmentSummary {
  id: number;
  projectId: number;
  startDate: string;
  endDate?: string | null;
  startTimeHour?: number | null;
  isLocked: boolean;
}

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
    return appointmentSource
      .map((appointment) => ({
        id: appointment.id,
        startDate: appointment.startDate,
        endDate: appointment.endDate,
        startTimeHour: appointment.startTimeHour,
      }))
      .sort((a, b) => (a.startDate > b.startDate ? 1 : a.startDate < b.startDate ? -1 : 0));
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
