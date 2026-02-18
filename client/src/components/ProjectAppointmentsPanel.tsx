import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { AppointmentsPanel, type AppointmentPanelItem } from "@/components/AppointmentsPanel";
import { BadgeInteractionProvider } from "@/components/ui/badge-interaction-provider";
import { getBerlinTodayDateString, getProjectAppointmentsQueryKey } from "@/lib/project-appointments";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CalendarAppointment } from "@/lib/calendar-appointments";

interface ProjectAppointmentsPanelProps {
  projectId?: number | null;
  projectName?: string | null;
  isEditing: boolean;
  onOpenAppointment?: (context: { projectId?: number; appointmentId?: number }) => void;
}

type ProjectAppointmentSummary = CalendarAppointment & { startTimeHour: number | null };
type AppointmentPanelApiError = Error & { status?: number; code?: string };

const appointmentsLogPrefix = "[ProjectAppointmentsPanel]";

export function ProjectAppointmentsPanel({
  projectId,
  projectName,
  isEditing,
  onOpenAppointment,
}: ProjectAppointmentsPanelProps) {
  const { toast } = useToast();
  const [userRole] = useState(() =>
    window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER",
  );
  const today = getBerlinTodayDateString();
  const upcomingFromDate = today;
  const upcomingQueryKey = getProjectAppointmentsQueryKey({
    projectId,
    fromDate: upcomingFromDate,
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

  const deleteAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId, version }: { appointmentId: number; version: number }) => {
      console.info(`${appointmentsLogPrefix} delete request`, { appointmentId, version });
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ version }),
      });
      const payload = response.status === 204 ? null : await response.json().catch(() => null);
      console.info(`${appointmentsLogPrefix} delete response`, { appointmentId, status: response.status, version });
      if (!response.ok) {
        const code = typeof payload?.code === "string" ? payload.code : undefined;
        const message = typeof payload?.message === "string" ? payload.message : undefined;
        const error = new Error(message ?? response.statusText) as AppointmentPanelApiError;
        error.status = response.status;
        error.code = code;
        throw error;
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
      void queryClient.invalidateQueries({ queryKey: upcomingQueryKey });
      toast({ title: "Termin gelöscht" });
    },
    onError: (error) => {
      const err = error as AppointmentPanelApiError;
      if (err.code === "VERSION_CONFLICT") {
        toast({
          title: "Löschen nicht möglich",
          description: "Termin wurde zwischenzeitlich geaendert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      if (err.code === "LOCK_VIOLATION" || err.status === 403) {
        toast({
          title: "Löschen nicht möglich",
          description: "Termin ist gesperrt.",
          variant: "destructive",
        });
        return;
      }
      const message = error instanceof Error ? error.message : "Löschen fehlgeschlagen";
      toast({ title: "Fehler", description: message, variant: "destructive" });
    },
  });

  const appointmentSource = upcomingAppointments;
  const items = useMemo<AppointmentPanelItem[]>(() => {
    return appointmentSource.map((appointment) => ({
      id: appointment.id,
      startDate: appointment.startDate,
      endDate: appointment.endDate,
      startTimeHour: appointment.startTimeHour,
      projectName: projectName ?? appointment.projectName ?? null,
      customerName: appointment.customer.fullName ?? null,
      previewAppointment: appointment,
      action: "remove",
      actionDisabled: appointment.isLocked,
      onRemove: () => deleteAppointmentMutation.mutate({ appointmentId: appointment.id, version: appointment.version }),
      testId: `project-appointment-${appointment.id}`,
    }));
  }, [appointmentSource, projectName, deleteAppointmentMutation]);

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
        compact
        items={items}
        isLoading={upcomingLoading}
        addAction={addAction}
        onOpenAppointment={handleOpenAppointment}
        emptyStateLabel="Keine Termine ab heute"
        note={showLockedNote ? "Gesperrte Termine können nur Admins löschen." : null}
      />
    </BadgeInteractionProvider>
  );
}

