import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { AppointmentsPanel, type AppointmentPanelItem } from "@/components/AppointmentsPanel";
import { BadgeInteractionProvider } from "@/components/ui/badge-interaction-provider";
import { PROJECT_APPOINTMENTS_ALL_FROM_DATE, getBerlinTodayDateString, getProjectAppointmentsQueryKey } from "@/lib/project-appointments";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ProjectAppointmentsPanelProps {
  projectId?: number | null;
  projectName?: string | null;
  isEditing: boolean;
  onOpenAppointment?: (context: { projectId?: number; appointmentId?: number }) => void;
}

interface ProjectAppointmentSummary {
  id: number;
  projectId: number;
  startDate: string;
  endDate?: string | null;
  startTimeHour?: number | null;
  isLocked: boolean;
}

const appointmentsLogPrefix = "[ProjectAppointmentsPanel]";

export function ProjectAppointmentsPanel({
  projectId,
  projectName,
  isEditing,
  onOpenAppointment,
}: ProjectAppointmentsPanelProps) {
  const { toast } = useToast();
  const [showAll, setShowAll] = useState(false);
  const [userRole] = useState(() =>
    window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER",
  );
  const today = getBerlinTodayDateString();
  const upcomingFromDate = today;
  const allFromDate = PROJECT_APPOINTMENTS_ALL_FROM_DATE;
  const upcomingQueryKey = getProjectAppointmentsQueryKey({
    projectId,
    fromDate: upcomingFromDate,
    userRole,
  });
  const allQueryKey = getProjectAppointmentsQueryKey({
    projectId,
    fromDate: allFromDate,
    userRole,
  });

  const { data: upcomingAppointments = [], isLoading: upcomingLoading } = useQuery<ProjectAppointmentSummary[]>({
    queryKey: upcomingQueryKey,
    queryFn: async () => {
      if (!projectId) return [];
      const url = `/api/projects/${projectId}/appointments?fromDate=${upcomingFromDate}`;
      console.info(`${appointmentsLogPrefix} request`, { projectId, fromDate: upcomingFromDate });
      const response = await fetch(url, {
        credentials: "include",
        headers: {
          "x-user-role": userRole,
        },
      });
      const payload = await response.json();
      console.info(`${appointmentsLogPrefix} response`, {
        projectId,
        fromDate: upcomingFromDate,
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

  const { data: allAppointments = [], isLoading: allLoading } = useQuery<ProjectAppointmentSummary[]>({
    queryKey: allQueryKey,
    queryFn: async () => {
      if (!projectId) return [];
      const url = `/api/projects/${projectId}/appointments?fromDate=${allFromDate}`;
      console.info(`${appointmentsLogPrefix} request`, { projectId, fromDate: allFromDate });
      const response = await fetch(url, {
        credentials: "include",
        headers: {
          "x-user-role": userRole,
        },
      });
      const payload = await response.json();
      console.info(`${appointmentsLogPrefix} response`, {
        projectId,
        fromDate: allFromDate,
        status: response.status,
        count: payload?.length,
      });
      if (!response.ok) {
        throw new Error(payload?.message ?? response.statusText);
      }
      return payload as ProjectAppointmentSummary[];
    },
    enabled: isEditing && Boolean(projectId) && showAll,
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      console.info(`${appointmentsLogPrefix} delete request`, { appointmentId });
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "x-user-role": userRole,
        },
      });
      const payload = response.status === 204 ? null : await response.json();
      console.info(`${appointmentsLogPrefix} delete response`, { appointmentId, status: response.status });
      if (!response.ok) {
        throw new Error(payload?.message ?? response.statusText);
      }
      return appointmentId;
    },
    onSuccess: (appointmentId) => {
      console.info(`${appointmentsLogPrefix} delete success`, {
        appointmentId,
        projectId,
      });
      console.info(`${appointmentsLogPrefix} cache invalidate`, {
        queryKey: upcomingQueryKey,
      });
      queryClient.invalidateQueries({ queryKey: upcomingQueryKey });
      queryClient.invalidateQueries({ queryKey: allQueryKey });
      toast({ title: "Termin gelöscht" });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Löschen fehlgeschlagen";
      toast({ title: "Fehler", description: message, variant: "destructive" });
    },
  });

  const appointmentSource = showAll ? allAppointments : upcomingAppointments;
  const items = useMemo<AppointmentPanelItem[]>(() => {
    const appointmentSecondaryLabel = projectName?.trim()
      ? `Termin · ${projectName.trim()}`
      : "Termin";
    return appointmentSource.map((appointment) => {
      const appointmentBorderColor = appointment.startDate < today
        ? "#9ca3af"
        : "#22c55e";
      return {
        id: appointment.id,
        startDate: appointment.startDate,
        endDate: appointment.endDate,
        startTimeHour: appointment.startTimeHour,
        mode: "projekt",
        projectLabel: appointmentSecondaryLabel,
        projectName: projectName ?? null,
        color: appointmentBorderColor,
        action: "remove",
        actionDisabled: appointment.isLocked,
        onRemove: () => deleteAppointmentMutation.mutate(appointment.id),
        testId: `project-appointment-${appointment.id}`,
      };
    });
  }, [appointmentSource, projectName, today, deleteAppointmentMutation]);

  const showLockedNote = appointmentSource.some((appointment) => appointment.isLocked);
  const handleOpenAppointment = onOpenAppointment && projectId
    ? (appointmentId: number | string) => onOpenAppointment({ projectId, appointmentId: Number(appointmentId) })
    : undefined;
  const addAction = isEditing && onOpenAppointment && projectId
    ? {
        onClick: () => onOpenAppointment({ projectId }),
        ariaLabel: "Termin hinzufügen",
        testId: "button-new-appointment-from-project",
      }
    : undefined;

  return (
    <BadgeInteractionProvider value={{ openAppointmentEdit: handleOpenAppointment }}>
      <AppointmentsPanel
      title="Termine"
      icon={<Calendar className="w-4 h-4" />}
      showAll={showAll}
      onShowAllChange={setShowAll}
      items={items}
      isLoading={showAll ? allLoading : upcomingLoading}
      addAction={addAction}
      onOpenAppointment={handleOpenAppointment}
      emptyStateFilteredLabel="Keine Termine ab heute"
      note={showLockedNote ? "Gesperrte Termine können nur Admins löschen." : null}
      />
    </BadgeInteractionProvider>
  );
}
