import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import type { Project } from "@shared/schema";
import { AppointmentsPanel, type AppointmentPanelItem } from "@/components/AppointmentsPanel";
import { PROJECT_APPOINTMENTS_ALL_FROM_DATE } from "@/lib/project-appointments";

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
  const projectsUrl = customerId ? `/api/projects?customerId=${customerId}&filter=all` : null;
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: [projectsUrl ?? ""],
    enabled: !!projectsUrl,
  });

  const projectAppointmentsQueries = useQuery<ProjectAppointmentSummary[]>({
    queryKey: ["customerAppointments", customerId, PROJECT_APPOINTMENTS_ALL_FROM_DATE, projects.map((project) => project.id).join("-")],
    enabled: projects.length > 0,
    queryFn: async () => {
      const responses = await Promise.all(
        projects.map(async (project) => {
          const response = await fetch(`/api/projects/${project.id}/appointments?fromDate=${PROJECT_APPOINTMENTS_ALL_FROM_DATE}`, {
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
    const projectNameLookup = new Map(projects.map((project) => [project.id, project.name]));
    return projectAppointmentsQueries.data
      ? projectAppointmentsQueries.data
          .map((appointment) => {
            const projectName = projectNameLookup.get(appointment.projectId) ?? "";
            return {
              id: appointment.id,
              startDate: appointment.startDate,
              endDate: appointment.endDate,
              startTimeHour: appointment.startTimeHour,
              mode: "projekt",
              projectLabel: projectName ? `Projekt · ${projectName}` : "Projekt",
            };
          })
          .sort((a, b) => (a.startDate > b.startDate ? 1 : a.startDate < b.startDate ? -1 : 0))
      : [];
  }, [projectAppointmentsQueries.data, projects, customerName]);

  const isLoading = projectsLoading || projectAppointmentsQueries.isLoading;

  return (
    <AppointmentsPanel
      title="Termine"
      icon={<Calendar className="w-4 h-4" />}
      items={items}
      isLoading={isLoading}
    />
  );
}
