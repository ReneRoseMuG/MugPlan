import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { AppointmentsPanel, type AppointmentPanelItem } from "@/components/AppointmentsPanel";

interface EmployeeAppointmentsPanelProps {
  employeeId?: number | null;
  employeeName?: string | null;
}

interface EmployeeAppointmentSummary {
  id: number;
  title: string;
  date: string;
  customerName?: string;
}

export function EmployeeAppointmentsPanel({ employeeId, employeeName }: EmployeeAppointmentsPanelProps) {
  const queryUrl = employeeId ? `/api/employees/${employeeId}/current-appointments` : null;
  const { data: appointments = [], isLoading } = useQuery<EmployeeAppointmentSummary[]>({
    queryKey: [queryUrl ?? ""],
    enabled: !!queryUrl,
  });

  const items = useMemo<AppointmentPanelItem[]>(() => {
    return appointments.map((appointment) => ({
      id: appointment.id,
      startDate: appointment.date,
      mode: "mitarbeiter",
      employeeLabel: appointment.title,
      customerLabel: appointment.customerName ?? null,
    }));
  }, [appointments]);

  return (
    <AppointmentsPanel
      title="Aktuelle Termine"
      icon={<Calendar className="w-4 h-4" />}
      items={items}
      isLoading={isLoading}
      emptyStateFilteredLabel="Keine aktuellen Termine"
    />
  );
}
