import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import type { Project } from "@shared/schema";
import { AppointmentsPanel, type AppointmentPanelItem } from "@/components/AppointmentsPanel";
import { PROJECT_APPOINTMENTS_ALL_FROM_DATE, getBerlinTodayDateString } from "@/lib/project-appointments";

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

export function CustomerAppointmentsPanel({ customerId, customerName }: CustomerAppointmentsPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const projectsUrl = customerId ? `/api/projects?customerId=${customerId}&filter=all` : null;
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: [projectsUrl ?? ""],
    enabled: !!projectsUrl,
  });
  const today = getBerlinTodayDateString();
  const upcomingFromDate = today;
  const allFromDate = PROJECT_APPOINTMENTS_ALL_FROM_DATE;
  const projectIds = projects.map((project) => project.id).join("-");

  const upcomingAppointmentsQuery = useQuery<ProjectAppointmentSummary[]>({
    queryKey: ["customerAppointments", customerId, upcomingFromDate, projectIds],
    enabled: projects.length > 0,
    queryFn: async () => {
      const responses = await Promise.all(
        projects.map(async (project) => {
          const response = await fetch(`/api/projects/${project.id}/appointments?fromDate=${upcomingFromDate}`, {
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

  const allAppointmentsQuery = useQuery<ProjectAppointmentSummary[]>({
    queryKey: ["customerAppointments", customerId, allFromDate, projectIds],
    enabled: projects.length > 0 && showAll,
    queryFn: async () => {
      const responses = await Promise.all(
        projects.map(async (project) => {
          const response = await fetch(`/api/projects/${project.id}/appointments?fromDate=${allFromDate}`, {
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

  const appointmentSource = showAll ? allAppointmentsQuery.data : upcomingAppointmentsQuery.data;
  const items = useMemo<AppointmentPanelItem[]>(() => {
    const projectNameLookup = new Map(projects.map((project) => [project.id, project.name]));
    return appointmentSource
      ? appointmentSource
          .map((appointment) => {
            const projectName = projectNameLookup.get(appointment.projectId) ?? "";
            return {
              id: appointment.id,
              startDate: appointment.startDate,
              endDate: appointment.endDate,
              startTimeHour: appointment.startTimeHour,
              mode: "projekt" as const,
              projectLabel: projectName ? `Projekt · ${projectName}` : "Projekt",
            };
          })
          .sort((a, b) => (a.startDate > b.startDate ? 1 : a.startDate < b.startDate ? -1 : 0))
      : [];
  }, [appointmentSource, projects, customerName]);

  const isLoading = projectsLoading || (showAll ? allAppointmentsQuery.isLoading : upcomingAppointmentsQuery.isLoading);

  return (
    <AppointmentsPanel
      title="Termine"
      icon={<Calendar className="w-4 h-4" />}
      showAll={showAll}
      onShowAllChange={setShowAll}
      items={items}
      isLoading={isLoading}
      emptyStateFilteredLabel="Keine Termine ab heute"
    />
  );
}
