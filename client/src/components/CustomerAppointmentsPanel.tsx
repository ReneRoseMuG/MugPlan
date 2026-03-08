import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { AllAppointmentsPanel, type AllAppointmentsPanelItem } from "@/components/AllAppointmentsPanel";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import { sortAppointmentsByDateDesc } from "@/lib/entity-appointments";

type CustomerAppointmentSummary = CalendarAppointment & { startTimeHour: number | null };

async function fetchCustomerAppointments(url: string): Promise<CustomerAppointmentSummary[]> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  return (await response.json()) as CustomerAppointmentSummary[];
}

interface CustomerAppointmentsPanelProps {
  customerId?: number | null;
  className?: string;
}

export function CustomerAppointmentsPanel({ customerId, className }: CustomerAppointmentsPanelProps) {
  const canLoad = Boolean(customerId);
  const queryUrl = canLoad ? `/api/customers/${customerId}/appointments?scope=all` : null;
  const todayBerlin = getBerlinTodayDateString();

  const { data: appointments = [], isLoading } = useQuery<CustomerAppointmentSummary[]>({
    queryKey: ["customerAppointments", customerId ?? null, "all"],
    enabled: !!queryUrl,
    queryFn: () => fetchCustomerAppointments(queryUrl as string),
  });

  const sortedAppointments = useMemo(
    () => [...appointments].sort(sortAppointmentsByDateDesc),
    [appointments],
  );

  const items = useMemo<AllAppointmentsPanelItem[]>(() => {
    return sortedAppointments.map((appointment) => ({
      id: appointment.id,
      startDate: appointment.startDate,
      endDate: appointment.endDate ?? null,
      startTimeHour: appointment.startTimeHour ?? null,
      projectLabel: appointment.projectName ?? null,
      customerLabel: appointment.customer.fullName ?? null,
      previewAppointment: appointment,
      testId: `customer-appointment-${appointment.id}`,
    }));
  }, [sortedAppointments]);

  return (
    <AllAppointmentsPanel
      title="Alle Termine"
      icon={<Calendar className="w-4 h-4" />}
      helpKey="customers.sidebar.appointments"
      compact
      className={className}
      items={items}
      isLoading={isLoading}
      todayBerlin={todayBerlin}
    />
  );
}
