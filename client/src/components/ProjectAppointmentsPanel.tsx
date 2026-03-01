import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { AllAppointmentsPanel, type AllAppointmentsPanelItem } from "@/components/AllAppointmentsPanel";
import {
  getBerlinTodayDateString,
  getProjectAppointmentsQueryKey,
  PROJECT_APPOINTMENTS_ALL_FROM_DATE,
} from "@/lib/project-appointments";
import type { CalendarAppointment } from "@/lib/calendar-appointments";

interface ProjectAppointmentsPanelProps {
  projectId?: number | null;
  projectName?: string | null;
  isEditing: boolean;
  onOpenAppointment?: (context: { projectId?: number; appointmentId?: number }) => void;
}

type ProjectAppointmentSummary = CalendarAppointment & { startTimeHour: number | null };

const appointmentsLogPrefix = "[ProjectAppointmentsPanel]";

const sortAppointmentsDesc = (a: ProjectAppointmentSummary, b: ProjectAppointmentSummary) => {
  if (a.startDate !== b.startDate) {
    return a.startDate > b.startDate ? -1 : 1;
  }

  if (a.startTimeHour == null && b.startTimeHour != null) return 1;
  if (a.startTimeHour != null && b.startTimeHour == null) return -1;
  if (a.startTimeHour != null && b.startTimeHour != null && a.startTimeHour !== b.startTimeHour) {
    return b.startTimeHour - a.startTimeHour;
  }

  return b.id - a.id;
};

export function ProjectAppointmentsPanel({
  projectId,
  projectName,
  isEditing,
  onOpenAppointment,
}: ProjectAppointmentsPanelProps) {
  const [userRole] = useState(() =>
    window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER",
  );
  const todayBerlin = getBerlinTodayDateString();
  const queryFromDate = PROJECT_APPOINTMENTS_ALL_FROM_DATE;
  const appointmentsQueryKey = getProjectAppointmentsQueryKey({
    projectId,
    fromDate: queryFromDate,
    userRole,
  });

  const { data: allAppointments = [], isLoading } = useQuery<ProjectAppointmentSummary[]>({
    queryKey: appointmentsQueryKey,
    queryFn: async () => {
      if (!projectId) return [];
      const url = `/api/projects/${projectId}/appointments?fromDate=${queryFromDate}`;
      console.info(`${appointmentsLogPrefix} request`, { projectId, fromDate: queryFromDate });
      const response = await fetch(url, {
        credentials: "include",
        headers: {},
      });
      const payload = await response.json();
      console.info(`${appointmentsLogPrefix} response`, {
        projectId,
        fromDate: queryFromDate,
        status: response.status,
        count: payload?.length,
      });
      if (!response.ok) {
        throw new Error(payload?.message ?? response.statusText);
      }
      return payload as ProjectAppointmentSummary[];
    },
    enabled: isEditing && Boolean(projectId),
  });

  const sortedAppointments = useMemo(
    () => [...allAppointments].sort(sortAppointmentsDesc),
    [allAppointments],
  );

  const items = useMemo<AllAppointmentsPanelItem[]>(() => {
    return sortedAppointments.map((appointment) => ({
      id: appointment.id,
      startDate: appointment.startDate,
      endDate: appointment.endDate,
      startTimeHour: appointment.startTimeHour,
      projectLabel: projectName ?? appointment.projectName ?? null,
      customerLabel: appointment.customer.fullName ?? null,
      previewAppointment: appointment,
      testId: `project-appointment-${appointment.id}`,
    }));
  }, [sortedAppointments, projectName]);

  const addAction = isEditing && onOpenAppointment && projectId
    ? {
        onClick: () => onOpenAppointment({ projectId }),
        ariaLabel: "Termin hinzufügen",
        testId: "button-new-appointment-from-project",
      }
    : undefined;

  return (
    <AllAppointmentsPanel
      title="Alle Termine"
      icon={<Calendar className="w-4 h-4" />}
      helpKey="projects.sidebar.appointments"
      compact
      items={items}
      isLoading={isLoading}
      todayBerlin={todayBerlin}
      addAction={addAction}
    />
  );
}
