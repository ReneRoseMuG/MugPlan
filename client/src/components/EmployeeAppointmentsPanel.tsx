import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { AppointmentsPanel, type AppointmentPanelItem } from "@/components/AppointmentsPanel";
import { PROJECT_APPOINTMENTS_ALL_FROM_DATE, getBerlinTodayDateString } from "@/lib/project-appointments";

interface EmployeeAppointmentsPanelProps {
  employeeId?: number | null;
  employeeName?: string | null;
}

interface EmployeeAppointmentSummary {
  id: number;
  projectId: number;
  title: string;
  startDate: string;
  endDate?: string | null;
  startTimeHour?: number | null;
  customerName?: string;
}

export function EmployeeAppointmentsPanel({ employeeId, employeeName }: EmployeeAppointmentsPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const today = getBerlinTodayDateString();
  const upcomingFromDate = today;
  const allFromDate = PROJECT_APPOINTMENTS_ALL_FROM_DATE;

  const upcomingUrl = employeeId
    ? `/api/employees/${employeeId}/current-appointments?fromDate=${upcomingFromDate}`
    : null;
  const allUrl = employeeId ? `/api/employees/${employeeId}/current-appointments?fromDate=${allFromDate}` : null;
  const { data: upcomingAppointments = [], isLoading: upcomingLoading } = useQuery<EmployeeAppointmentSummary[]>({
    queryKey: [upcomingUrl ?? ""],
    enabled: !!upcomingUrl,
  });
  const { data: allAppointments = [], isLoading: allLoading } = useQuery<EmployeeAppointmentSummary[]>({
    queryKey: [allUrl ?? ""],
    enabled: !!allUrl && showAll,
  });
  const appointmentSource = showAll ? allAppointments : upcomingAppointments;

  const items = useMemo<AppointmentPanelItem[]>(() => {
    return appointmentSource.map((appointment) => ({
      id: appointment.id,
      startDate: appointment.startDate,
      endDate: appointment.endDate ?? null,
      startTimeHour: appointment.startTimeHour ?? null,
      mode: "mitarbeiter",
      employeeLabel: appointment.customerName
        ? `${appointment.title} · ${appointment.customerName}`
        : appointment.title,
      customerLabel: appointment.customerName ?? null,
    }));
  }, [appointmentSource]);

  return (
    <AppointmentsPanel
      title="Termine"
      icon={<Calendar className="w-4 h-4" />}
      showAll={showAll}
      onShowAllChange={setShowAll}
      items={items}
      isLoading={showAll ? allLoading : upcomingLoading}
      emptyStateFilteredLabel="Keine Termine ab heute"
    />
  );
}
